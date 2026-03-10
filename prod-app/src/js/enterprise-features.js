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
                { label: 'Vault Records', value: vaultCount, icon: 'fa-vault', accent: 'var(--accent, #00aaff)' },
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
            // Start hidden — only show when platform workspace is visible
            fab.style.display = 'none';
            document.body.appendChild(fab);
            this._el = fab;
            this._renderMenu();

            // Show FAB only when platform workspace is visible
            var self = this;
            function _showWhenReady() {
                var w = document.getElementById('platformWorkspace');
                if (w && w.style.display === 'block') {
                    fab.style.display = '';
                } else {
                    setTimeout(_showWhenReady, 300);
                }
            }
            _showWhenReady();

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
                { label: 'Anchor Record', icon: 'fa-anchor', action: function() { if (typeof window.showSection === 'function') window.showSection('sectionAnchor'); } },
                { label: 'Verify Record', icon: 'fa-check-circle', action: function() { if (typeof window.showSection === 'function') window.showSection('sectionVerify'); } },
                { label: 'ILS Tools', icon: 'fa-brain', action: function() { if (typeof window.showSection === 'function') window.showSection('sectionILS'); } },
                { label: 'AI Agent', icon: 'fa-robot', action: function() { if (typeof window.toggleAiAgent === 'function') window.toggleAiAgent(); } },
                { label: 'Command Palette', icon: 'fa-terminal', action: function() { if (window.S4 && S4.commandPalette) { S4.commandPalette.toggle(); } else { var p = document.getElementById('s4CommandPalette'); if (p) { p.classList.toggle('active'); var inp = document.getElementById('s4CommandInput'); if (inp) inp.focus(); } } } },
                { label: 'Defense Council', icon: 'fa-shield-halved', action: function() { S4.defenseDashboard.toggle(); } },
                { label: 'Alert Rules', icon: 'fa-bell', action: function() { S4.alertRules.toggle(); } },
                { label: 'Annotations', icon: 'fa-comments', action: function() { S4.annotations.open(); } },
                { label: 'Import / Export', icon: 'fa-file-import', action: function() { S4.importExport.open(); } },
                { label: 'Audit Trail', icon: 'fa-timeline', action: function() { S4.auditTimeline.open(); } }
            ];

            var html = '';
            for (var i = 0; i < actions.length; i++) {
                var a = actions[i];
                html += '<button class="s4-fab-item" title="' + a.label + '" data-action="' + i + '">' +
                    '<i class="fas ' + a.icon + '"></i><span>' + a.label + '</span></button>';
            }
            menu.innerHTML = html;

            // Bind actions with error guards
            var buttons = menu.querySelectorAll('.s4-fab-item');
            for (var j = 0; j < buttons.length; j++) {
                (function(idx) {
                    buttons[idx].onclick = function(e) {
                        e.stopPropagation();
                        try { actions[idx].action(); } catch(err) { console.warn('FAB action error:', err); if (S4.toast) S4.toast('Action unavailable right now.','warning'); }
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
            // Target lists, tabevel and les, and scrollable areas in ILS panels
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
    //  FEATURE: DEFENSE COUNCIL DASHBOARD
    //  Leadership read-only view: program health, risk, compliance
    // ══════════════════════════════════════════════════════════════
    S4.defenseDashboard = {
        _el: null,
        _open: false,

        init: function() {
            var overlay = document.createElement('div');
            overlay.id = 's4DefenseDashboard';
            overlay.style.display = 'none';
            document.body.appendChild(overlay);
            this._el = overlay;
        },

        toggle: function() {
            if (!this._el) return;
            this._open = !this._open;
            this._el.style.display = this._open ? 'flex' : 'none';
            if (this._open) this.refresh();
        },

        close: function() {
            this._open = false;
            if (this._el) this._el.style.display = 'none';
        },

        refresh: function() {
            var stats = window.s4Stats || {};
            var vault = window.s4Vault || [];
            var records = window.sessionRecords || [];
            var anchored = stats.anchored || 0;
            var verified = stats.verified || 0;
            var healthScore = Math.min(100, Math.round((anchored * 3 + verified * 5 + vault.length * 2) / 2));
            if (healthScore < 1) healthScore = '--';
            var compScore = 0;
            try { var cs = document.getElementById('compliancePercent'); if (cs) compScore = parseInt(cs.textContent) || 0; } catch(e) {}
            var riskLevel = compScore >= 80 ? 'Low' : compScore >= 50 ? 'Medium' : 'High';
            var riskColor = compScore >= 80 ? '#1a8a3e' : compScore >= 50 ? '#ffa500' : '#cc3333';

            var el = this._el; if (!el) return;
            var kpis = el.querySelectorAll('.dc-kpi-value');
            if (kpis[0]) kpis[0].textContent = healthScore;
            if (kpis[1]) kpis[1].innerHTML = '<span style="color:' + riskColor + '">' + riskLevel + '</span>';
            if (kpis[2]) kpis[2].textContent = (compScore != null ? compScore : '--') + '%';
            if (kpis[3]) kpis[3].textContent = anchored;
            if (kpis[4]) kpis[4].textContent = vault.length;
            if (kpis[5]) kpis[5].textContent = verified;

            var timeline = el.querySelector('.dc-timeline');
            if (timeline) {
                var events = [];
                records.slice(-8).reverse().forEach(function(r) {
                    events.push({ time: r.timestamp || new Date().toISOString(), type: r.type || 'Record', action: 'Anchored' });
                });
                if (!events.length) {
                    timeline.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;font-size:0.82rem">No recent activity</div>';
                } else {
                    var th = '';
                    events.forEach(function(e) {
                        var d = new Date(e.time);
                        var ts = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
                        th += '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.04)">' +
                            '<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0"></div>' +
                            '<div style="flex:1"><div style="font-size:0.82rem;font-weight:600;color:var(--text,#1d1d1f)">' + e.type + ' — ' + e.action + '</div>' +
                            '<div style="font-size:0.72rem;color:var(--muted)">' + ts + '</div></div></div>';
                    });
                    timeline.innerHTML = th;
                }
            }

            this._renderPanel();
        },

        exportBriefing: function() {
            var stats = window.s4Stats || {};
            var content = '=== S4 LEDGER — DEFENSE COUNCIL EXECUTIVE BRIEFING ===\n';
            content += 'Generated: ' + new Date().toISOString() + '\n\n';
            content += 'PROGRAM HEALTH METRICS\n─────────────────────\n';
            content += 'Records Anchored: ' + (stats.anchored || 0) + '\n';
            content += 'Records Verified: ' + (stats.verified || 0) + '\n';
            content += 'Vault Records: ' + ((window.s4Vault || []).length) + '\n\n';
            content += 'COMPLIANCE POSTURE: Active\nRISK ASSESSMENT: See platform for real-time scores\n\n=== END BRIEFING ===\n';
            var blob = new Blob([content], {type: 'text/plain'});
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'S4_Defense_Council_Briefing_' + new Date().toISOString().slice(0,10) + '.txt';
            a.click(); URL.revokeObjectURL(a.href);
            if (S4.toast) S4.toast('Executive briefing exported', 'success', 3000);
        },

        _renderPanel: function() {
            if (!this._el) return;
            this._el.innerHTML = '<div style="position:fixed;inset:0;background:rgba(245,245,247,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.25s ease" onclick="if(event.target===this)S4.defenseDashboard.close()">' +
                '<div style="background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:16px;width:95%;max-width:1100px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.1);padding:32px;animation:fadeIn 0.3s ease">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">' +
                        '<div><h2 style="margin:0;font-size:1.3rem;font-weight:800;color:var(--text,#1d1d1f);letter-spacing:-0.03em"><i class="fas fa-shield-halved" style="color:var(--accent);margin-right:10px"></i>Defense Council Dashboard</h2>' +
                        '<p style="margin:4px 0 0;color:var(--muted);font-size:0.82rem">Executive leadership view — real-time program health &amp; compliance posture</p></div>' +
                        '<div style="display:flex;gap:8px">' +
                            '<button onclick="S4.defenseDashboard.exportBriefing()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;background:rgba(0,113,227,0.08);border:1px solid rgba(0,113,227,0.2);border-radius:8px;color:var(--accent);font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit"><i class="fas fa-file-export"></i> Export Briefing</button>' +
                            '<button onclick="S4.defenseDashboard.close()" style="width:32px;height:32px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:1rem"><i class="fas fa-times"></i></button>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:24px">' +
                        '<div style="background:rgba(0,113,227,0.04);border:1px solid rgba(0,113,227,0.1);border-radius:12px;padding:18px;text-align:center"><div class="dc-kpi-value" style="font-size:1.8rem;font-weight:800;color:var(--accent)">--</div><div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;font-weight:600">Health Score</div></div>' +
                        '<div style="background:rgba(26,138,62,0.04);border:1px solid rgba(26,138,62,0.1);border-radius:12px;padding:18px;text-align:center"><div class="dc-kpi-value" style="font-size:1.8rem;font-weight:800;color:#1a8a3e">--</div><div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;font-weight:600">Risk Level</div></div>' +
                        '<div style="background:rgba(184,134,11,0.04);border:1px solid rgba(184,134,11,0.1);border-radius:12px;padding:18px;text-align:center"><div class="dc-kpi-value" style="font-size:1.8rem;font-weight:800;color:var(--gold)">--</div><div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;font-weight:600">Compliance</div></div>' +
                        '<div style="background:rgba(0,170,255,0.04);border:1px solid rgba(0,170,255,0.1);border-radius:12px;padding:18px;text-align:center"><div class="dc-kpi-value" style="font-size:1.8rem;font-weight:800;color:#00aaff">0</div><div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;font-weight:600">Anchored</div></div>' +
                        '<div style="background:rgba(0,170,255,0.04);border:1px solid rgba(0,170,255,0.1);border-radius:12px;padding:18px;text-align:center"><div class="dc-kpi-value" style="font-size:1.8rem;font-weight:800;color:var(--accent)">0</div><div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;font-weight:600">Vault Records</div></div>' +
                        '<div style="background:rgba(0,204,136,0.04);border:1px solid rgba(0,204,136,0.1);border-radius:12px;padding:18px;text-align:center"><div class="dc-kpi-value" style="font-size:1.8rem;font-weight:800;color:#00cc88">0</div><div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;font-weight:600">Verified</div></div>' +
                    '</div>' +
                    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">' +
                        '<div style="border:1px solid rgba(0,0,0,0.06);border-radius:12px;padding:20px"><h4 style="margin:0 0 14px;font-size:0.92rem;font-weight:700;color:var(--text,#1d1d1f)"><i class="fas fa-clock-rotate-left" style="color:var(--accent);margin-right:8px"></i>Recent Activity</h4><div class="dc-timeline" style="max-height:240px;overflow-y:auto"><div style="text-align:center;color:var(--muted);padding:20px;font-size:0.82rem">No recent activity</div></div></div>' +
                        '<div style="border:1px solid rgba(0,0,0,0.06);border-radius:12px;padding:20px"><h4 style="margin:0 0 14px;font-size:0.92rem;font-weight:700;color:var(--text,#1d1d1f)"><i class="fas fa-chart-line" style="color:var(--gold);margin-right:8px"></i>Program Status</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
                            '<div style="background:rgba(0,0,0,0.02);border-radius:8px;padding:12px"><div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Active Programs</div><div style="font-size:1.2rem;font-weight:700;color:var(--text,#1d1d1f)">1</div></div>' +
                            '<div style="background:rgba(0,0,0,0.02);border-radius:8px;padding:12px"><div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Open Actions</div><div style="font-size:1.2rem;font-weight:700;color:var(--text,#1d1d1f)">0</div></div>' +
                            '<div style="background:rgba(0,0,0,0.02);border-radius:8px;padding:12px"><div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Milestones Due</div><div style="font-size:1.2rem;font-weight:700;color:#ffa500">0</div></div>' +
                            '<div style="background:rgba(0,0,0,0.02);border-radius:8px;padding:12px"><div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">CDRLs Due</div><div style="font-size:1.2rem;font-weight:700;color:var(--text,#1d1d1f)">0</div></div>' +
                        '</div></div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }
    };
    window.openDefenseDashboard = function() { S4.defenseDashboard.toggle(); };


    // ══════════════════════════════════════════════════════════════
    //  FEATURE: AUTOMATED ALERT RULES
    //  Threshold-based alerts with in-app notification delivery
    // ══════════════════════════════════════════════════════════════
    S4.alertRules = {
        _rules: [],
        _el: null,
        _open: false,

        init: function() {
            try { this._rules = JSON.parse(localStorage.getItem('s4_alert_rules') || '[]'); } catch(e) { this._rules = []; }
            var panel = document.createElement('div');
            panel.id = 's4AlertRulesPanel';
            panel.style.display = 'none';
            document.body.appendChild(panel);
            this._el = panel;
            var self = this;
            setInterval(function() { self._evaluate(); }, 30000);
        },

        toggle: function() {
            this._open = !this._open;
            if (this._el) { this._el.style.display = this._open ? 'flex' : 'none'; if (this._open) this._render(); }
        },

        close: function() { this._open = false; if (this._el) this._el.style.display = 'none'; },

        addRule: function(metric, operator, threshold, message) {
            var val = parseFloat(threshold);
            if (isNaN(val)) { if (S4.toast) S4.toast('Please enter a valid threshold number', 'warning', 3000); return; }
            this._rules.push({ id: Date.now(), metric: metric, operator: operator, threshold: val, message: message || ('Alert: ' + metric + ' ' + operator + ' ' + threshold), enabled: true, created: new Date().toISOString() });
            this._save(); this._render();
            if (S4.toast) S4.toast('Alert rule created', 'success', 2000);
        },

        removeRule: function(id) { this._rules = this._rules.filter(function(r) { return r.id !== id; }); this._save(); this._render(); },
        toggleRule: function(id) { this._rules.forEach(function(r) { if (r.id === id) r.enabled = !r.enabled; }); this._save(); this._render(); },
        _save: function() { localStorage.setItem('s4_alert_rules', JSON.stringify(this._rules)); },

        _evaluate: function() {
            var self = this;
            this._rules.forEach(function(rule) {
                if (!rule.enabled) return;
                var value = self._getMetricValue(rule.metric);
                if (value === null) return;
                var triggered = false;
                if (rule.operator === '<' && value < rule.threshold) triggered = true;
                if (rule.operator === '>' && value > rule.threshold) triggered = true;
                if (rule.operator === '=' && value === rule.threshold) triggered = true;
                if (triggered && S4.toast) S4.toast(rule.message, 'warning', 8000);
            });
        },

        _getMetricValue: function(metric) {
            switch(metric) {
                case 'compliance_score': var cs = document.getElementById('compliancePercent'); return cs ? (parseInt(cs.textContent) || 0) : null;
                case 'vault_count': return (window.s4Vault || []).length;
                case 'anchored_count': return (window.s4Stats || {}).anchored || 0;
                case 'verified_count': return (window.s4Stats || {}).verified || 0;
                case 'credit_balance': var bal = document.getElementById('walletSLSBalance') || document.getElementById('demoSlsBalance'); return bal ? (parseFloat(bal.textContent.replace(/,/g, '')) || 0) : null;
                default: return null;
            }
        },

        _render: function() {
            if (!this._el) return;
            var self = this;
            var html = '<div style="position:fixed;inset:0;background:rgba(245,245,247,0.92);backdrop-filter:blur(12px);z-index:9999;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)S4.alertRules.close()">';
            html += '<div style="background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:16px;width:92%;max-width:680px;max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.1);padding:28px">';
            html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">';
            html += '<div><h3 style="margin:0;font-size:1.15rem;font-weight:700;color:var(--text,#1d1d1f)"><i class="fas fa-bell" style="color:var(--accent);margin-right:8px"></i>Automated Alert Rules</h3>';
            html += '<p style="margin:4px 0 0;color:var(--muted);font-size:0.78rem">Configure threshold-based alerts with in-app notifications</p></div>';
            html += '<button onclick="S4.alertRules.close()" style="width:32px;height:32px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);background:transparent;cursor:pointer;color:var(--muted);font-size:1rem;display:flex;align-items:center;justify-content:center"><i class="fas fa-times"></i></button></div>';
            // Add Rule Form
            html += '<div style="background:rgba(0,113,227,0.03);border:1px solid rgba(0,113,227,0.1);border-radius:10px;padding:16px;margin-bottom:20px">';
            html += '<div style="font-size:0.82rem;font-weight:600;color:var(--text,#1d1d1f);margin-bottom:10px"><i class="fas fa-plus-circle" style="color:var(--accent);margin-right:6px"></i>Create New Rule</div>';
            html += '<div style="display:grid;grid-template-columns:1fr auto 80px;gap:8px;align-items:end">';
            html += '<div><label style="font-size:0.72rem;color:var(--muted);display:block;margin-bottom:4px">Metric</label><select id="alertRuleMetric" style="width:100%;padding:8px;border:1px solid rgba(0,0,0,0.1);border-radius:6px;font-size:0.82rem;background:#fff"><option value="compliance_score">Compliance Score (%)</option><option value="vault_count">Vault Record Count</option><option value="anchored_count">Anchored Count</option><option value="credit_balance">Credit Balance</option></select></div>';
            html += '<div><label style="font-size:0.72rem;color:var(--muted);display:block;margin-bottom:4px">Condition</label><select id="alertRuleOp" style="padding:8px;border:1px solid rgba(0,0,0,0.1);border-radius:6px;font-size:0.82rem;background:#fff"><option value="<">drops below</option><option value=">">exceeds</option><option value="=">equals</option></select></div>';
            html += '<div><label style="font-size:0.72rem;color:var(--muted);display:block;margin-bottom:4px">Value</label><input type="number" id="alertRuleVal" placeholder="70" style="width:100%;padding:8px;border:1px solid rgba(0,0,0,0.1);border-radius:6px;font-size:0.82rem"></div></div>';
            html += '<div style="margin-top:8px"><label style="font-size:0.72rem;color:var(--muted);display:block;margin-bottom:4px">Alert Message</label><input type="text" id="alertRuleMsg" placeholder="e.g. Compliance score dropped below threshold" style="width:100%;padding:8px;border:1px solid rgba(0,0,0,0.1);border-radius:6px;font-size:0.82rem"></div>';
            html += '<button onclick="S4.alertRules.addRule(document.getElementById(\'alertRuleMetric\').value,document.getElementById(\'alertRuleOp\').value,document.getElementById(\'alertRuleVal\').value,document.getElementById(\'alertRuleMsg\').value)" style="margin-top:10px;padding:8px 16px;background:#0071e3;color:#fff;border:none;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit"><i class="fas fa-plus" style="margin-right:6px"></i>Add Rule</button></div>';
            // Existing Rules
            html += '<div style="font-size:0.82rem;font-weight:600;color:var(--text,#1d1d1f);margin-bottom:10px">Active Rules (' + this._rules.length + ')</div>';
            if (!this._rules.length) {
                html += '<div style="text-align:center;color:var(--muted);padding:24px;font-size:0.82rem;border:1px dashed rgba(0,0,0,0.1);border-radius:10px">No alert rules configured. Create one above to get started.</div>';
            } else {
                this._rules.forEach(function(rule) {
                    var opLabel = rule.operator === '<' ? 'below' : rule.operator === '>' ? 'above' : 'at';
                    html += '<div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid ' + (rule.enabled ? 'rgba(0,113,227,0.12)' : 'rgba(0,0,0,0.06)') + ';border-radius:8px;margin-bottom:8px;background:' + (rule.enabled ? 'rgba(0,113,227,0.02)' : 'rgba(0,0,0,0.01)') + '">';
                    html += '<button onclick="S4.alertRules.toggleRule(' + rule.id + ')" style="width:32px;height:32px;border-radius:6px;border:1px solid rgba(0,0,0,0.08);background:' + (rule.enabled ? 'var(--accent)' : 'transparent') + ';color:' + (rule.enabled ? '#fff' : 'var(--muted)') + ';cursor:pointer;font-size:0.75rem;display:flex;align-items:center;justify-content:center"><i class="fas ' + (rule.enabled ? 'fa-check' : 'fa-pause') + '"></i></button>';
                    html += '<div style="flex:1"><div style="font-size:0.82rem;font-weight:600;color:var(--text,#1d1d1f)">' + rule.message + '</div>';
                    html += '<div style="font-size:0.72rem;color:var(--muted);margin-top:2px">' + rule.metric.replace(/_/g, ' ') + ' ' + opLabel + ' ' + rule.threshold + '</div></div>';
                    html += '<button onclick="S4.alertRules.removeRule(' + rule.id + ')" style="width:28px;height:28px;border-radius:6px;border:1px solid rgba(0,0,0,0.06);background:transparent;color:var(--muted);cursor:pointer;font-size:0.72rem;display:flex;align-items:center;justify-content:center"><i class="fas fa-trash-alt"></i></button></div>';
                });
            }
            html += '</div></div>';
            this._el.innerHTML = html;
        }
    };
    window.openAlertRules = function() { S4.alertRules.toggle(); };


    // ══════════════════════════════════════════════════════════════
    //  FEATURE: COLLABORATIVE ANNOTATIONS
    //  @mention support, threaded discussions on tool results
    // ══════════════════════════════════════════════════════════════
    S4.annotations = {
        _data: {},
        _el: null,
        _open: false,
        _currentContext: '',

        init: function() {
            try { this._data = JSON.parse(localStorage.getItem('s4_annotations') || '{}'); } catch(e) { this._data = {}; }
            var panel = document.createElement('div');
            panel.id = 's4AnnotationsPanel';
            panel.style.display = 'none';
            document.body.appendChild(panel);
            this._el = panel;
        },

        open: function(context) {
            this._currentContext = context || (window._currentILSTool || 'general');
            this._open = true;
            if (this._el) { this._el.style.display = 'flex'; this._render(); }
        },

        close: function() { this._open = false; if (this._el) this._el.style.display = 'none'; },

        addComment: function(text, parentId) {
            if (!text || !text.trim()) return;
            var ctx = this._currentContext;
            if (!this._data[ctx]) this._data[ctx] = [];
            this._data[ctx].push({
                id: Date.now(), text: text.trim(),
                author: sessionStorage.getItem('s4_username') || 'Current User',
                timestamp: new Date().toISOString(),
                parentId: parentId || null,
                mentions: (text.match(/@\w+/g) || []).map(function(m) { return m.slice(1); })
            });
            this._save(); this._render();
            if (S4.toast) S4.toast('Annotation added', 'info', 2000);
        },

        deleteComment: function(id) {
            var ctx = this._currentContext;
            if (this._data[ctx]) {
                this._data[ctx] = this._data[ctx].filter(function(c) { return c.id !== id && c.parentId !== id; });
                this._save(); this._render();
            }
        },

        _save: function() { localStorage.setItem('s4_annotations', JSON.stringify(this._data)); },

        _timeAgo: function(date) {
            var seconds = Math.floor((new Date() - date) / 1000);
            if (seconds < 60) return 'Just now';
            if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
            if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
            return Math.floor(seconds / 86400) + 'd ago';
        },

        _render: function() {
            if (!this._el) return;
            var ctx = this._currentContext;
            var comments = this._data[ctx] || [];
            var topLevel = comments.filter(function(c) { return !c.parentId; });
            var self = this;

            var html = '<div style="position:fixed;inset:0;background:rgba(245,245,247,0.92);backdrop-filter:blur(12px);z-index:9999;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)S4.annotations.close()">';
            html += '<div style="background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:16px;width:92%;max-width:640px;max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.1);padding:28px">';
            html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px"><div><h3 style="margin:0;font-size:1.15rem;font-weight:700;color:var(--text,#1d1d1f)"><i class="fas fa-comments" style="color:var(--accent);margin-right:8px"></i>Annotations</h3>';
            html += '<p style="margin:4px 0 0;color:var(--muted);font-size:0.78rem">Context: <strong>' + ctx.replace(/hub-/g, '').replace(/-/g, ' ') + '</strong> &bull; ' + comments.length + ' comment' + (comments.length !== 1 ? 's' : '') + '</p></div>';
            html += '<button onclick="S4.annotations.close()" style="width:32px;height:32px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);background:transparent;cursor:pointer;color:var(--muted)"><i class="fas fa-times"></i></button></div>';
            // Input
            html += '<div style="display:flex;gap:8px;margin-bottom:20px">';
            html += '<input type="text" id="annotationInput" placeholder="Add a comment... Use @name to mention someone" style="flex:1;padding:10px 14px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:0.85rem;font-family:inherit" onkeydown="if(event.key===\'Enter\'){S4.annotations.addComment(this.value);this.value=\'\'}">';
            html += '<button onclick="var inp=document.getElementById(\'annotationInput\');S4.annotations.addComment(inp.value);inp.value=\'\'" style="padding:8px 16px;background:#0071e3;color:#fff;border:none;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit"><i class="fas fa-paper-plane" style="margin-right:4px"></i>Post</button></div>';
            // Comments
            if (!topLevel.length) {
                html += '<div style="text-align:center;color:var(--muted);padding:32px;font-size:0.85rem;border:1px dashed rgba(0,0,0,0.08);border-radius:10px"><i class="fas fa-comments" style="font-size:1.5rem;display:block;margin-bottom:8px;opacity:0.3"></i>No annotations yet. Start a discussion!</div>';
            } else {
                topLevel.forEach(function(c) {
                    var replies = comments.filter(function(r) { return r.parentId === c.id; });
                    var highlightedText = c.text.replace(/@(\w+)/g, '<span style="color:var(--accent);font-weight:600">@$1</span>');
                    html += '<div style="border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:14px;margin-bottom:10px">';
                    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#a855f7);display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.68rem;font-weight:700">' + c.author.charAt(0).toUpperCase() + '</div>';
                    html += '<div><div style="font-size:0.82rem;font-weight:600;color:var(--text,#1d1d1f)">' + c.author + '</div><div style="font-size:0.68rem;color:var(--muted)">' + self._timeAgo(new Date(c.timestamp)) + '</div></div></div>';
                    html += '<button onclick="S4.annotations.deleteComment(' + c.id + ')" style="width:24px;height:24px;border-radius:4px;border:none;background:transparent;color:var(--muted);cursor:pointer;font-size:0.7rem"><i class="fas fa-trash-alt"></i></button></div>';
                    html += '<div style="font-size:0.85rem;color:var(--text,#1d1d1f);line-height:1.5;margin-bottom:8px">' + highlightedText + '</div>';
                    html += '<button onclick="var r=prompt(\'Reply:\');if(r)S4.annotations.addComment(r,' + c.id + ')" style="font-size:0.72rem;color:var(--accent);background:none;border:none;cursor:pointer;font-weight:600;padding:0;font-family:inherit"><i class="fas fa-reply" style="margin-right:4px"></i>Reply</button>';
                    if (replies.length) {
                        html += '<div style="margin-top:10px;padding-left:20px;border-left:2px solid rgba(0,113,227,0.1)">';
                        replies.forEach(function(r) {
                            var rText = r.text.replace(/@(\w+)/g, '<span style="color:var(--accent);font-weight:600">@$1</span>');
                            html += '<div style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.03)"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><div style="width:20px;height:20px;border-radius:50%;background:#0071e3;display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.55rem;font-weight:700">' + r.author.charAt(0).toUpperCase() + '</div>';
                            html += '<span style="font-size:0.78rem;font-weight:600;color:var(--text,#1d1d1f)">' + r.author + '</span><span style="font-size:0.65rem;color:var(--muted)">' + self._timeAgo(new Date(r.timestamp)) + '</span></div>';
                            html += '<div style="font-size:0.82rem;color:var(--text,#1d1d1f);line-height:1.4">' + rText + '</div></div>';
                        });
                        html += '</div>';
                    }
                    html += '</div>';
                });
            }
            html += '</div></div>';
            this._el.innerHTML = html;
        }
    };
    window.openAnnotations = function(ctx) { S4.annotations.open(ctx); };


    // ══════════════════════════════════════════════════════════════
    //  FEATURE: BULK IMPORT/EXPORT WIZARD
    //  Step-by-step wizard for batch data import/export
    // ══════════════════════════════════════════════════════════════
    S4.importExport = {
        _el: null,
        _step: 0,
        _data: null,

        init: function() {
            var panel = document.createElement('div');
            panel.id = 's4ImportExportWizard';
            panel.style.display = 'none';
            document.body.appendChild(panel);
            this._el = panel;
        },

        open: function() { this._step = 0; this._data = null; if (this._el) { this._el.style.display = 'flex'; this._render(); } },
        close: function() { if (this._el) this._el.style.display = 'none'; },
        setStep: function(s) { this._step = s; this._render(); },

        handleFileUpload: function(input) {
            if (!input.files || !input.files[0]) return;
            var file = input.files[0];
            var self = this;
            var reader = new FileReader();
            reader.onload = function(e) {
                var result = e.target.result;
                var ext = file.name.split('.').pop().toLowerCase();
                if (ext === 'json') {
                    try { self._data = { format: 'json', name: file.name, records: JSON.parse(result) }; if (!Array.isArray(self._data.records)) self._data.records = [self._data.records]; } catch(err) { if (S4.toast) S4.toast('Invalid JSON file', 'danger', 3000); return; }
                } else if (ext === 'csv') {
                    var lines = result.split('\n').filter(function(l) { return l.trim(); });
                    var headers = lines[0].split(',').map(function(h) { return h.trim().replace(/^"|"$/g, ''); });
                    var records = [];
                    for (var i = 1; i < lines.length; i++) {
                        var vals = lines[i].split(',').map(function(v) { return v.trim().replace(/^"|"$/g, ''); });
                        var obj = {};
                        headers.forEach(function(h, idx) { obj[h] = vals[idx] || ''; });
                        records.push(obj);
                    }
                    self._data = { format: 'csv', name: file.name, records: records, headers: headers };
                } else {
                    self._data = { format: ext, name: file.name, records: [], raw: result };
                }
                self._step = 1; self._render();
                if (S4.toast) S4.toast('File loaded: ' + file.name + ' (' + (self._data.records.length || 0) + ' records)', 'success', 3000);
            };
            if (file.name.match(/\.(json|csv|txt)$/i)) { reader.readAsText(file); } else { reader.readAsDataURL(file); }
        },

        processImport: function() {
            if (!this._data || !this._data.records.length) { if (S4.toast) S4.toast('No records to import', 'warning', 3000); return; }
            var count = this._data.records.length;
            var vault = window.s4Vault || [];
            this._data.records.forEach(function(rec) {
                vault.push({ type: rec.type || rec.Type || 'Imported Record', content: JSON.stringify(rec).substring(0, 200), fullContent: JSON.stringify(rec), hash: 'import_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8), timestamp: new Date().toISOString(), source: 'Bulk Import' });
            });
            window.s4Vault = vault;
            try { localStorage.setItem('s4_vault', JSON.stringify(vault)); } catch(e) {}
            if (typeof window.renderVault === 'function') window.renderVault();
            this._step = 2; this._render();
            if (S4.toast) S4.toast(count + ' records imported to vault', 'success', 4000);
        },

        exportVault: function(format) {
            var vault = window.s4Vault || [];
            if (!vault.length) { if (S4.toast) S4.toast('No vault records to export', 'warning', 3000); return; }
            var content, filename, type;
            if (format === 'json') { content = JSON.stringify(vault, null, 2); filename = 'S4_Vault_Export_' + new Date().toISOString().slice(0,10) + '.json'; type = 'application/json'; }
            else if (format === 'csv') { var keys = Object.keys(vault[0] || {}); content = keys.join(',') + '\n'; vault.forEach(function(r) { content += keys.map(function(k) { return '"' + String(r[k] || '').replace(/"/g, '""') + '"'; }).join(',') + '\n'; }); filename = 'S4_Vault_Export_' + new Date().toISOString().slice(0,10) + '.csv'; type = 'text/csv'; }
            else { content = '=== S4 LEDGER VAULT EXPORT ===\n' + vault.length + ' records\n\n'; vault.forEach(function(r, i) { content += '--- #' + (i+1) + ' ---\nType: ' + (r.type||'') + '\nHash: ' + (r.hash||'') + '\nDate: ' + (r.timestamp||'') + '\n\n'; }); filename = 'S4_Vault_Export_' + new Date().toISOString().slice(0,10) + '.txt'; type = 'text/plain'; }
            var blob = new Blob([content], {type: type}); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
            if (S4.toast) S4.toast('Vault exported as ' + format.toUpperCase(), 'success', 3000);
        },

        _render: function() {
            if (!this._el) return;
            var steps = ['Select Source', 'Review Data', 'Complete'];
            var html = '<div style="position:fixed;inset:0;background:rgba(245,245,247,0.92);backdrop-filter:blur(12px);z-index:9999;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)S4.importExport.close()">';
            html += '<div style="background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:16px;width:92%;max-width:720px;max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.1);padding:28px">';
            html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px"><div><h3 style="margin:0;font-size:1.15rem;font-weight:700;color:var(--text,#1d1d1f)"><i class="fas fa-file-import" style="color:var(--accent);margin-right:8px"></i>Bulk Import / Export Wizard</h3></div>';
            html += '<button onclick="S4.importExport.close()" style="width:32px;height:32px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);background:transparent;cursor:pointer;color:var(--muted)"><i class="fas fa-times"></i></button></div>';
            // Progress bar
            html += '<div style="display:flex;gap:4px;margin-bottom:24px">';
            for (var i = 0; i < steps.length; i++) {
                var isActive = i === this._step, isDone = i < this._step;
                html += '<div style="flex:1;text-align:center"><div style="height:4px;border-radius:2px;background:' + (isDone ? 'var(--accent)' : isActive ? 'linear-gradient(90deg,var(--accent),rgba(0,113,227,0.3))' : 'rgba(0,0,0,0.06)') + ';margin-bottom:6px"></div>';
                html += '<div style="font-size:0.72rem;color:' + (isActive ? 'var(--accent)' : isDone ? '#1a8a3e' : 'var(--muted)') + ';font-weight:' + (isActive ? '600' : '400') + '">' + (isDone ? '<i class="fas fa-check" style="margin-right:3px"></i>' : '') + steps[i] + '</div></div>';
            }
            html += '</div>';
            // Step content
            if (this._step === 0) {
                html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
                html += '<div style="border:2px dashed rgba(0,113,227,0.2);border-radius:12px;padding:28px;text-align:center;cursor:pointer;transition:all 0.2s" onmouseover="this.style.borderColor=\'rgba(0,113,227,0.4)\'" onmouseout="this.style.borderColor=\'rgba(0,113,227,0.2)\'" onclick="document.getElementById(\'bulkImportFile\').click()">';
                html += '<i class="fas fa-cloud-arrow-up" style="font-size:2rem;color:var(--accent);margin-bottom:12px;display:block"></i><div style="font-weight:700;color:var(--text,#1d1d1f);margin-bottom:4px">Import Data</div>';
                html += '<div style="font-size:0.78rem;color:var(--muted)">Upload JSON, CSV, or Excel files</div>';
                html += '<input type="file" id="bulkImportFile" style="display:none" accept=".json,.csv,.xlsx,.xls,.txt" onchange="S4.importExport.handleFileUpload(this)"></div>';
                html += '<div style="border:1px solid rgba(0,0,0,0.08);border-radius:12px;padding:28px;text-align:center"><i class="fas fa-cloud-arrow-down" style="font-size:2rem;color:var(--gold);margin-bottom:12px;display:block"></i><div style="font-weight:700;color:var(--text,#1d1d1f);margin-bottom:10px">Export Vault</div>';
                html += '<div style="display:flex;flex-direction:column;gap:8px">';
                html += '<button onclick="S4.importExport.exportVault(\'json\')" style="padding:8px;background:rgba(0,113,227,0.06);border:1px solid rgba(0,113,227,0.15);border-radius:6px;color:var(--accent);font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit"><i class="fas fa-code" style="margin-right:6px"></i>JSON</button>';
                html += '<button onclick="S4.importExport.exportVault(\'csv\')" style="padding:8px;background:rgba(26,138,62,0.06);border:1px solid rgba(26,138,62,0.15);border-radius:6px;color:#1a8a3e;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit"><i class="fas fa-table" style="margin-right:6px"></i>CSV</button>';
                html += '<button onclick="S4.importExport.exportVault(\'txt\')" style="padding:8px;background:rgba(184,134,11,0.06);border:1px solid rgba(184,134,11,0.15);border-radius:6px;color:var(--gold);font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit"><i class="fas fa-file-lines" style="margin-right:6px"></i>Text</button></div></div></div>';
            } else if (this._step === 1) {
                var d = this._data;
                html += '<div style="border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:16px;margin-bottom:16px">';
                html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><i class="fas fa-file" style="color:var(--accent);font-size:1.2rem"></i><div><div style="font-weight:600;color:var(--text,#1d1d1f)">' + (d ? d.name : '') + '</div>';
                html += '<div style="font-size:0.78rem;color:var(--muted)">' + (d ? d.records.length : 0) + ' records &bull; ' + (d ? d.format.toUpperCase() : '') + '</div></div></div>';
                if (d && d.records.length) {
                    var keys = Object.keys(d.records[0]).slice(0, 6);
                    html += '<div style="overflow-x:auto;max-height:240px"><table style="width:100%;border-collapse:collapse;font-size:0.78rem"><thead><tr>';
                    keys.forEach(function(k) { html += '<th style="text-align:left;padding:6px 10px;border-bottom:2px solid rgba(0,0,0,0.08);font-weight:600;color:var(--muted);font-size:0.72rem;text-transform:uppercase">' + k + '</th>'; });
                    html += '</tr></thead><tbody>';
                    d.records.slice(0, 10).forEach(function(r) { html += '<tr style="border-bottom:1px solid rgba(0,0,0,0.04)">'; keys.forEach(function(k) { html += '<td style="padding:6px 10px;color:var(--text,#1d1d1f)">' + (r[k] || '') + '</td>'; }); html += '</tr>'; });
                    if (d.records.length > 10) html += '<tr><td colspan="' + keys.length + '" style="padding:8px;text-align:center;color:var(--muted);font-style:italic">...and ' + (d.records.length - 10) + ' more</td></tr>';
                    html += '</tbody></table></div>';
                }
                html += '</div><div style="display:flex;gap:8px;justify-content:flex-end">';
                html += '<button onclick="S4.importExport.setStep(0)" style="padding:8px 16px;background:transparent;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:0.82rem;cursor:pointer;color:var(--muted);font-family:inherit">Back</button>';
                html += '<button onclick="S4.importExport.processImport()" style="padding:8px 16px;background:#0071e3;color:#fff;border:none;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit"><i class="fas fa-download" style="margin-right:6px"></i>Import ' + (d ? d.records.length : 0) + ' Records</button></div>';
            } else if (this._step === 2) {
                html += '<div style="text-align:center;padding:32px"><i class="fas fa-check-circle" style="font-size:3rem;color:#1a8a3e;margin-bottom:16px;display:block"></i>';
                html += '<div style="font-size:1.1rem;font-weight:700;color:var(--text,#1d1d1f);margin-bottom:8px">Import Complete!</div>';
                html += '<div style="font-size:0.85rem;color:var(--muted);margin-bottom:20px">' + (this._data ? this._data.records.length : 0) + ' records added to your vault.</div>';
                html += '<button onclick="S4.importExport.close()" style="padding:8px 16px;background:#0071e3;color:#fff;border:none;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit">Done</button></div>';
            }
            html += '</div></div>';
            this._el.innerHTML = html;
        }
    };
    window.openImportExport = function() { S4.importExport.open(); };


    // ══════════════════════════════════════════════════════════════
    //  FEATURE: AUDIT TRAIL TIMELINE
    //  Visual chronological timeline of all platform actions
    // ══════════════════════════════════════════════════════════════
    S4.auditTimeline = {
        _log: [],
        _el: null,
        _filters: { user: '', dateFrom: '', dateTo: '', type: '' },

        init: function() {
            try { this._log = JSON.parse(localStorage.getItem('s4_audit_log') || '[]'); } catch(e) { this._log = []; }
            var self = this;
            // Intercept toast calls to auto-log actions
            if (typeof S4.toast === 'function') {
                var _orig = S4.toast;
                S4.toast = function(msg, type, dur) { self._logAction(type || 'info', msg); return _orig.call(S4, msg, type, dur); };
            }
            var panel = document.createElement('div');
            panel.id = 's4AuditTimeline';
            panel.style.display = 'none';
            document.body.appendChild(panel);
            this._el = panel;
        },

        _logAction: function(type, description) {
            this._log.push({ id: Date.now(), type: type, description: description, user: sessionStorage.getItem('s4_username') || 'System', timestamp: new Date().toISOString() });
            if (this._log.length > 500) this._log = this._log.slice(-500);
            try { localStorage.setItem('s4_audit_log', JSON.stringify(this._log)); } catch(e) {}
        },

        logCustom: function(type, description) { this._logAction(type, description); },
        open: function() { if (this._el) { this._el.style.display = 'flex'; this._render(); } },
        close: function() { if (this._el) this._el.style.display = 'none'; },
        clearLog: function() { this._log = []; localStorage.removeItem('s4_audit_log'); this._render(); },

        exportLog: function() {
            var blob = new Blob([JSON.stringify(this._log, null, 2)], {type: 'application/json'});
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'S4_Audit_Trail_' + new Date().toISOString().slice(0,10) + '.json'; a.click(); URL.revokeObjectURL(a.href);
            if (S4.toast) S4.toast('Audit trail exported', 'success', 3000);
        },

        _getFilteredLog: function() {
            var f = this._filters;
            return this._log.filter(function(entry) {
                if (f.type && entry.type !== f.type) return false;
                if (f.user && entry.user.toLowerCase().indexOf(f.user.toLowerCase()) === -1) return false;
                if (f.dateFrom && entry.timestamp < f.dateFrom) return false;
                if (f.dateTo && entry.timestamp > f.dateTo + 'T23:59:59') return false;
                return true;
            }).reverse();
        },

        _render: function() {
            if (!this._el) return;
            var entries = this._getFilteredLog();
            var html = '<div style="position:fixed;inset:0;background:rgba(245,245,247,0.92);backdrop-filter:blur(12px);z-index:9999;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)S4.auditTimeline.close()">';
            html += '<div style="background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:16px;width:95%;max-width:840px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.1);padding:28px">';
            html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px"><div><h3 style="margin:0;font-size:1.15rem;font-weight:700;color:var(--text,#1d1d1f)"><i class="fas fa-timeline" style="color:var(--accent);margin-right:8px"></i>Audit Trail Timeline</h3>';
            html += '<p style="margin:4px 0 0;color:var(--muted);font-size:0.78rem">' + this._log.length + ' total events &bull; ' + entries.length + ' matching</p></div>';
            html += '<div style="display:flex;gap:6px">';
            html += '<button onclick="S4.auditTimeline.exportLog()" style="padding:6px 14px;background:rgba(0,113,227,0.06);border:1px solid rgba(0,113,227,0.15);border-radius:6px;color:var(--accent);font-size:0.75rem;font-weight:600;cursor:pointer;font-family:inherit"><i class="fas fa-download" style="margin-right:4px"></i>Export</button>';
            html += '<button onclick="if(confirm(\'Clear all audit logs?\'))S4.auditTimeline.clearLog()" style="padding:6px 14px;background:rgba(204,51,51,0.06);border:1px solid rgba(204,51,51,0.15);border-radius:6px;color:#cc3333;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:inherit"><i class="fas fa-eraser" style="margin-right:4px"></i>Clear</button>';
            html += '<button onclick="S4.auditTimeline.close()" style="width:32px;height:32px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);background:transparent;cursor:pointer;color:var(--muted)"><i class="fas fa-times"></i></button></div></div>';
            // Filters
            html += '<div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;padding:10px;background:rgba(0,0,0,0.015);border-radius:8px">';
            html += '<select onchange="S4.auditTimeline._filters.type=this.value;S4.auditTimeline._render()" style="padding:6px 10px;border:1px solid rgba(0,0,0,0.1);border-radius:6px;font-size:0.78rem;background:#fff"><option value="">All Types</option><option value="success">Success</option><option value="info">Info</option><option value="warning">Warning</option><option value="danger">Error</option></select>';
            html += '<input type="text" placeholder="Filter by user..." onchange="S4.auditTimeline._filters.user=this.value;S4.auditTimeline._render()" style="padding:6px 10px;border:1px solid rgba(0,0,0,0.1);border-radius:6px;font-size:0.78rem;width:140px">';
            html += '<input type="date" onchange="S4.auditTimeline._filters.dateFrom=this.value;S4.auditTimeline._render()" style="padding:6px 10px;border:1px solid rgba(0,0,0,0.1);border-radius:6px;font-size:0.78rem">';
            html += '<input type="date" onchange="S4.auditTimeline._filters.dateTo=this.value;S4.auditTimeline._render()" style="padding:6px 10px;border:1px solid rgba(0,0,0,0.1);border-radius:6px;font-size:0.78rem"></div>';
            // Timeline
            if (!entries.length) {
                html += '<div style="text-align:center;color:var(--muted);padding:40px;font-size:0.85rem"><i class="fas fa-clock-rotate-left" style="font-size:2rem;display:block;margin-bottom:12px;opacity:0.3"></i>No audit events found.</div>';
            } else {
                html += '<div style="position:relative;padding-left:24px"><div style="position:absolute;left:9px;top:0;bottom:0;width:2px;background:rgba(0,113,227,0.1)"></div>';
                entries.slice(0, 100).forEach(function(entry) {
                    var typeColors = { success:'#1a8a3e', info:'var(--accent)', warning:'#ffa500', danger:'#cc3333' };
                    var typeIcons = { success:'fa-check', info:'fa-info', warning:'fa-exclamation', danger:'fa-xmark' };
                    var color = typeColors[entry.type] || 'var(--accent)';
                    var icon = typeIcons[entry.type] || 'fa-circle';
                    var date = new Date(entry.timestamp);
                    var ts = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
                    html += '<div style="position:relative;margin-bottom:12px;padding:10px 14px;background:rgba(0,0,0,0.015);border-radius:8px;border-left:3px solid ' + color + '">';
                    html += '<div style="position:absolute;left:-22px;top:12px;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid ' + color + ';display:flex;align-items:center;justify-content:center"><i class="fas ' + icon + '" style="font-size:0.5rem;color:' + color + '"></i></div>';
                    html += '<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:0.82rem;color:var(--text,#1d1d1f);font-weight:500">' + entry.description + '</div>';
                    html += '<div style="font-size:0.68rem;color:var(--muted);white-space:nowrap;margin-left:12px">' + ts + '</div></div>';
                    html += '<div style="font-size:0.68rem;color:var(--muted);margin-top:2px"><i class="fas fa-user" style="margin-right:4px"></i>' + entry.user + '</div></div>';
                });
                html += '</div>';
                if (entries.length > 100) html += '<div style="text-align:center;color:var(--muted);padding:12px;font-size:0.78rem">Showing 100 of ' + entries.length + '. Export for full log.</div>';
            }
            html += '</div></div>';
            this._el.innerHTML = html;
        }
    };
    window.openAuditTimeline = function() { S4.auditTimeline.open(); };


    // ══════════════════════════════════════════════════════════════
    //  FEATURE: OFFLINE MODE ENHANCEMENT
    //  PWA improvements: online/offline indicators, queued ops
    // ══════════════════════════════════════════════════════════════
    S4.offlineEnhanced = {
        _isOnline: navigator.onLine,
        _queue: [],
        _indicatorEl: null,

        init: function() {
            try { this._queue = JSON.parse(localStorage.getItem('s4_offline_queue') || '[]'); } catch(e) { this._queue = []; }
            var ind = document.createElement('div');
            ind.id = 's4OnlineStatus';
            ind.style.cssText = 'position:fixed;bottom:84px;left:24px;z-index:8998;display:none;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:0.68rem;font-weight:600;transition:all 0.3s;pointer-events:none;opacity:0.9';
            document.body.appendChild(ind);
            this._indicatorEl = ind;
            this._updateIndicator();
            // Show only when inside the platform
            var ws = document.getElementById('platformWorkspace');
            if (ws && ws.style.display === 'block') ind.style.display = 'flex';
            if (ws) {
                var self2 = this;
                var _wsObs = new MutationObserver(function() {
                    ind.style.display = ws.style.display === 'block' ? 'flex' : 'none';
                });
                _wsObs.observe(ws, { attributes: true, attributeFilter: ['style'] });
            }
            var self = this;
            window.addEventListener('online', function() { self._isOnline = true; self._updateIndicator(); self._syncQueue(); if (S4.toast) S4.toast('Connection restored — syncing queued operations', 'success', 3000); });
            window.addEventListener('offline', function() { self._isOnline = false; self._updateIndicator(); if (S4.toast) S4.toast('You are offline — operations will be queued', 'warning', 4000); });
            if (this._isOnline && this._queue.length) this._syncQueue();
        },

        _updateIndicator: function() {
            if (!this._indicatorEl) return;
            if (this._isOnline) {
                this._indicatorEl.style.background = 'rgba(26,138,62,0.08)';
                this._indicatorEl.style.border = '1px solid rgba(26,138,62,0.15)';
                this._indicatorEl.style.color = '#1a8a3e';
                this._indicatorEl.innerHTML = '<div style="width:6px;height:6px;border-radius:50%;background:#1a8a3e"></div> Online' + (this._queue.length ? ' <span style="color:var(--muted)">(' + this._queue.length + ' queued)</span>' : '');
            } else {
                this._indicatorEl.style.background = 'rgba(255,165,0,0.08)';
                this._indicatorEl.style.border = '1px solid rgba(255,165,0,0.15)';
                this._indicatorEl.style.color = '#ffa500';
                this._indicatorEl.innerHTML = '<div style="width:6px;height:6px;border-radius:50%;background:#ffa500;animation:pulse 2s infinite"></div> Offline' + (this._queue.length ? ' <span style="color:var(--muted)">(' + this._queue.length + ' queued)</span>' : '');
            }
        },

        queueOperation: function(type, data) {
            this._queue.push({ id: Date.now(), type: type, data: data, timestamp: new Date().toISOString(), status: 'pending' });
            try { localStorage.setItem('s4_offline_queue', JSON.stringify(this._queue)); } catch(e) {}
            this._updateIndicator();
        },

        _syncQueue: function() {
            if (!this._isOnline || !this._queue.length) return;
            var synced = 0;
            this._queue.forEach(function(op) { if (op.status === 'pending') { op.status = 'synced'; synced++; } });
            this._queue = this._queue.filter(function(op) { return op.status !== 'synced'; });
            try { localStorage.setItem('s4_offline_queue', JSON.stringify(this._queue)); } catch(e) {}
            this._updateIndicator();
            if (synced && S4.toast) S4.toast(synced + ' queued operation' + (synced > 1 ? 's' : '') + ' synced', 'success', 3000);
        },

        getQueueStatus: function() { return { isOnline: this._isOnline, queueLength: this._queue.length, queue: this._queue }; }
    };
    window.getOfflineStatus = function() { return S4.offlineEnhanced.getQueueStatus(); };


    // ══════════════════════════════════════════════════════════════
    // TOOL HELP ICONS — ? button on each tool heading
    // ══════════════════════════════════════════════════════════════
    S4.toolHelp = {
        _helpMap: {
            'hub-analysis': '1) Select your program from the dropdown. 2) Choose a system to analyze — S4 pre-loads MIL-STD-1388 ILS elements. 3) Run analysis to identify gaps in spares, training, support equipment, tech data, and more. 4) Export findings as PDF or anchor the report hash to XRPL for tamper-proof audit evidence. S4 Ledger reduces audit prep time by 80% and saves $2.8M annually per program by catching ILS gaps before they cause readiness failures.',
            'hub-dmsms': '1) Upload or enter your parts list — S4 checks against GIDEP, DLA, and OEM lifecycle databases. 2) View flagged parts by risk severity: Critical (EOS), At Risk (DMIL notice), Monitored. 3) Review alternate sources and bridge-buy recommendations. 4) Export the DMSMS report or anchor to XRPL. S4 Ledger saves programs $1.2M-$4.5M annually by identifying obsolescence 18+ months earlier than manual tracking, reducing emergency procurements by 65%.',
            'hub-readiness': '1) Select your program and system. 2) Enter MTBF, MTTR, and MLDT values (or use S4 defaults from historical data). 3) Calculate to see Operational Availability (Ao), Inherent Availability (Ai), failure rate, and 30-day mission reliability. 4) Export or anchor the readiness snapshot. Ao > 90% meets most DoD thresholds. S4 Ledger improves readiness tracking accuracy by 45% and reduces MLDT by 30% through better spares visibility — saving $850K per ship per year.',
            'hub-roi': '1) Enter your program count, monthly records, FTEs, and labor rate. 2) Input current audit costs, error costs per incident, and S4 license fee. 3) Calculate to see savings breakdown: Labor Automation (65% reduction), Error Reduction (90%), Audit Cost Reduction (70%). 4) View net annual savings, ROI %, payback period, and 5-year projection. Typical DoD programs see 400-800% ROI with payback in 2-4 months. S4 Ledger saves $3.2M annually for a mid-size program.',
            'hub-lifecycle': '1) Enter service life, operating hours, acquisition cost, fleet size, and sustainment rate. 2) S4 calculates total ownership cost across acquisition, sustainment (O&S), DMSMS, and tech refresh. 3) View cost per operating hour and S4 savings potential. 4) Anchor the estimate to XRPL for historical comparison. S4 Ledger reduces lifecycle cost estimation errors by 35% and identifies $2M+ in DMSMS savings through proactive obsolescence management.',
            'hub-vault': '1) Anchor any record from any tool — it automatically appears here with hash, timestamp, and XRPL tx link. 2) Click any record to verify integrity on-chain. 3) Use the Digital Thread panel to trace full provenance chains across records. 4) Export vault contents as PDF or CSV for audits. S4 Ledger eliminates $500K+ annual notarization and records management costs. Verification takes 3 seconds vs. 3+ days manually.',
            'hub-docs': '1) Upload technical data packages (TDPs), manuals, or engineering drawings. 2) S4 hashes each document and anchors to XRPL automatically. 3) Track versions — any modification creates a new hash, proving exactly when changes occurred. 4) Search by document type, system, or date. S4 Ledger prevents $1.5M+ annually in rework caused by unauthorized TDP changes and reduces document retrieval time from hours to seconds.',
            'hub-compliance': '1) Select your compliance framework: CMMC, NIST 800-171, DFARS 252.204-7012, or custom. 2) S4 auto-scores your program against each control requirement. 3) View gaps with remediation guidance and estimated cost/time to close. 4) Anchor compliance snapshots for audit evidence. S4 Ledger reduces audit response time from 6+ weeks to under 48 hours and cuts compliance management costs by 60% ($400K+ annually).',
            'hub-risk': '1) Add risks with description, probability (1-5), and impact (1-5). 2) S4 calculates risk scores and color-codes by severity. 3) Assign mitigation actions with due dates and owners. 4) Anchor risk register snapshots to prove risks were identified and tracked on schedule. S4 Ledger eliminates risk tracking disputes and provides blockchain-verified evidence for PPBE milestone reviews — preventing $2M+ in program delays.',
            'hub-reports': '1) Select report type: ILS Summary, Readiness Brief, DMSMS Status, Compliance Snapshot, or Executive Summary. 2) S4 auto-populates from your tool data — no manual re-entry. 3) Export as PDF or CSV. 4) Anchor the report hash for immutable proof of when data was reported. S4 Ledger reduces report generation from 40+ hours to under 5 minutes — saving $180K per program annually in analyst labor.',
            'hub-predictive': '1) Enter equipment type, operating hours, maintenance history, and environmental conditions. 2) S4 AI analyzes failure patterns and predicts next likely failure window. 3) View recommended maintenance actions with cost-benefit analysis. 4) Anchor predictions for accountability tracking. S4 Ledger reduces unplanned maintenance by 45% and extends equipment life by 20-30% — saving $1.8M per major system annually.',
            'hub-sbom': '1) Upload or paste your software bill of materials. 2) S4 scans for known vulnerabilities (CVE), license compliance, and supply chain risks. 3) View component dependency tree with risk scores. 4) Anchor SBOM versions to meet EO 14028 and CMMC Level 3 requirements automatically. S4 Ledger reduces SBOM management from 120+ hours to 2 hours per release cycle — saving $250K annually in cybersecurity compliance labor.',
            'hub-submissions': '1) Track CDRLs, DIDs, and contractor deliverables with due dates and status. 2) S4 timestamps every submission automatically — no more he-said-she-said disputes. 3) View overdue items and send automated reminders. 4) Anchor submission receipts to prove on-time delivery. S4 Ledger eliminates $600K+ annually in contract disputes and late delivery penalties through blockchain-verified timestamps.',
            'hub-gfp': '1) Enter GFP items with serial numbers, location, custodian, and condition. 2) S4 tracks custody transfers with timestamps and digital signatures. 3) Generate FAR 45.602 property reports automatically. 4) Anchor custody events to XRPL for indisputable chain of custody. S4 Ledger reduces GFP loss/dispute write-offs by 85% — saving $1.2M+ annually per large program.',
            'hub-cdrl': '1) Enter CDRL line items with DID numbers, due dates, and responsible parties. 2) Track deliverable status: Draft, Review, Submitted, Accepted, Rejected. 3) Attach document hashes and anchor acceptance events. 4) Export CDRL status reports for contract reviews. S4 Ledger reduces CDRL tracking overhead by 70% and eliminates $300K annually in missed deliverable penalties.',
            'hub-contract': '1) Enter program baselines, configuration items, and change proposals. 2) Track ECPs, waivers, and deviations with approval workflows. 3) Every configuration change is hashed and anchored — preventing unauthorized modifications. 4) Generate configuration status accounting reports. S4 Ledger prevents $2.5M+ annually in rework from unauthorized configuration changes.',
            'hub-provenance': '1) Enter supply chain data: manufacturer, distributor, lot numbers, and test certificates. 2) S4 builds a cryptographic chain of custody from OEM to installation. 3) Scan for counterfeit indicators against GIDEP and ERAI databases. 4) Anchor each custody transfer to XRPL. S4 Ledger catches 95% of counterfeit parts before installation — preventing $5M+ in safety incidents and recalls per program.',
            'hub-analytics': '1) View real-time dashboards across all tools: anchoring volume, compliance trends, risk heatmaps, readiness tracking. 2) Drill down by program, time range, or tool. 3) Export charts and data for briefings. 4) All analytics data points are backed by blockchain-anchored records. S4 Ledger provides 360-degree program visibility that saves 15+ analyst-hours per week in manual data aggregation.',
            'hub-team': '1) Create teams and assign members with role-based permissions: Admin, Analyst, Viewer, Auditor. 2) Control tool access per team — e.g. Finance sees ROI, Engineers see DMSMS. 3) Audit every permission change on XRPL. 4) Generate access reports for CMMC/NIST compliance. S4 Ledger meets NIST 800-171 access control requirements automatically — saving $200K annually in IAM compliance labor.',
            'hub-acquisition': '1) Select your acquisition pathway: ACAT I/II/III, MTA, or Software. 2) Track milestone gates: MSA, Milestone A/B/C, FRP, FOC. 3) Link milestone evidence to blockchain-anchored artifacts. 4) Generate acquisition status reports for DAES/SAR. S4 Ledger provides blockchain-verified milestone evidence that saves 6+ months in acquisition review cycles and prevents $10M+ in program delays.',
            'hub-milestones': '1) Create milestones with deadlines, owners, and dependencies. 2) Track status: Not Started, In Progress, Complete, Overdue. 3) View Gantt-style timeline with critical path. 4) Anchor status changes to XRPL for indisputable progress records. S4 Ledger reduces schedule disputes by 90% — each status change is timestamped and immutable.',
            'hub-brief': '1) Select brief type: Program Status, Decision Brief, or Technical Review. 2) S4 auto-populates slides from your tool data — readiness, risk, compliance, cost. 3) Customize with program-specific context. 4) Export as PDF and anchor the final version to XRPL. S4 Ledger reduces brief preparation from 2+ weeks to under 1 hour — saving $120K per program annually.',
            'tabAnchor': '1) Paste or upload any defense document or data. 2) S4 generates a SHA-256 hash and writes it to the XRP Ledger as a Memo. 3) Get an XRPL transaction link as proof of existence and timestamp. 4) Verify anytime by re-hashing the original document and checking the ledger. Cost: 0.01 XRP per anchor (< $0.01). S4 Ledger replaces $50K+ annual notary and certification costs.',
            'tabLog': '1) View all anchored records with timestamps, hashes, and XRPL verification links. 2) Click any transaction to verify on-chain in the XRPL explorer. 3) Filter by record type, date, or program. 4) Export the log as CSV for audits. S4 Ledger reduces audit lookup time from 3+ days to under 10 seconds.',
            'tabMetrics': '1) View platform usage: total anchors, verifications, active programs, and credit balance. 2) Monitor performance: API response times, anchor success rates, and queue status. 3) Track team activity and tool adoption. S4 Ledger provides real-time operational visibility across your entire ILS program.',
            'tabOffline': '1) When offline, S4 automatically queues anchor operations with encrypted local storage. 2) When connectivity returns, queued operations sync automatically with exponential backoff. 3) View queue status and manually trigger sync if needed. S4 Ledger ensures zero data loss in air-gapped or austere environments.',
            'tabWallet': '1) View your XRP wallet balance and transaction history. 2) Monitor credit usage and remaining anchoring capacity. 3) Add credits through the platform. Each anchor costs 0.01 credits (~$0.006). S4 Ledger anchoring costs 99.9% less than traditional notarization.',
            'tabILS': '1) Access 23+ integrated logistics tools from the hub. 2) Each tool is purpose-built for defense ILS workflows. 3) All tools share data — run gap analysis, link to DMSMS, check readiness, generate reports, all from one platform. S4 Ledger eliminates $500K+ annually in tool sprawl and manual data re-entry across disconnected systems.'
        },
        init: function() {
            var self = this;
            // Inject CSS for help button
            var css = document.createElement('style');
            css.textContent = '.s4-tool-help{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:rgba(0,113,227,0.08);color:var(--accent,#0071e3);border:1px solid rgba(0,113,227,0.2);font-size:0.7rem;font-weight:700;cursor:pointer;margin-left:8px;transition:all 0.2s;flex-shrink:0;vertical-align:middle;line-height:1}'
                + '.s4-tool-help:hover{background:rgba(0,113,227,0.15);transform:scale(1.1)}'
                + '.s4-help-popover{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid rgba(0,113,227,0.2);border-radius:8px;padding:14px 16px;font-size:0.8rem;color:var(--text,#1d1d1f);line-height:1.65;font-weight:400;z-index:100;box-shadow:0 8px 24px rgba(0,0,0,0.1);margin-top:8px;max-width:520px;max-height:300px;overflow-y:auto;animation:briefFadeIn 0.15s ease}';
            document.head.appendChild(css);

            // Find all tool panels and inject help icons
            var panels = document.querySelectorAll('.ils-hub-panel, .tab-pane');
            panels.forEach(function(panel) {
                var id = panel.id;
                var helpText = self._helpMap[id];
                if (!helpText) return;
                var heading = panel.querySelector('h3');
                if (!heading) return;
                // Don't add duplicate help icons
                if (heading.querySelector('.s4-tool-help')) return;
                // Make heading position relative for popover
                heading.style.position = 'relative';
                var btn = document.createElement('button');
                btn.className = 's4-tool-help';
                btn.textContent = '?';
                btn.title = 'About this tool';
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var existing = heading.querySelector('.s4-help-popover');
                    if (existing) { existing.remove(); return; }
                    // Close any other open popovers
                    document.querySelectorAll('.s4-help-popover').forEach(function(p) { p.remove(); });
                    var pop = document.createElement('div');
                    pop.className = 's4-help-popover';
                    pop.textContent = helpText;
                    heading.appendChild(pop);
                    // Close on outside click
                    setTimeout(function() {
                        document.addEventListener('click', function closeHelp() {
                            pop.remove();
                            document.removeEventListener('click', closeHelp);
                        }, { once: true });
                    }, 10);
                });
                // Insert before the ai-quick-btn if present, otherwise append
                var quickBtn = heading.querySelector('.ai-quick-btn');
                if (quickBtn) { heading.insertBefore(btn, quickBtn); }
                else { heading.appendChild(btn); }
            });
        }
    };


    // ══════════════════════════════════════════════════════════════
    // INITIALIZATION — Run after DOM is ready
    // ══════════════════════════════════════════════════════════════
    function initEnterpriseFeatures() {
        // Wait for the platform workspace to be VISIBLE (not just existing in DOM)
        var ws = document.getElementById('platformWorkspace');
        if (!ws || ws.style.display === 'none' || ws.style.display === '') {
            // Retry — platform not entered yet
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

        // Initialize new enterprise features
        S4.defenseDashboard.init();
        S4.alertRules.init();
        S4.annotations.init();
        S4.importExport.init();
        S4.auditTimeline.init();
        S4.offlineEnhanced.init();

        // Initialize tool help icons
        S4.toolHelp.init();

        S4.register('enterprise-features', {
            version: '2.0.0',
            features: ['dashboard', 'notifications', 'crossLink', 'hubPriority', 'contextualAI', 'playbooks', 'healthMap', 'quickActions', 'showMore', 'defenseDashboard', 'alertRules', 'annotations', 'importExport', 'auditTimeline', 'offlineEnhanced', 'toolHelp']
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
