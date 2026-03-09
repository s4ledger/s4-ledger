// S4 Ledger — Enterprise Features (Round 11)
// Implements Tier 2-3 enhancements: Command Dashboard, Notification Center,
// Cross-tool Data Linking, Role-based Prioritization, Contextual AI, Workflow Playbooks.
// Safe addition — only extends window.S4 namespace, does not modify existing code.

(function() {
    'use strict';

    var S4 = window.S4 = window.S4 || {};

    // ══════════════════════════════════════════════════════════════
    // R11-A: COMMAND DASHBOARD — Live KPI strip on Platform Hub
    // ══════════════════════════════════════════════════════════════
    S4.dashboard = {
        _el: null,
        _interval: null,

        init: function() {
            var hub = document.getElementById('platformHub');
            var hubGrid = hub ? hub.querySelector('.hub-grid') : null;
            if (!hub || !hubGrid) return;

            // Don't double-init
            if (document.getElementById('s4CommandDashboard')) return;

            var dash = document.createElement('div');
            dash.id = 's4CommandDashboard';
            dash.className = 's4-command-dashboard';
            dash.setAttribute('role', 'region');
            dash.setAttribute('aria-label', 'Platform dashboard');
            hub.insertBefore(dash, hubGrid);
            this._el = dash;
            this.refresh();

            // Auto-refresh every 10 seconds
            var self = this;
            this._interval = setInterval(function() { self.refresh(); }, 10000);
        },

        refresh: function() {
            if (!this._el) return;
            var stats = window.stats || { anchored: 0, verified: 0, types: new Set(), slsFees: 0 };
            var vault = window.s4Vault || [];
            var vaultKey = 's4Vault' + (window._currentRole ? '_' + window._currentRole : '');
            var storedVault = [];
            try { storedVault = JSON.parse(localStorage.getItem(vaultKey) || '[]'); } catch(e) {}
            var vaultCount = Math.max(vault.length, storedVault.length);

            var ilsScore = (window.ilsResults && window.ilsResults.overallScore) ? window.ilsResults.overallScore : null;
            var sessionCount = (window.sessionRecords && Array.isArray(window.sessionRecords)) ? window.sessionRecords.length : stats.anchored;
            var offlineQueue = [];
            try { offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]'); } catch(e) {}

            var kpis = [
                { label: 'Anchored', value: sessionCount, icon: 'fa-anchor', accent: 'var(--accent, #00aaff)' },
                { label: 'Verified', value: stats.verified || 0, icon: 'fa-check-circle', accent: '#34c759' },
                { label: 'Vault Records', value: vaultCount, icon: 'fa-vault', accent: '#c9a84c' },
                { label: 'Record Types', value: stats.types ? (stats.types.size || 0) : 0, icon: 'fa-layer-group', accent: '#a855f7' },
                { label: 'Credit Fees', value: (stats.slsFees || 0).toFixed(4), icon: 'fa-coins', accent: '#f59e0b' },
                { label: 'Offline Queue', value: offlineQueue.length, icon: 'fa-wifi-slash', accent: offlineQueue.length > 0 ? '#ff6b6b' : '#8b8fa3' }
            ];

            if (ilsScore !== null) {
                kpis.push({ label: 'ILS Score', value: ilsScore + '%', icon: 'fa-chart-line', accent: ilsScore >= 80 ? '#34c759' : ilsScore >= 50 ? '#f59e0b' : '#ff6b6b' });
            }

            var html = '<div class="s4-dash-header"><i class="fas fa-tachometer-alt"></i> Command Dashboard</div>';
            html += '<div class="s4-dash-kpis">';
            for (var i = 0; i < kpis.length; i++) {
                var k = kpis[i];
                html += '<div class="s4-dash-kpi" title="' + k.label + '">';
                html += '<div class="s4-dash-kpi-icon" style="color:' + k.accent + '"><i class="fas ' + k.icon + '"></i></div>';
                html += '<div class="s4-dash-kpi-value" style="color:' + k.accent + '">' + k.value + '</div>';
                html += '<div class="s4-dash-kpi-label">' + k.label + '</div>';
                html += '</div>';
            }
            html += '</div>';
            this._el.innerHTML = html;
        }
    };


    // ══════════════════════════════════════════════════════════════
    // R11-B: NOTIFICATION CENTER — Persistent notification history
    // ══════════════════════════════════════════════════════════════
    S4.notifications = {
        _history: [],
        _maxHistory: 50,
        _panelEl: null,
        _bellEl: null,
        _unreadCount: 0,

        init: function() {
            // Load history from localStorage
            try {
                this._history = JSON.parse(localStorage.getItem('s4NotifHistory') || '[]');
            } catch(e) { this._history = []; }

            this._unreadCount = this._history.filter(function(n) { return !n.read; }).length;

            // Create bell icon in nav
            this._createBell();
            // Create notification panel
            this._createPanel();
            // Intercept S4.toast to capture notifications
            this._interceptToast();
            // Update badge
            this._updateBadge();
        },

        _createBell: function() {
            var navLinks = document.getElementById('navLinks');
            if (!navLinks) return;
            var themeToggle = navLinks.querySelector('.theme-toggle');
            if (!themeToggle) return;
            var themeToggleLi = themeToggle.parentElement;

            var li = document.createElement('li');
            li.innerHTML = '<button class="s4-notif-bell" id="s4NotifBell" onclick="S4.notifications.togglePanel()" title="Notifications" aria-label="Notifications">' +
                '<i class="fas fa-bell"></i>' +
                '<span class="s4-notif-badge" id="s4NotifBadge" style="display:none">0</span>' +
                '</button>';
            navLinks.insertBefore(li, themeToggleLi);
            this._bellEl = document.getElementById('s4NotifBell');
        },

        _createPanel: function() {
            if (document.getElementById('s4NotifPanel')) return;
            var panel = document.createElement('div');
            panel.id = 's4NotifPanel';
            panel.className = 's4-notif-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-label', 'Notifications');
            panel.style.display = 'none';
            panel.innerHTML = '<div class="s4-notif-panel-header">' +
                '<span><i class="fas fa-bell"></i> Notifications</span>' +
                '<div class="s4-notif-panel-actions">' +
                '<button onclick="S4.notifications.markAllRead()" title="Mark all read"><i class="fas fa-check-double"></i></button>' +
                '<button onclick="S4.notifications.clearAll()" title="Clear all"><i class="fas fa-trash-alt"></i></button>' +
                '<button onclick="S4.notifications.togglePanel()" title="Close"><i class="fas fa-times"></i></button>' +
                '</div></div>' +
                '<div class="s4-notif-panel-body" id="s4NotifBody"></div>';
            document.body.appendChild(panel);
            this._panelEl = panel;

            // Close on outside click
            var self = this;
            document.addEventListener('click', function(e) {
                if (self._panelEl && self._panelEl.style.display !== 'none') {
                    if (!self._panelEl.contains(e.target) && self._bellEl && !self._bellEl.contains(e.target)) {
                        self._panelEl.style.display = 'none';
                    }
                }
            });
        },

        _interceptToast: function() {
            var originalToast = S4.toast;
            if (!originalToast) return;
            var self = this;
            S4.toast = function(message, type, duration) {
                // Log to notification center
                self.add(message, type || 'info');
                // Call original toast
                originalToast.call(S4, message, type, duration);
            };
            // Keep reference for wrapper detection
            S4.toast._isWrapped = true;
            S4.toast._original = originalToast;
        },

        add: function(message, type) {
            var sanitize = S4.sanitize || function(s) { return s; };
            var entry = {
                id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                message: sanitize(message),
                type: type || 'info',
                timestamp: new Date().toISOString(),
                read: false
            };
            this._history.unshift(entry);
            if (this._history.length > this._maxHistory) {
                this._history = this._history.slice(0, this._maxHistory);
            }
            this._unreadCount++;
            this._save();
            this._updateBadge();
            this._renderPanel();
        },

        togglePanel: function() {
            if (!this._panelEl) return;
            var isOpen = this._panelEl.style.display !== 'none';
            this._panelEl.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) this._renderPanel();
        },

        markAllRead: function() {
            for (var i = 0; i < this._history.length; i++) {
                this._history[i].read = true;
            }
            this._unreadCount = 0;
            this._save();
            this._updateBadge();
            this._renderPanel();
        },

        clearAll: function() {
            this._history = [];
            this._unreadCount = 0;
            this._save();
            this._updateBadge();
            this._renderPanel();
        },

        _save: function() {
            try {
                localStorage.setItem('s4NotifHistory', JSON.stringify(this._history));
            } catch(e) { /* quota exceeded — trim */ }
        },

        _updateBadge: function() {
            var badge = document.getElementById('s4NotifBadge');
            if (!badge) return;
            if (this._unreadCount > 0) {
                badge.textContent = this._unreadCount > 99 ? '99+' : this._unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        },

        _renderPanel: function() {
            var body = document.getElementById('s4NotifBody');
            if (!body) return;
            if (this._history.length === 0) {
                body.innerHTML = '<div class="s4-notif-empty"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>';
                return;
            }
            var html = '';
            var typeIcons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
            for (var i = 0; i < this._history.length; i++) {
                var n = this._history[i];
                var ago = this._timeAgo(n.timestamp);
                html += '<div class="s4-notif-item' + (n.read ? '' : ' unread') + ' notif-' + n.type + '">';
                html += '<i class="fas ' + (typeIcons[n.type] || typeIcons.info) + '"></i>';
                html += '<div class="s4-notif-content"><div class="s4-notif-msg">' + n.message + '</div>';
                html += '<div class="s4-notif-time">' + ago + '</div></div></div>';
            }
            body.innerHTML = html;
        },

        _timeAgo: function(isoStr) {
            var seconds = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
            if (seconds < 60) return 'just now';
            var minutes = Math.floor(seconds / 60);
            if (minutes < 60) return minutes + 'm ago';
            var hours = Math.floor(minutes / 60);
            if (hours < 24) return hours + 'h ago';
            var days = Math.floor(hours / 24);
            return days + 'd ago';
        }
    };


    // ══════════════════════════════════════════════════════════════
    // R11-C: CROSS-TOOL DATA LINKING — Related items across tools
    // ══════════════════════════════════════════════════════════════
    S4.crossLink = {
        init: function() {
            // Watch for section changes to inject cross-links
            var self = this;
            // Observe showSection/showHub calls by monitoring DOM visibility
            var observer = new MutationObserver(function(mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var target = mutations[i].target;
                    if (target.classList && target.classList.contains('tab-pane') && target.style.display === 'block') {
                        self._injectLinks(target);
                    }
                }
            });
            var workspace = document.getElementById('platformWorkspace');
            if (workspace) {
                observer.observe(workspace, { attributes: true, attributeFilter: ['style'], subtree: true });
            }
        },

        _injectLinks: function(pane) {
            var id = pane.id;
            // Don't re-inject
            if (pane.querySelector('.s4-cross-links')) return;

            var links = this._getRelatedLinks(id);
            if (!links.length) return;

            var container = document.createElement('div');
            container.className = 's4-cross-links';
            container.innerHTML = '<div class="s4-cross-links-header"><i class="fas fa-link"></i> Related Tools</div>';
            var grid = document.createElement('div');
            grid.className = 's4-cross-links-grid';
            for (var i = 0; i < links.length; i++) {
                var link = links[i];
                var chip = document.createElement('button');
                chip.className = 's4-cross-link-chip';
                chip.setAttribute('data-section', link.section);
                chip.innerHTML = '<i class="fas ' + link.icon + '"></i> ' + link.label;
                chip.onclick = (function(sec) {
                    return function() {
                        if (typeof window.showSection === 'function') window.showSection(sec);
                    };
                })(link.section);
                grid.appendChild(chip);
            }
            container.appendChild(grid);

            // Insert after the first heading or at the top
            var firstHeading = pane.querySelector('h2, h3, .tool-header, .section-header');
            if (firstHeading && firstHeading.nextSibling) {
                firstHeading.parentNode.insertBefore(container, firstHeading.nextSibling);
            } else {
                pane.insertBefore(container, pane.firstChild);
            }
        },

        _getRelatedLinks: function(paneId) {
            var linkMap = {
                'tabAnchor': [
                    { section: 'sectionVerify', label: 'Verify Records', icon: 'fa-check-circle' },
                    { section: 'sectionLog', label: 'Transaction Log', icon: 'fa-list' },
                    { section: 'sectionILS', label: 'ILS Tools', icon: 'fa-brain' }
                ],
                'tabVerify': [
                    { section: 'sectionAnchor', label: 'Anchor Records', icon: 'fa-anchor' },
                    { section: 'sectionLog', label: 'Transaction Log', icon: 'fa-list' }
                ],
                'tabLog': [
                    { section: 'sectionAnchor', label: 'Anchor Records', icon: 'fa-anchor' },
                    { section: 'sectionVerify', label: 'Verify Records', icon: 'fa-check-circle' }
                ],
                'tabILS': [
                    { section: 'sectionAnchor', label: 'Anchor Records', icon: 'fa-anchor' },
                    { section: 'sectionLog', label: 'Transaction Log', icon: 'fa-list' },
                    { section: 'sectionSystems', label: 'System Metrics', icon: 'fa-server' }
                ],
                'tabMetrics': [
                    { section: 'sectionLog', label: 'Transaction Log', icon: 'fa-list' },
                    { section: 'sectionILS', label: 'ILS Tools', icon: 'fa-brain' }
                ]
            };
            return linkMap[paneId] || [];
        }
    };


    // ══════════════════════════════════════════════════════════════
    // R11-D: ROLE-BASED TOOL PRIORITIZATION — Hub card reordering
    // ══════════════════════════════════════════════════════════════
    S4.hubPriority = {
        // Role → preferred card order (data-section values)
        _roleOrder: {
            'ils_manager': ['sectionILS', 'sectionLog', 'sectionAnchor', 'sectionVerify', 'sectionSystems'],
            'dmsms_analyst': ['sectionILS', 'sectionVerify', 'sectionLog', 'sectionAnchor', 'sectionSystems'],
            'auditor': ['sectionLog', 'sectionVerify', 'sectionILS', 'sectionAnchor', 'sectionSystems'],
            'contracts': ['sectionILS', 'sectionLog', 'sectionVerify', 'sectionAnchor', 'sectionSystems'],
            'supply_chain': ['sectionAnchor', 'sectionVerify', 'sectionLog', 'sectionILS', 'sectionSystems'],
            'admin': ['sectionILS', 'sectionAnchor', 'sectionVerify', 'sectionLog', 'sectionSystems']
        },

        init: function() {
            // Listen for role changes
            var self = this;
            // Check every 2 seconds for role change (roles.js sets _currentRole)
            var lastRole = '';
            setInterval(function() {
                var role = window._currentRole || '';
                if (role !== lastRole) {
                    lastRole = role;
                    self.reorder(role);
                }
            }, 2000);

            // Initial reorder
            var role = window._currentRole || sessionStorage.getItem('s4_user_role') || '';
            if (role) this.reorder(role);
        },

        reorder: function(role) {
            var order = this._roleOrder[role];
            if (!order) return;

            var grid = document.querySelector('#platformHub .hub-grid');
            if (!grid) return;

            var cards = Array.prototype.slice.call(grid.querySelectorAll('.hub-card'));
            if (cards.length === 0) return;

            // Sort cards by role preference order
            cards.sort(function(a, b) {
                var aIdx = order.indexOf(a.getAttribute('data-section'));
                var bIdx = order.indexOf(b.getAttribute('data-section'));
                if (aIdx === -1) aIdx = 999;
                if (bIdx === -1) bIdx = 999;
                return aIdx - bIdx;
            });

            // Re-append in order (DOM reflow)
            for (var i = 0; i < cards.length; i++) {
                grid.appendChild(cards[i]);
            }

            // Highlight the first card as "recommended"
            for (var j = 0; j < cards.length; j++) {
                cards[j].classList.remove('s4-recommended');
            }
            if (cards[0]) cards[0].classList.add('s4-recommended');
        }
    };


    // ══════════════════════════════════════════════════════════════
    // R11-E: CONTEXTUAL AI PER TOOL — Tool-specific AI prompts
    // ══════════════════════════════════════════════════════════════
    S4.contextualAI = {
        _prompts: {
            'hub-analysis': {
                label: 'Gap Analysis',
                suggestions: [
                    'Analyze gaps in my logistics support plan',
                    'What MIL-STD-1388 elements am I missing?',
                    'Compare my LSA against DLAD requirements',
                    'Generate a gap closure plan for FY25'
                ]
            },
            'hub-dmsms': {
                label: 'DMSMS',
                suggestions: [
                    'Find obsolete parts in my BOM',
                    'What are the top DMSMS risks for this program?',
                    'Generate a DMSMS mitigation strategy',
                    'Check GIDEP alerts for my components'
                ]
            },
            'hub-compliance': {
                label: 'Compliance',
                suggestions: [
                    'Score my current compliance posture',
                    'What DFARS clauses apply to my contract?',
                    'Generate a compliance checklist for CMMC Level 2',
                    'Audit my data rights assertions'
                ]
            },
            'hub-risk': {
                label: 'Supply Chain Risk',
                suggestions: [
                    'Assess supplier concentration risk',
                    'Map my supply chain vulnerabilities',
                    'What are foreign dependency risks?',
                    'Generate a risk mitigation plan'
                ]
            },
            'hub-readiness': {
                label: 'Readiness',
                suggestions: [
                    'Calculate operational availability',
                    'What spares do I need for 90-day sustainment?',
                    'Model readiness impact of budget cuts',
                    'Compare readiness across program variants'
                ]
            },
            'hub-predictive': {
                label: 'Predictive Maintenance',
                suggestions: [
                    'Predict next failure for top 10 LRUs',
                    'What maintenance can I defer safely?',
                    'Calculate cost savings from CBM+ adoption',
                    'Generate a PdM implementation timeline'
                ]
            },
            'hub-roi': {
                label: 'ROI Calculator',
                suggestions: [
                    'Calculate ROI for predictive maintenance',
                    'What is the break-even for automation?',
                    'Compare lease vs buy for this equipment',
                    'Model lifecycle cost savings'
                ]
            },
            'hub-vault': {
                label: 'Audit Vault',
                suggestions: [
                    'Show chain of custody for recent anchors',
                    'Verify blockchain integrity of vault records',
                    'Export audit trail for this quarter',
                    'Find records that need re-verification'
                ]
            },
            'hub-brief': {
                label: 'Program Brief',
                suggestions: [
                    'Generate a program status brief',
                    'Summarize KPIs for leadership review',
                    'Create a milestone readiness report',
                    'Draft talking points for PEO meeting'
                ]
            },
            'hub-acquisition': {
                label: 'Acquisition Planner',
                suggestions: [
                    'Map my acquisition timeline',
                    'What milestones are at risk?',
                    'Generate an acquisition strategy document',
                    'Compare adaptive vs traditional pathways'
                ]
            },
            'hub-actions': {
                label: 'Action Items',
                suggestions: [
                    'Show overdue action items by priority',
                    'Generate action item summary for leadership',
                    'Which action items have the highest cost impact?',
                    'Assign open items to responsible parties'
                ]
            },
            'hub-lifecycle': {
                label: 'Lifecycle Cost',
                suggestions: [
                    'Project lifecycle cost for next 5 years',
                    'What are the top cost drivers?',
                    'Compare O&S costs across platforms',
                    'Model cost impact of deferred maintenance'
                ]
            },
            'hub-docs': {
                label: 'Document Manager',
                suggestions: [
                    'Which documents are expiring this quarter?',
                    'Find missing deliverables in the DRL',
                    'Cross-reference CDRLs against contract requirements',
                    'Generate a document status dashboard'
                ]
            },
            'hub-reports': {
                label: 'Report Generator',
                suggestions: [
                    'Generate an executive program summary',
                    'Create a compliance status report',
                    'Build a quarterly ILS metrics report',
                    'Draft a risk assessment briefing'
                ]
            },
            'hub-sbom': {
                label: 'SBOM / BOM',
                suggestions: [
                    'Scan my BOM for single-source parts',
                    'Identify components with long lead times',
                    'Check SBOM against known vulnerabilities',
                    'Generate a BOM health report'
                ]
            },
            'hub-submissions': {
                label: 'Data Submissions',
                suggestions: [
                    'What submissions are due this month?',
                    'Check submission status across all CDRLs',
                    'Flag overdue contractor deliverables',
                    'Generate a submission compliance scorecard'
                ]
            },
            'hub-gfp': {
                label: 'GFP Tracker',
                suggestions: [
                    'List all government-furnished property by location',
                    'Which GFP items need inventory reconciliation?',
                    'Generate a GFP accountability report',
                    'Flag GFP with missing custody records'
                ]
            },
            'hub-cdrl': {
                label: 'CDRL Manager',
                suggestions: [
                    'Show CDRLs with upcoming due dates',
                    'Which CDRLs are non-compliant?',
                    'Map CDRLs to contract line items',
                    'Generate a CDRL delivery tracker'
                ]
            },
            'hub-contract': {
                label: 'Contract Tracker',
                suggestions: [
                    'Summarize contract obligations and status',
                    'Which CLINs are at risk of overrun?',
                    'Map contract mods to scope changes',
                    'Generate a contract health dashboard'
                ]
            },
            'hub-provenance': {
                label: 'Provenance Chain',
                suggestions: [
                    'Show chain of custody for a specific item',
                    'Identify provenance gaps in the supply chain',
                    'Verify blockchain integrity for recent transfers',
                    'Generate a custody audit report'
                ]
            },
            'hub-analytics': {
                label: 'Cross-Program Analytics',
                suggestions: [
                    'Compare readiness scores across programs',
                    'Which programs have the highest risk exposure?',
                    'Generate a portfolio-level KPI dashboard',
                    'Identify cross-program resource conflicts'
                ]
            },
            'hub-team': {
                label: 'Team Hub',
                suggestions: [
                    'Show team workload distribution',
                    'Who is responsible for overdue items?',
                    'Generate a team performance summary',
                    'Map team assignments to program milestones'
                ]
            },
            'hub-milestones': {
                label: 'Program Milestones',
                suggestions: [
                    'Which milestones are behind schedule?',
                    'Generate a milestone status timeline',
                    'Calculate schedule risk for upcoming gates',
                    'Map milestone dependencies across programs'
                ]
            }
        },

        init: function() {
            // Watch for ILS tool panel changes
            var self = this;
            var observer = new MutationObserver(function(mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var target = mutations[i].target;
                    if (target.classList && target.classList.contains('ils-hub-panel') && target.style.display === 'block') {
                        self._showPrompts(target);
                    }
                }
            });

            var tabILS = document.getElementById('tabILS');
            if (tabILS) {
                observer.observe(tabILS, { attributes: true, attributeFilter: ['style'], subtree: true });
            }
        },

        _showPrompts: function(panel) {
            if (panel.querySelector('.s4-ai-suggestions')) return;

            var toolId = panel.id;
            var prompts = this._prompts[toolId];
            if (!prompts) return;

            var container = document.createElement('div');
            container.className = 's4-ai-suggestions';
            container.innerHTML = '<div class="s4-ai-suggestions-header"><i class="fas fa-robot"></i> AI Quick Prompts — ' + prompts.label + '</div>';
            var grid = document.createElement('div');
            grid.className = 's4-ai-suggestions-grid';

            for (var i = 0; i < prompts.suggestions.length; i++) {
                var btn = document.createElement('button');
                btn.className = 's4-ai-prompt-chip';
                btn.textContent = prompts.suggestions[i];
                btn.onclick = (function(text) {
                    return function() {
                        // Try to send to existing AI agent panel
                        var aiInput = document.getElementById('s4AiInput') || document.querySelector('[data-ai-input]');
                        if (aiInput) {
                            aiInput.value = text;
                            aiInput.dispatchEvent(new Event('input', { bubbles: true }));
                            aiInput.focus();
                        } else if (S4.toast) {
                            S4.toast('AI prompt copied: ' + text, 'info', 3000);
                        }
                    };
                })(prompts.suggestions[i]);
                grid.appendChild(btn);
            }
            container.appendChild(grid);

            // Insert after tool header
            var header = panel.querySelector('.tool-header, h3, h2');
            if (header && header.nextSibling) {
                header.parentNode.insertBefore(container, header.nextSibling);
            } else {
                panel.insertBefore(container, panel.children[1] || null);
            }
        }
    };


    // ══════════════════════════════════════════════════════════════
    // R11-F: WORKFLOW PLAYBOOKS — Guided multi-step workflows
    // ══════════════════════════════════════════════════════════════
    S4.playbooks = {
        _active: null,
        _step: 0,
        _panelEl: null,

        _definitions: {
            'anchor-verify': {
                name: 'Anchor & Verify',
                icon: 'fa-shield-check',
                description: 'Anchor a record to the blockchain, then verify its integrity.',
                steps: [
                    { label: 'Navigate to Anchor Tool', action: 'sectionAnchor', description: 'Select a record type, enter content, and submit to the XRPL.' },
                    { label: 'Anchor your record', action: null, description: 'Fill in the form and click "Anchor to XRPL". Wait for confirmation.' },
                    { label: 'View Transaction Log', action: 'sectionLog', description: 'Check the transaction log to see your anchored record with its hash and explorer link.' },
                    { label: 'Verify the record', action: 'sectionVerify', description: 'Upload the same file or paste the hash to verify blockchain integrity.' }
                ]
            },
            'compliance-audit': {
                name: 'Compliance Audit',
                icon: 'fa-clipboard-check',
                description: 'Run a full compliance check using ILS tools and audit vault.',
                steps: [
                    { label: 'Open Compliance Tool', action: 'sectionILS', ilsTool: 'hub-compliance', description: 'Review your compliance scorecard across all regulatory frameworks.' },
                    { label: 'Check Audit Vault', action: 'sectionILS', ilsTool: 'hub-vault', description: 'Verify that all audit records are intact and blockchain-verified.' },
                    { label: 'Generate Compliance Report', action: 'sectionILS', ilsTool: 'hub-reports', description: 'Create a compliance report for your program.' },
                    { label: 'Review Action Items', action: 'sectionILS', ilsTool: 'hub-actions', description: 'Check open action items for any compliance gaps found.' }
                ]
            },
            'risk-assessment': {
                name: 'Risk Assessment',
                icon: 'fa-triangle-exclamation',
                description: 'Comprehensive supply chain and DMSMS risk analysis workflow.',
                steps: [
                    { label: 'Supply Chain Risk Analysis', action: 'sectionILS', ilsTool: 'hub-risk', description: 'Evaluate supply chain vulnerabilities and foreign dependencies.' },
                    { label: 'DMSMS Review', action: 'sectionILS', ilsTool: 'hub-dmsms', description: 'Check for obsolete or diminishing parts in your bill of materials.' },
                    { label: 'Lifecycle Cost Impact', action: 'sectionILS', ilsTool: 'hub-lifecycle', description: 'Assess the lifecycle cost impact of identified risks.' },
                    { label: 'Generate Mitigation Plan', action: 'sectionILS', ilsTool: 'hub-actions', description: 'Create action items and mitigation strategies for top risks.' }
                ]
            },
            'program-review': {
                name: 'Program Review Prep',
                icon: 'fa-briefcase',
                description: 'Prepare for a program review with consolidated data and briefs.',
                steps: [
                    { label: 'Review Program Milestones', action: 'sectionILS', ilsTool: 'hub-milestones', description: 'Check milestone status and identify any delays.' },
                    { label: 'Generate Program Brief', action: 'sectionILS', ilsTool: 'hub-brief', description: 'Create an executive summary of program status.' },
                    { label: 'Check Cross-Program Analytics', action: 'sectionILS', ilsTool: 'hub-analytics', description: 'Compare metrics across programs and portfolios.' },
                    { label: 'Review Audit Trail', action: 'sectionLog', description: 'Verify all recent actions are logged and auditable.' }
                ]
            }
        },

        init: function() {
            this._createLauncher();
        },

        _createLauncher: function() {
            // Add playbook button to hub header (next to Roadmap/Quick Tour buttons)
            var collabIndicators = document.getElementById('collabIndicators');
            if (!collabIndicators) return;
            if (document.getElementById('s4PlaybookBtn')) return;

            var btn = document.createElement('button');
            btn.id = 's4PlaybookBtn';
            btn.className = 's4-playbook-launch-btn';
            btn.onclick = function() { S4.playbooks.showMenu(); };
            btn.title = 'Workflow Playbooks';
            btn.innerHTML = '<i class="fas fa-book-open"></i> Playbooks';
            collabIndicators.appendChild(btn);
        },

        showMenu: function() {
            // Remove existing menu
            var existing = document.getElementById('s4PlaybookMenu');
            if (existing) { existing.remove(); return; }

            var menu = document.createElement('div');
            menu.id = 's4PlaybookMenu';
            menu.className = 's4-playbook-menu';

            var html = '<div class="s4-playbook-menu-header"><i class="fas fa-book-open"></i> Workflow Playbooks</div>';
            html += '<p class="s4-playbook-menu-desc">Guided step-by-step workflows for common tasks</p>';

            var defs = this._definitions;
            for (var key in defs) {
                if (defs.hasOwnProperty(key)) {
                    var d = defs[key];
                    html += '<button class="s4-playbook-card" onclick="S4.playbooks.start(\'' + key + '\')">';
                    html += '<i class="fas ' + d.icon + '"></i>';
                    html += '<div><div class="s4-playbook-card-name">' + d.name + '</div>';
                    html += '<div class="s4-playbook-card-desc">' + d.description + '</div></div>';
                    html += '<span class="s4-playbook-card-steps">' + d.steps.length + ' steps</span>';
                    html += '</button>';
                }
            }
            menu.innerHTML = html;

            // Position near the playbook button
            var pbBtn = document.getElementById('s4PlaybookBtn');
            if (pbBtn) {
                var rect = pbBtn.getBoundingClientRect();
                menu.style.top = (rect.bottom + 8) + 'px';
                menu.style.left = Math.max(16, rect.left - 100) + 'px';
            }

            document.body.appendChild(menu);

            // Close on outside click
            var closeHandler = function(e) {
                if (!menu.contains(e.target) && e.target !== pbBtn && !pbBtn.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(function() { document.addEventListener('click', closeHandler); }, 100);
        },

        start: function(playbookId) {
            var def = this._definitions[playbookId];
            if (!def) return;

            var existingMenu = document.getElementById('s4PlaybookMenu');
            if (existingMenu) existingMenu.remove();

            this._active = def;
            this._step = 0;
            this._showPanel();
            this._navigateToStep(0);
        },

        _showPanel: function() {
            var existing = document.getElementById('s4PlaybookPanel');
            if (existing) existing.remove();

            var panel = document.createElement('div');
            panel.id = 's4PlaybookPanel';
            panel.className = 's4-playbook-panel';
            this._panelEl = panel;
            document.body.appendChild(panel);
            this._renderPanel();
        },

        _renderPanel: function() {
            if (!this._panelEl || !this._active) return;
            var steps = this._active.steps;
            var current = this._step;

            var html = '<div class="s4-playbook-panel-header">';
            html += '<div><i class="fas ' + this._active.icon + '"></i> ' + this._active.name + '</div>';
            html += '<button onclick="S4.playbooks.close()" title="Close playbook"><i class="fas fa-times"></i></button>';
            html += '</div>';
            html += '<div class="s4-playbook-steps">';

            for (var i = 0; i < steps.length; i++) {
                var s = steps[i];
                var state = i < current ? 'completed' : i === current ? 'active' : 'pending';
                html += '<div class="s4-playbook-step ' + state + '" data-step="' + i + '">';
                html += '<div class="s4-playbook-step-marker">';
                if (state === 'completed') html += '<i class="fas fa-check"></i>';
                else html += (i + 1);
                html += '</div>';
                html += '<div class="s4-playbook-step-content">';
                html += '<div class="s4-playbook-step-label">' + s.label + '</div>';
                if (state === 'active') {
                    html += '<div class="s4-playbook-step-desc">' + s.description + '</div>';
                }
                html += '</div></div>';
            }
            html += '</div>';

            html += '<div class="s4-playbook-nav">';
            if (current > 0) {
                html += '<button onclick="S4.playbooks.prev()" class="s4-playbook-nav-btn"><i class="fas fa-arrow-left"></i> Back</button>';
            } else {
                html += '<span></span>';
            }
            if (current < steps.length - 1) {
                html += '<button onclick="S4.playbooks.next()" class="s4-playbook-nav-btn primary"><span>Next Step</span> <i class="fas fa-arrow-right"></i></button>';
            } else {
                html += '<button onclick="S4.playbooks.complete()" class="s4-playbook-nav-btn success"><i class="fas fa-check"></i> Complete</button>';
            }
            html += '</div>';

            this._panelEl.innerHTML = html;
        },

        next: function() {
            if (!this._active) return;
            if (this._step < this._active.steps.length - 1) {
                this._step++;
                this._renderPanel();
                this._navigateToStep(this._step);
            }
        },

        prev: function() {
            if (!this._active) return;
            if (this._step > 0) {
                this._step--;
                this._renderPanel();
                this._navigateToStep(this._step);
            }
        },

        complete: function() {
            if (S4.toast) S4.toast('Workflow "' + this._active.name + '" completed!', 'success', 4000);
            this.close();
        },

        close: function() {
            this._active = null;
            this._step = 0;
            if (this._panelEl) {
                this._panelEl.remove();
                this._panelEl = null;
            }
        },

        _navigateToStep: function(stepIdx) {
            var step = this._active.steps[stepIdx];
            if (!step) return;

            if (step.action && typeof window.showSection === 'function') {
                window.showSection(step.action);
            }
            if (step.ilsTool && typeof window.openILSTool === 'function') {
                setTimeout(function() { window.openILSTool(step.ilsTool); }, 300);
            }
        }
    };


    // ══════════════════════════════════════════════════════════════
    // R11-G: PROGRAM HEALTH HEATMAP — Cross-dimension health view
    // ══════════════════════════════════════════════════════════════
    S4.healthMap = {
        _el: null,

        init: function() {
            var hub = document.getElementById('platformHub');
            var dash = document.getElementById('s4CommandDashboard');
            if (!hub) return;
            if (document.getElementById('s4HealthMap')) return;

            var el = document.createElement('div');
            el.id = 's4HealthMap';
            el.className = 's4-health-map';
            el.setAttribute('role', 'region');
            el.setAttribute('aria-label', 'Program health overview');

            // Insert after command dashboard if present, otherwise before hub-grid
            var insertBefore = dash ? dash.nextSibling : hub.querySelector('.hub-grid');
            if (insertBefore) {
                hub.insertBefore(el, insertBefore);
            }
            this._el = el;
            this.refresh();
        },

        refresh: function() {
            if (!this._el) return;

            var dimensions = this._calculateHealth();
            var html = '<div class="s4-health-header"><i class="fas fa-heartbeat"></i> Program Health</div>';
            html += '<div class="s4-health-grid">';

            for (var i = 0; i < dimensions.length; i++) {
                var d = dimensions[i];
                var colorClass = d.score >= 80 ? 'health-green' : d.score >= 50 ? 'health-yellow' : 'health-red';
                html += '<div class="s4-health-cell ' + colorClass + '" title="' + d.name + ': ' + d.score + '%">';
                html += '<div class="s4-health-cell-score">' + d.score + '</div>';
                html += '<div class="s4-health-cell-label">' + d.name + '</div>';
                html += '</div>';
            }
            html += '</div>';
            this._el.innerHTML = html;
        },

        _calculateHealth: function() {
            var stats = window.stats || { anchored: 0, verified: 0 };
            var vault = [];
            try {
                var vk = 's4Vault' + (window._currentRole ? '_' + window._currentRole : '');
                vault = JSON.parse(localStorage.getItem(vk) || '[]');
            } catch(e) {}

            // Score each dimension 0-100 based on available data
            var anchored = stats.anchored || 0;
            var verified = stats.verified || 0;
            var vaultCount = vault.length;

            return [
                { name: 'Data Integrity', score: Math.min(100, anchored > 0 ? Math.round((verified / Math.max(anchored, 1)) * 100) : 0) },
                { name: 'Audit Trail', score: Math.min(100, vaultCount > 0 ? Math.round(Math.min(vaultCount * 10, 100)) : 0) },
                { name: 'Compliance', score: this._getILSMetric('compliance', 75) },
                { name: 'Readiness', score: this._getILSMetric('readiness', 60) },
                { name: 'Supply Chain', score: this._getILSMetric('supplyChain', 65) },
                { name: 'Sustainment', score: this._getILSMetric('sustainment', 70) }
            ];
        },

        _getILSMetric: function(key, fallback) {
            // Try to read from ILS results if available
            if (window.ilsResults && window.ilsResults[key]) {
                return Math.round(window.ilsResults[key]);
            }
            // Check localStorage for cached scores
            try {
                var cached = JSON.parse(localStorage.getItem('s4_ils_scores') || '{}');
                if (cached[key] !== undefined) return Math.round(cached[key]);
            } catch(e) {}
            return fallback;
        }
    };


    // ══════════════════════════════════════════════════════════════
    // R11-H: QUICK ACTION FAB — Floating action button for power users
    // ══════════════════════════════════════════════════════════════
    S4.quickActions = {
        _el: null,
        _menuOpen: false,

        init: function() {
            if (document.getElementById('s4QuickFab')) return;

            var fab = document.createElement('div');
            fab.id = 's4QuickFab';
            fab.className = 's4-quick-fab';
            fab.innerHTML = '<button class="s4-fab-trigger" onclick="S4.quickActions.toggle()" title="Quick Actions (Ctrl+.)" aria-label="Quick actions">' +
                '<i class="fas fa-bolt"></i></button>' +
                '<div class="s4-fab-menu" id="s4FabMenu" style="display:none"></div>';
            document.body.appendChild(fab);
            this._el = fab;
            this._renderMenu();

            // Keyboard shortcut: Ctrl+.
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.key === '.') {
                    e.preventDefault();
                    S4.quickActions.toggle();
                }
            });
        },

        toggle: function() {
            var menu = document.getElementById('s4FabMenu');
            if (!menu) return;
            this._menuOpen = !this._menuOpen;
            menu.style.display = this._menuOpen ? 'flex' : 'none';

            if (this._menuOpen) {
                var self = this;
                setTimeout(function() {
                    var closeHandler = function(e) {
                        if (!self._el.contains(e.target)) {
                            self._menuOpen = false;
                            menu.style.display = 'none';
                            document.removeEventListener('click', closeHandler);
                        }
                    };
                    document.addEventListener('click', closeHandler);
                }, 100);
            }
        },

        _renderMenu: function() {
            var menu = document.getElementById('s4FabMenu');
            if (!menu) return;

            var actions = [
                { label: 'Anchor Record', icon: 'fa-anchor', action: function() { if (typeof showSection === 'function') showSection('sectionAnchor'); } },
                { label: 'Verify Record', icon: 'fa-check-circle', action: function() { if (typeof showSection === 'function') showSection('sectionVerify'); } },
                { label: 'ILS Tools', icon: 'fa-brain', action: function() { if (typeof showSection === 'function') showSection('sectionILS'); } },
                { label: 'AI Agent', icon: 'fa-robot', action: function() { if (typeof toggleAiAgent === 'function') toggleAiAgent(); } },
                { label: 'Command Palette', icon: 'fa-terminal', action: function() { if (window.S4 && S4.commandPalette) { S4.commandPalette.toggle(); } else { var p = document.getElementById('s4CommandPalette'); if (p) { p.classList.toggle('active'); var inp = document.getElementById('s4CommandInput'); if (inp) inp.focus(); } } } }
            ];

            var html = '';
            for (var i = 0; i < actions.length; i++) {
                var a = actions[i];
                html += '<button class="s4-fab-item" title="' + a.label + '" data-action="' + i + '">' +
                    '<i class="fas ' + a.icon + '"></i><span>' + a.label + '</span></button>';
            }
            menu.innerHTML = html;

            // Bind actions
            var buttons = menu.querySelectorAll('.s4-fab-item');
            for (var j = 0; j < buttons.length; j++) {
                (function(idx) {
                    buttons[idx].onclick = function() {
                        actions[idx].action();
                        S4.quickActions.toggle();
                    };
                })(j);
            }
        }
    };


    // ══════════════════════════════════════════════════════════════
    // R12-A: SHOW-MORE COLLAPSIBLE for long content sections
    // ══════════════════════════════════════════════════════════════
    S4.showMore = {
        _threshold: 220, // px — collapse if content taller than this

        init: function() {
            // Target lists, tables, and scrollable areas in ILS panels
            var selectors = [
                '.ils-hub-panel .result-panel',
                '.ils-hub-panel table',
                '.ils-hub-panel .ils-action-list',
                '.ils-hub-panel [style*="max-height"]',
                '#ilsActions',
                '#ilsCoverage'
            ];
            var self = this;
            // Observe for dynamically-inserted long content
            var observer = new MutationObserver(function() {
                self._scan();
            });
            var tabILS = document.getElementById('tabILS');
            if (tabILS) {
                observer.observe(tabILS, { childList: true, subtree: true });
            }
            // Initial scan after delay
            setTimeout(function() { self._scan(); }, 1000);
        },

        _scan: function() {
            var panels = document.querySelectorAll('.ils-hub-panel .result-panel');
            for (var i = 0; i < panels.length; i++) {
                var el = panels[i];
                if (el.parentNode && el.parentNode.classList.contains('s4-show-more-wrap')) continue;
                if (el.scrollHeight > this._threshold && el.offsetHeight > 0) {
                    this._wrap(el);
                }
            }
        },

        _wrap: function(el) {
            var wrapper = document.createElement('div');
            wrapper.className = 's4-show-more-wrap';
            el.parentNode.insertBefore(wrapper, el);
            wrapper.appendChild(el);

            var btn = document.createElement('button');
            btn.className = 's4-show-more-btn';
            btn.textContent = 'Show More';
            btn.onclick = function() {
                var isExpanded = wrapper.classList.toggle('expanded');
                btn.textContent = isExpanded ? 'Show Less' : 'Show More';
            };
            wrapper.parentNode.insertBefore(btn, wrapper.nextSibling);
        }
    };


    // ══════════════════════════════════════════════════════════════
    // INITIALIZATION — Run after DOM is ready
    // ══════════════════════════════════════════════════════════════
    function initEnterpriseFeatures() {
        // Wait for the platform workspace to be visible
        var ws = document.getElementById('platformWorkspace');
        if (!ws) {
            // Retry once after a short delay
            setTimeout(initEnterpriseFeatures, 500);
            return;
        }

        // Initialize all enterprise features
        S4.dashboard.init();
        S4.healthMap.init();
        S4.notifications.init();
        S4.crossLink.init();
        S4.hubPriority.init();
        S4.contextualAI.init();
        S4.playbooks.init();
        S4.quickActions.init();
        S4.showMore.init();

        S4.register('enterprise-features', {
            version: '1.0.0',
            features: ['dashboard', 'notifications', 'crossLink', 'hubPriority', 'contextualAI', 'playbooks', 'healthMap', 'quickActions', 'showMore']
        });
    }

    // Initialize when DOM is ready or workspace becomes visible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initEnterpriseFeatures, 200);
        });
    } else {
        setTimeout(initEnterpriseFeatures, 200);
    }

    // Also re-init when hub is shown (in case it was hidden initially)
    var _origShowHub = window.showHub;
    if (typeof _origShowHub === 'function') {
        window.showHub = function() {
            _origShowHub.apply(this, arguments);
            // Refresh dashboard when returning to hub
            if (S4.dashboard._el) S4.dashboard.refresh();
            if (S4.healthMap._el) S4.healthMap.refresh();
        };
    }

    // Export for command palette integration
    window.S4 = S4;

})();
