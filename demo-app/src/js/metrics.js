// S4 Ledger Demo — metrics
// Extracted from monolith lines 13144-14732
// 1587 lines

// ── Performance Metrics Dashboard ──
var _metricsChartTimes = null;
var _metricsChartTypes = null;

async function loadPerformanceMetrics() {
    // Merge API data with local session data for real-time accuracy
    var localAnchors = stats.anchored || 0;
    var localFees = stats.slsFees || 0;
    var localRecords = getLocalRecords();
    var localTypes = {};
    localRecords.forEach(function(r) {
        var label = r.record_label || r.record_type || 'Unknown';
        localTypes[label] = (localTypes[label] || 0) + 1;
    });

    try {
        // NETWORK_DEPENDENT: Metrics requires server — silently fails offline
        var res = await fetch('/api/metrics/performance');
        var data = await res.json();
        var el = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
        el('metricAnchorTime', data.avg_anchor_time_ms ? (data.avg_anchor_time_ms / 1000).toFixed(2) : '3.21');
        el('metricAnchorsToday', data.anchors_today || (localAnchors > 0 ? localAnchors : '—'));
        el('metricCostPerAnchor', data.cost_per_anchor || '0.01');
        el('metricValidators', data.xrpl_validators || '35');
        el('metricUptime', data.uptime_pct || '99.97');
        el('metricAiAudit', data.ai_audit_entries || (localAnchors > 0 ? Math.max(localAnchors, 1) : '—'));

        // New stats: Records Generated, Vault Size, Storage Used, Total Time
        var vaultRecords = [];
        try { vaultRecords = JSON.parse(localStorage.getItem(_vaultKey()) || '[]'); } catch(_e) {}
        var totalRecords = localRecords.length + vaultRecords.length;
        el('metricRecordsGenerated', totalRecords > 0 ? totalRecords : '—');
        el('metricVaultSize', vaultRecords.length > 0 ? vaultRecords.length : '—');
        var storageKB = 0;
        try { storageKB = Math.round(new Blob([localStorage.getItem(_vaultKey()) || '']).size / 1024 * 10) / 10; } catch(_e2) {}
        el('metricStorageUsed', storageKB > 0 ? storageKB.toFixed(1) : '—');
        el('metricTotalTime', data.total_processing_time || (localAnchors > 0 ? (localAnchors * 3.2).toFixed(1) : '—'));

        // Anchor times chart
        var timeCtx = document.getElementById('chartAnchorTimes');
        if (timeCtx && typeof Chart !== 'undefined') {
            var times = data.recent_anchor_times || Array.from({length:20}, function() { return (2.8 + Math.random()*1.5).toFixed(2); });
            if (_metricsChartTimes) _metricsChartTimes.destroy();
            _metricsChartTimes = new Chart(timeCtx, {
                type: 'line',
                data: { labels: times.map(function(_, i) { return '#' + (i+1); }), datasets: [{ label: 'Anchor Time (s)', data: times, borderColor: '#00aaff', backgroundColor: 'rgba(0,170,255,0.1)', fill: true, tension: 0.3, pointRadius: 2, pointBackgroundColor: '#00aaff' }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#6b7d93', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#6b7d93', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true } } }
            });
        }

        // Record types doughnut
        var typesCtx = document.getElementById('chartRecordTypes');
        if (typesCtx && typeof Chart !== 'undefined') {
            var types = data.record_type_counts || (Object.keys(localTypes).length > 0 ? localTypes : { 'DD1149': 12, 'DD250': 8, 'WAWF': 5, 'Container': 14, 'Supply Chain': 9, 'Custody': 7, 'Maintenance': 6 });
            if (_metricsChartTypes) _metricsChartTypes.destroy();
            _metricsChartTypes = new Chart(typesCtx, {
                type: 'doughnut',
                data: { labels: Object.keys(types), datasets: [{ data: Object.values(types), backgroundColor: ['#00aaff','#c9a84c','#38bdf8','#ff6b6b','#00aaff','#fb923c','#06b6d4'], borderWidth: 0 }] },
                options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#8ea4b8', font: { size: 10 }, padding: 8 } } } }
            });
        }

        // Recent requests
        var reqEl = document.getElementById('metricsRecentRequests');
        if (reqEl && data.recent_requests && data.recent_requests.length) {
            reqEl.innerHTML = data.recent_requests.map(function(r) {
                var methodColor = (r.method||'GET') === 'POST' ? '#00cc66' : '#00aaff';
                return '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.03)">'
                    + '<span style="background:' + methodColor + '22;color:' + methodColor + ';font-weight:700;font-size:0.7rem;padding:2px 8px;border-radius:4px;min-width:42px;text-align:center">' + (r.method||'GET') + '</span>'
                    + '<span style="color:var(--text);flex:1;font-family:monospace;font-size:0.72rem">' + (r.path||r.endpoint||'/api/anchor') + '</span>'
                    + '<span style="color:var(--accent);font-size:0.68rem;font-weight:600">' + (r.time||r.duration||r.latency||'—') + '</span>'
                    + '<span style="color:var(--muted);font-size:0.68rem">' + (r.timestamp||r.ts||'') + '</span>'
                    + '</div>';
            }).join('');
        } else if (reqEl) {
            reqEl.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem">No recent requests. Metrics auto-refresh when data is available.</div>';
        }
    } catch (e) {
        // API unavailable — populate from session data
        console.warn('Metrics load info: using local session data');
        var el = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
        el('metricAnchorTime', localAnchors > 0 ? (2.8 + Math.random() * 0.5).toFixed(2) : '—');
        el('metricAnchorsToday', localAnchors > 0 ? localAnchors : '—');
        el('metricCostPerAnchor', '0.01');
        el('metricValidators', '35');
        el('metricUptime', '99.97');
        el('metricAiAudit', localAnchors > 0 ? Math.max(localAnchors, 1) : '—');

        // New stats: Records Generated, Vault Size, Storage Used, Total Time
        var vaultRecords2 = [];
        try { vaultRecords2 = JSON.parse(localStorage.getItem(_vaultKey()) || '[]'); } catch(_e) {}
        var totalRecords2 = localRecords.length + vaultRecords2.length;
        el('metricRecordsGenerated', totalRecords2 > 0 ? totalRecords2 : '—');
        el('metricVaultSize', vaultRecords2.length > 0 ? vaultRecords2.length : '—');
        var storageKB2 = 0;
        try { storageKB2 = Math.round(new Blob([localStorage.getItem(_vaultKey()) || '']).size / 1024 * 10) / 10; } catch(_e2) {}
        el('metricStorageUsed', storageKB2 > 0 ? storageKB2.toFixed(1) : '—');
        el('metricTotalTime', localAnchors > 0 ? (localAnchors * 3.2).toFixed(1) : '—');

        // Render charts from local data even on API failure
        var timeCtx = document.getElementById('chartAnchorTimes');
        if (timeCtx && typeof Chart !== 'undefined') {
            var times = Array.from({length: Math.max(localAnchors, 10)}, function() { return (2.8 + Math.random() * 1.2).toFixed(2); });
            if (typeof _metricsChartTimes !== 'undefined' && _metricsChartTimes) _metricsChartTimes.destroy();
            _metricsChartTimes = new Chart(timeCtx, {
                type: 'line',
                data: { labels: times.map(function(_, i) { return '#' + (i+1); }), datasets: [{ label: 'Anchor Time (s)', data: times, borderColor: '#00aaff', backgroundColor: 'rgba(0,170,255,0.1)', fill: true, tension: 0.3, pointRadius: 2, pointBackgroundColor: '#00aaff' }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#6b7d93', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#6b7d93', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true } } }
            });
        }

        var typesCtx = document.getElementById('chartRecordTypes');
        if (typesCtx && typeof Chart !== 'undefined') {
            var types = Object.keys(localTypes).length > 0 ? localTypes : { 'No Records Yet': 1 };
            if (typeof _metricsChartTypes !== 'undefined' && _metricsChartTypes) _metricsChartTypes.destroy();
            _metricsChartTypes = new Chart(typesCtx, {
                type: 'doughnut',
                data: { labels: Object.keys(types), datasets: [{ data: Object.values(types), backgroundColor: ['#00aaff','#c9a84c','#38bdf8','#ff6b6b','#00aaff','#fb923c','#06b6d4'], borderWidth: 0 }] },
                options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#8ea4b8', font: { size: 10 }, padding: 8 } } } }
            });
        }

        // Populate recent requests with realistic API activity data
        var reqEl = document.getElementById('metricsRecentRequests');
        if (reqEl) {
            // Build requests from actual session records where possible
            var sessionRequests = [];
            var localRecs = typeof getLocalRecords === 'function' ? getLocalRecords() : [];
            var recentRecs = localRecs.slice(-5).reverse();
            for (var ri = 0; ri < recentRecs.length; ri++) {
                var rec = recentRecs[ri];
                var ago = Math.floor((Date.now() - new Date(rec.timestamp).getTime()) / 1000);
                var agoStr = ago < 60 ? ago + 's ago' : ago < 3600 ? Math.floor(ago/60) + 'm ago' : Math.floor(ago/3600) + 'h ago';
                sessionRequests.push({method:'POST', path:'/api/anchor', time:(2.5 + Math.random() * 1.5).toFixed(1) + 's', ts:agoStr, color:'#00cc66', detail:rec.record_label || rec.record_type || 'Record'});
                sessionRequests.push({method:'GET', path:'/api/verify/' + (rec.hash || 'sha256').substring(0,12), time:(0.3 + Math.random() * 0.3).toFixed(1) + 's', ts:agoStr, color:'#00aaff', detail:'Verify ' + (rec.record_label || '')});
            }
            // Add baseline API activity
            var baselineRequests = [
                {method:'GET', path:'/api/metrics/performance', time:'0.2s', ts:'auto', color:'#00aaff', detail:'Metrics refresh'},
                {method:'GET', path:'/api/health', time:'0.1s', ts:'auto', color:'#00aaff', detail:'Health check'},
                {method:'GET', path:'/api/records?limit=50', time:'0.4s', ts:'realtime', color:'#00aaff', detail:'Record listing'},
                {method:'POST', path:'/api/wallet/balance', time:'0.3s', ts:'auto', color:'#00cc66', detail:'Balance check'},
                {method:'GET', path:'/api/xrpl/account_info', time:'0.8s', ts:'auto', color:'#00aaff', detail:'XRPL query'}
            ];
            var allRequests = sessionRequests.length > 0 ? sessionRequests.concat(baselineRequests) : [
                {method:'POST', path:'/api/anchor', time:'2.8s', ts:'just now', color:'#00cc66', detail:'Anchor record'},
                {method:'GET', path:'/api/verify/sha256:a1b2c3d4', time:'0.4s', ts:'12s ago', color:'#00aaff', detail:'Verify hash'},
                {method:'POST', path:'/api/anchor', time:'3.1s', ts:'45s ago', color:'#00cc66', detail:'Anchor record'},
                {method:'GET', path:'/api/metrics/performance', time:'0.2s', ts:'1m ago', color:'#00aaff', detail:'Metrics'},
                {method:'GET', path:'/api/records?limit=50&branch=NAVY', time:'0.3s', ts:'2m ago', color:'#00aaff', detail:'Record query'},
                {method:'POST', path:'/api/anchor', time:'2.6s', ts:'3m ago', color:'#00cc66', detail:'Anchor record'},
                {method:'GET', path:'/api/verify/sha256:e5f6a7b8', time:'0.5s', ts:'4m ago', color:'#00aaff', detail:'Verify hash'},
                {method:'POST', path:'/api/ai-chat', time:'1.2s', ts:'5m ago', color:'#00cc66', detail:'AI query'}
            ];
            reqEl.innerHTML = allRequests.slice(0, 12).map(function(r) {
                return '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.03)">'
                    + '<span style="background:' + r.color + '22;color:' + r.color + ';font-weight:700;font-size:0.7rem;padding:2px 8px;border-radius:4px;min-width:42px;text-align:center">' + r.method + '</span>'
                    + '<span style="color:var(--text);flex:1;font-family:monospace;font-size:0.72rem">' + r.path + '</span>'
                    + '<span style="color:var(--steel);font-size:0.65rem;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + r.detail + '</span>'
                    + '<span style="color:var(--accent);font-size:0.68rem;font-weight:600">' + r.time + '</span>'
                    + '<span style="color:var(--muted);font-size:0.68rem">' + r.ts + '</span>'
                    + '</div>';
            }).join('');
        }
    }
}

// Auto-load metrics when tab shown
document.addEventListener('shown.bs.tab', function(e) {
    if (e.target && e.target.getAttribute('href') === '#tabMetrics') loadPerformanceMetrics();
    if (e.target && e.target.getAttribute('href') === '#tabOffline') refreshOfflineQueue();
});

// Auto-refresh metrics every 30 seconds when metrics tab is visible
setInterval(function() {
    var metricsTab = document.getElementById('tabMetrics');
    if (metricsTab && metricsTab.classList.contains('active')) {
        if (typeof loadPerformanceMetrics === 'function') loadPerformanceMetrics();
    }
}, 30000);



// ═══ DYNAMIC SESSION DATA ENGINE ═══
// Keeps all tool displays in sync with real user activity
(function() {
    function syncSessionToTools() {
        var s = typeof stats !== 'undefined' ? stats : {anchored:0, verified:0, types:new Set(), slsFees:0};
        var records = typeof getLocalRecords === 'function' ? getLocalRecords() : [];
        
        // Sync SLS balance bar — use actual tier allocation
        var balEl = document.getElementById('slsBarBalance');
        if (balEl) {
            var spent = s.slsFees || 0;
            var tierAlloc = (typeof _onboardTiers !== 'undefined' && typeof _onboardTier !== 'undefined' && _onboardTiers[_onboardTier]) ? _onboardTiers[_onboardTier].sls : ((typeof _demoSession !== 'undefined' && _demoSession.subscription) ? (_demoSession.subscription.sls_allocation || 25000) : 25000);
            var bal = tierAlloc - spent;
            balEl.textContent = bal.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0});
        }
        var anchEl = document.getElementById('slsBarAnchors');
        if (anchEl) anchEl.textContent = s.anchored || 0;
        var spentEl = document.getElementById('slsBarSpent');
        if (spentEl) spentEl.textContent = (s.slsFees || 0).toFixed(2);
        
        // Sync tool SLS strip — use actual tier allocation
        var tierAllocTool = (typeof _onboardTiers !== 'undefined' && typeof _onboardTier !== 'undefined' && _onboardTiers[_onboardTier]) ? _onboardTiers[_onboardTier].sls : ((typeof _demoSession !== 'undefined' && _demoSession.subscription) ? (_demoSession.subscription.sls_allocation || 25000) : 25000);
        var toolBal = document.getElementById('toolSlsBal');
        if (toolBal) toolBal.textContent = (tierAllocTool - (s.slsFees||0)).toLocaleString();
        var toolAnch = document.getElementById('toolSlsAnch');
        if (toolAnch) toolAnch.textContent = s.anchored || 0;
        var toolSpent = document.getElementById('toolSlsSpent');
        if (toolSpent) toolSpent.textContent = (s.slsFees || 0).toFixed(2);
        
        // Sync DMSMS chart data from session if available
        // (charts auto-update next time the tool is opened)
        
        // Sync Action Items badge
        try {
            var items = JSON.parse(localStorage.getItem('s4ActionItems') || '[]');
            var open = items.filter(function(i){ return i.status !== 'Closed' && i.status !== 'Resolved'; }).length;
            var badge = document.getElementById('actionItemBadge');
            if (badge) {
                badge.textContent = open > 0 ? open : '';
                badge.style.display = open > 0 ? 'inline-flex' : 'none';
            }
        } catch(e) {}
    }

    // Run every 3 seconds
    setInterval(syncSessionToTools, 3000);
    // Run immediately on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncSessionToTools);
    } else {
        syncSessionToTools();
    }
})();


// ── Offline Queue Client-Side ──
var OFFLINE_QUEUE_KEY = 's4_offline_queue';
var OFFLINE_SYNC_KEY = 's4_offline_last_sync';
var OFFLINE_QUEUE_ENCRYPTED_KEY = 's4_offline_queue_enc';
var OFFLINE_QUEUE_IV_KEY = 's4_offline_queue_iv';
var _offlineCryptoKey = null;

// ── Offline Queue Encryption (AES-256-GCM via Web Crypto) ──
async function _getOfflineCryptoKey() {
    if (_offlineCryptoKey) return _offlineCryptoKey;
    // Derive key from a device fingerprint (user agent + origin) via PBKDF2
    var seed = navigator.userAgent + '|' + location.origin + '|s4ledger_offline_v1';
    var enc = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(seed), 'PBKDF2', false, ['deriveKey']);
    _offlineCryptoKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode('s4_offline_salt_v1'), iterations: 100000, hash: 'SHA-256' },
        keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
    return _offlineCryptoKey;
}

async function _encryptQueue(data) {
    var key = await _getOfflineCryptoKey();
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var enc = new TextEncoder();
    var ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(JSON.stringify(data)));
    return { iv: Array.from(iv), data: Array.from(new Uint8Array(ciphertext)) };
}

async function _decryptQueue(encrypted) {
    var key = await _getOfflineCryptoKey();
    var iv = new Uint8Array(encrypted.iv);
    var ciphertext = new Uint8Array(encrypted.data);
    var decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(decrypted));
}

// Read queue — tries encrypted first, falls back to plain localStorage
function getOfflineQueue() {
    try {
        var encStr = localStorage.getItem(OFFLINE_QUEUE_ENCRYPTED_KEY);
        if (encStr) {
            // Return empty synchronously, then decrypt async
            // For sync callers, we cache the last known queue
            return _offlineQueueCache || [];
        }
        return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    } catch(e) { return []; }
}

// Async read — use this when you need the actual encrypted data
var _offlineQueueCache = [];
async function getOfflineQueueAsync() {
    try {
        var encStr = localStorage.getItem(OFFLINE_QUEUE_ENCRYPTED_KEY);
        if (encStr) {
            var encrypted = JSON.parse(encStr);
            _offlineQueueCache = await _decryptQueue(encrypted);
            return _offlineQueueCache;
        }
        // Migrate plain queue to encrypted
        var plain = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        if (plain.length > 0) {
            await _saveEncryptedQueue(plain);
            localStorage.removeItem(OFFLINE_QUEUE_KEY); // Remove plain after migration
        }
        _offlineQueueCache = plain;
        return plain;
    } catch(e) { console.warn('Queue decrypt error:', e); return []; }
}

async function _saveEncryptedQueue(queue) {
    try {
        var encrypted = await _encryptQueue(queue);
        localStorage.setItem(OFFLINE_QUEUE_ENCRYPTED_KEY, JSON.stringify(encrypted));
        _offlineQueueCache = queue;
    } catch(e) {
        console.warn('Queue encrypt error, falling back to plain:', e);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }
}

function saveOfflineQueue(queue) {
    // Save plain for immediate sync reads, then encrypt async
    _offlineQueueCache = queue;
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    _saveEncryptedQueue(queue).then(function() {
        localStorage.removeItem(OFFLINE_QUEUE_KEY); // Remove plain after encrypted save
    }).catch(function() {});
    refreshOfflineQueueUI();
}

function refreshOfflineQueueUI() {
    var queue = getOfflineQueue();
    var countEl = document.getElementById('offlineQueueCount');
    var listEl = document.getElementById('offlineQueueList');
    var syncEl = document.getElementById('offlineLastSync');
    var statusEl = document.getElementById('offlineStatus');
    if (countEl) countEl.textContent = queue.length;
    if (syncEl) { var ls = localStorage.getItem(OFFLINE_SYNC_KEY); syncEl.textContent = ls ? new Date(ls).toLocaleString() : 'Never'; }
    if (statusEl) { var on = navigator.onLine; statusEl.innerHTML = on ? '<i class="fas fa-circle" style="font-size:0.6rem;color:var(--green)"></i> Online' : '<i class="fas fa-circle" style="font-size:0.6rem;color:var(--red)"></i> Offline'; statusEl.style.color = on ? 'var(--green)' : 'var(--red)'; }
    if (listEl) {
        if (!queue.length) { listEl.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem">Queue is empty. Hashes are queued automatically when offline.</div>'; }
        else { listEl.innerHTML = queue.map(function(item, i) { return '<div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid rgba(255,255,255,0.03)"><span style="color:var(--accent);font-weight:700;width:24px">' + (i+1) + '</span><span style="flex:1;color:var(--text);font-family:monospace;font-size:0.72rem">' + (item.hash ? item.hash.substring(0,24)+'...' : 'N/A') + '</span><span style="color:var(--steel);font-size:0.7rem;width:80px">' + (item.record_type||'GENERAL') + '</span><span style="color:' + (item.synced ? 'var(--green)' : 'var(--gold)') + ';font-size:0.72rem">' + (item.synced ? '✓ Synced' : '⏳ Pending') + '</span><button onclick="offlineRemoveItem(' + i + ')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.75rem" title="Remove"><i class="fas fa-times"></i></button></div>'; }).join(''); }
    }
}

function refreshOfflineQueue() {
    refreshOfflineQueueUI();
    // NETWORK_DEPENDENT: Server-side queue status — gracefully fails offline
    fetch('/api/offline/queue').then(function(r){return r.json();}).then(function(data) {
        if (data.queue_size > 0) { var c = document.getElementById('offlineQueueCount'); var lc = getOfflineQueue().length; if (c) c.textContent = lc + data.queue_size; }
        if (data.last_sync) { var s = document.getElementById('offlineLastSync'); if (s) s.textContent = new Date(data.last_sync).toLocaleString(); }
    }).catch(function(){});
}

function offlineQueueHash() {
    // R12: Pull from real vault records instead of generating test hashes
    if (typeof s4Vault !== 'undefined' && s4Vault.length > 0) {
        // Find vault records not already in offline queue
        var queue = getOfflineQueue();
        var existingHashes = {};
        queue.forEach(function(q) { existingHashes[q.hash] = true; });
        var unqueued = s4Vault.filter(function(v) { return v.hash && !existingHashes[v.hash]; });
        if (unqueued.length > 0) {
            var rec = unqueued[0]; // Queue the most recent unqueued record
            queue.push({ hash: rec.hash, record_type: rec.type || 'VAULT_RECORD', branch: rec.branch || 'JOINT', timestamp: rec.timestamp || new Date().toISOString(), synced: false, label: rec.label || 'Vault Record' });
            saveOfflineQueue(queue);
            _showNotif('Vault record queued for offline sync: ' + rec.hash.substring(0,16) + '...', 'success');
        } else {
            _showNotif('All vault records are already queued. Anchor new records first.', 'info');
        }
    } else {
        // Fallback: generate hash from current session data
        var testData = 'S4-SESSION-' + Date.now() + '-' + Math.random().toString(36).substring(2,10);
        var encoder = new TextEncoder();
        crypto.subtle.digest('SHA-256', encoder.encode(testData)).then(function(buf) {
            var hash = Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
            var queue = getOfflineQueue();
            queue.push({ hash: hash, record_type: 'SESSION_HASH', branch: 'JOINT', timestamp: new Date().toISOString(), synced: false });
            saveOfflineQueue(queue);
            _showNotif('Session hash queued for offline sync: ' + hash.substring(0,16) + '...', 'info');
        });
    }
}

function offlineRemoveItem(index) { var q = getOfflineQueue(); q.splice(index,1); saveOfflineQueue(q); }
function offlineClearQueue() { if (confirm('Clear all offline queued hashes?')) { saveOfflineQueue([]); _showNotif('Offline queue cleared.', 'info'); } }

async function offlineSyncAll() { return offlineSyncWithBackoff(); }

// Exponential backoff sync with configurable retries
var _syncRetryCount = 0;
var _syncMaxRetries = 5;
var _syncBaseDelay = 1000; // 1 second base

async function offlineSyncWithBackoff(attempt) {
    attempt = attempt || 0;
    var queue = getOfflineQueue();
    var pending = queue.filter(function(i){return !i.synced;});
    if (!pending.length) { _syncRetryCount = 0; _showNotif('No pending hashes to sync.', 'info'); return; }
    if (!navigator.onLine) { _showNotif('Cannot sync — currently offline.', 'warning'); return; }
    _showNotif('Syncing ' + pending.length + ' hashes to XRPL' + (attempt > 0 ? ' (retry ' + attempt + '/' + _syncMaxRetries + ')' : '') + '...', 'info');
    try {
        // NETWORK_DEPENDENT: Sync endpoint — requires connectivity
        var res = await _origFetch('/api/offline/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hashes: pending }) });
        if (!res.ok) throw new Error('Server returned ' + res.status);
        var data = await res.json();
        for (var i = 0; i < queue.length; i++) { if (!queue[i].synced) { queue[i].synced = true; queue[i].synced_at = new Date().toISOString(); } }
        saveOfflineQueue(queue);
        localStorage.setItem(OFFLINE_SYNC_KEY, new Date().toISOString());
        _syncRetryCount = 0;
        _showNotif('Sync complete: ' + (data.synced||pending.length) + ' anchored.', 'success');
        refreshOfflineQueueUI();
    } catch (e) {
        _syncRetryCount = attempt + 1;
        if (_syncRetryCount <= _syncMaxRetries) {
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s + jitter
            var delay = _syncBaseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
            _showNotif('Sync failed (' + e.message + '). Retrying in ' + Math.round(delay / 1000) + 's...', 'warning');
            setTimeout(function() { offlineSyncWithBackoff(_syncRetryCount); }, delay);
        } else {
            _syncRetryCount = 0;
            _showNotif('Sync failed after ' + _syncMaxRetries + ' retries: ' + e.message + '. Try again later.', 'error');
        }
    }
}

// Auto-queue anchors when offline — NETWORK_DEPENDENT
var _origFetch = window.fetch;
window.fetch = function(url, opts) {
    if (!navigator.onLine && typeof url === 'string') {
        // NETWORK_DEPENDENT: All anchor-related endpoints must be queued offline
        var isAnchorRoute = url.indexOf('/api/anchor') !== -1
            || url.indexOf('/api/demo/anchor') !== -1;
        // NETWORK_DEPENDENT: Provision can't work offline — return cached/mock session
        var isProvisionRoute = url.indexOf('/api/demo/provision') !== -1;
        if (isAnchorRoute) {
            try {
                var body = opts && opts.body ? JSON.parse(opts.body) : {};
                var queue = getOfflineQueue();
                queue.push({ hash: body.hash || body.data_hash || 'UNKNOWN', record_type: body.record_type || 'QUEUED_ANCHOR', branch: body.branch || 'JOINT', timestamp: new Date().toISOString(), synced: false });
                saveOfflineQueue(queue);
                _showNotif('Offline: anchor queued locally. Will sync when reconnected.', 'info');
            } catch(e) { console.warn('Offline queue error:', e); }
            return Promise.resolve(new Response(JSON.stringify({ status: 'queued_offline', message: 'Hash queued for offline sync.', record: { tx_hash: 'OFFLINE_' + Date.now().toString(36).toUpperCase(), network: 'Queued Offline' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (isProvisionRoute) {
            // NETWORK_DEPENDENT: Return a mock offline provision response
            var _offTier = localStorage.getItem('s4_selected_tier') || 'starter';
            var _offTiers = {pilot:{label:'Pilot',sls:100},starter:{label:'Starter',sls:25000},professional:{label:'Professional',sls:100000},enterprise:{label:'Enterprise',sls:500000}};
            var _offT = _offTiers[_offTier] || _offTiers['starter'];
            return Promise.resolve(new Response(JSON.stringify({ session_id: 'offline_' + Date.now(), subscription: { label: _offT.label, sls_allocation: _offT.sls }, wallet: { address: 'rOfflineMode' }, xrp_balance: 12, sls_balance: _offT.sls }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
    }
    return _origFetch.apply(this, arguments);
};

window.addEventListener('online', function() {
    refreshOfflineQueueUI();
    _showNotif('Connection restored. Auto-syncing offline queue...', 'success');
    // Auto-sync after a 2-second delay to allow network stabilization
    setTimeout(function() {
        var q = getOfflineQueue();
        var pending = q.filter(function(i){ return !i.synced; });
        if (pending.length > 0) { offlineSyncWithBackoff(); }
    }, 2000);
});
window.addEventListener('offline', function() { refreshOfflineQueueUI(); _showNotif('Connection lost. Anchors will be queued locally.', 'warning'); });

function _showNotif(msg, type) {
    var old = document.querySelector('.workspace-notification'); if (old) old.remove();
    var d = document.createElement('div'); d.className = 'workspace-notification';
    var colors = { success: 'var(--green)', error: 'var(--red)', warning: 'var(--gold)', info: 'var(--accent)' };
    d.style.borderColor = colors[type] || colors.info;
    d.innerHTML = '<button class="notif-close" onclick="this.parentElement.remove()">&times;</button><i class="fas fa-' + (type==='success'?'check-circle':type==='error'?'times-circle':type==='warning'?'exclamation-triangle':'info-circle') + '" style="color:' + (colors[type]||colors.info) + ';margin-right:6px"></i>' + msg;
    document.body.appendChild(d);
    setTimeout(function(){d.remove();}, 5000);
}

document.addEventListener('DOMContentLoaded', function() { refreshOfflineQueueUI(); });

// ═══ FILE DRAG-DROP & UPLOAD ═══
function handleFileDrop(e) {
    e.preventDefault();
    var dropZone = document.getElementById('dropZone');
    if (dropZone) dropZone.classList.remove('drag-over');
    var files = e.dataTransfer.files;
    if (files.length > 0) processUploadedFile(files[0]);
}

function handleFileSelect(e) {
    var files = e.target.files;
    if (files.length > 0) processUploadedFile(files[0]);
}

// Track the last uploaded file's binary hash for anchoring
var _lastUploadedFileHash = null;
var _lastUploadedFileName = null;
var _lastUploadedFileSize = 0;

function processUploadedFile(file) {
    var nameEl = document.getElementById('dropFileName');
    if (nameEl) {
        nameEl.style.display = 'block';
        nameEl.innerHTML = '<i class="fas fa-file" style="margin-right:6px;"></i>' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
    }
    _lastUploadedFileName = file.name;
    _lastUploadedFileSize = file.size;

    // Always read binary for hashing (this gives us the true file hash)
    var binaryReader = new FileReader();
    binaryReader.onload = function(ev) {
        sha256Binary(ev.target.result).then(function(hash) {
            _lastUploadedFileHash = hash;
            if (nameEl) {
                nameEl.innerHTML = '<i class="fas fa-file" style="margin-right:6px;"></i>' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)'
                    + '<div style="font-size:0.7rem;color:var(--muted);font-family:monospace;margin-top:4px;">SHA-256: ' + hash.substring(0,32) + '...</div>';
            }
        });
    };
    binaryReader.readAsArrayBuffer(file);

    // Also read text content for the textarea preview (text files only)
    if (file.type.startsWith('text/') || file.name.match(/\.(txt|csv|json|xml|md|html|log|yaml|yml)$/i)) {
        var textReader = new FileReader();
        textReader.onload = function(ev) {
            document.getElementById('recordInput').value = ev.target.result.substring(0, 10000);
        };
        textReader.readAsText(file);
    } else {
        document.getElementById('recordInput').value = 'FILE: ' + file.name + ' | SIZE: ' + (file.size / 1024).toFixed(1) + ' KB | Binary file \u2014 SHA-256 hash computed from raw bytes';
    }
}



// ═══ ANCHOR-S4 — Chart.js & KPI Enhancement Engine ═══
var _s4Charts = {};

function destroyS4Chart(id) {
    if (_s4Charts[id]) { _s4Charts[id].destroy(); delete _s4Charts[id]; }
}

function createS4Chart(canvasId, config) {
    destroyS4Chart(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    // Apply Anchor-S4 theme defaults
    var defaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#8ea4b8', font: { family: 'Inter', size: 11, weight: '600' }, padding: 16, usePointStyle: true, pointStyle: 'circle' } },
            tooltip: { backgroundColor: '#16161f', titleColor: '#fff', bodyColor: '#8ea4b8', borderColor: 'rgba(0,170,255,0.2)', borderWidth: 1, padding: 12, cornerRadius: 8, titleFont: { weight: '700' }, bodyFont: { size: 12 } }
        },
        scales: {}
    };
    if (config.type === 'bar' || config.type === 'line') {
        defaults.scales = {
            x: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { color: '#8ea4b8', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { color: '#8ea4b8', font: { size: 10 } } }
        };
    }
    // Merge defaults
    config.options = config.options || {};
    config.options.responsive = defaults.responsive;
    config.options.maintainAspectRatio = defaults.maintainAspectRatio;
    config.options.plugins = Object.assign({}, defaults.plugins, config.options.plugins || {});
    if (defaults.scales.x && !config.options.scales) config.options.scales = defaults.scales;
    _s4Charts[canvasId] = new Chart(ctx.getContext('2d'), config);
    return _s4Charts[canvasId];
}

// Color palette for Anchor-S4 charts
var S4_CHART_COLORS = {
    accent: '#00aaff',
    gold: '#c9a84c',
    red: '#ff4444',
    green: '#00cc66',
    orange: '#ff8c00',
    purple: '#8b5cf6',
    teal: '#14b8a6',
    pink: '#f472b6',
    series: ['#00aaff','#c9a84c','#ff4444','#00cc66','#ff8c00','#8b5cf6','#14b8a6','#f472b6','rgba(0,170,255,0.5)','rgba(201,168,76,0.5)']
};

// KPI animation counter
function animateKPI(el, target, prefix, suffix, duration) {
    prefix = prefix || '';
    suffix = suffix || '';
    duration = duration || 800;
    var start = 0;
    var startTime = null;
    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        var current = Math.round(start + (target - start) * eased);
        el.textContent = prefix + current.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ═══ Chart rendering for Gap Analysis ═══
function renderGapAnalysisCharts() {
    // Show demo data if no real analysis has been run
    var radarCanvas = document.getElementById('gapRadarChart');
    var barCanvas = document.getElementById('gapBarChart');
    if (!radarCanvas || !barCanvas) return;
    
    var chartsRow = document.getElementById('gapChartsRow');
    if (chartsRow) chartsRow.style.display = 'flex';
    
    // Use real data if available, otherwise use demo baseline
    var labels, scores;
    if (typeof ilsResults !== 'undefined' && ilsResults && ilsResults.elements && Object.keys(ilsResults.elements).length > 0) {
        labels = Object.keys(ilsResults.elements);
        scores = labels.map(function(k){ return (ilsResults.elements[k] && typeof ilsResults.elements[k].score === 'number') ? ilsResults.elements[k].score : 0; });
    } else {
        labels = ['Supply Support','Maintenance Planning','Tech Data','Training','Config Mgmt','DMSMS','PHS&T','Reliability','Support Equipment','Manpower'];
        scores = [72, 58, 85, 44, 91, 35, 67, 78, 52, 63];
    }
    
    // Radar Chart
    if (radarCanvas.__chartInstance) radarCanvas.__chartInstance.destroy();
    radarCanvas.__chartInstance = new Chart(radarCanvas, {
        type: 'radar',
        data: {
            labels: labels.map(function(l){ return l.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase()}); }),
            datasets: [{
                label: 'ILS Element Coverage %',
                data: scores,
                backgroundColor: 'rgba(0,170,255,0.12)',
                borderColor: '#00aaff',
                borderWidth: 2,
                pointBackgroundColor: '#00aaff',
                pointBorderColor: '#fff',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.06)' }, angleLines: { color: 'rgba(255,255,255,0.06)' }, pointLabels: { color: '#8ea4b8', font: { size: 10 } } } },
            plugins: { legend: { display: false } }
        }
    });
    
    // Bar Chart
    var barColors = scores.map(function(s){ return s >= 80 ? '#00cc66' : s >= 50 ? '#ffa500' : '#ff4444'; });
    if (barCanvas.__chartInstance) barCanvas.__chartInstance.destroy();
    barCanvas.__chartInstance = new Chart(barCanvas, {
        type: 'bar',
        data: {
            labels: labels.map(function(l){ return l.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase()}); }),
            datasets: [{
                label: 'Score',
                data: scores,
                backgroundColor: barColors,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: { x: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8ea4b8' } }, y: { ticks: { color: '#8ea4b8', font: { size: 10 } }, grid: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
    return; // Skip original logic since we handled everything
}


// ═══ Chart rendering for DMSMS ═══
function renderDMSMSCharts() {
    var canvas = document.getElementById('dmsmsPieChart');
    if (!canvas) return;
    if (canvas.__chartInstance) canvas.__chartInstance.destroy();
    canvas.__chartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'At Risk', 'Obsolete', 'Resolved', 'Monitoring'],
            datasets: [{
                data: (window._dmsmsChartData && window._dmsmsChartData.reduce(function(a,b){return a+b;},0) > 0) ? window._dmsmsChartData : [45, 18, 12, 20, 5],
                backgroundColor: ['#00cc66','#ffa500','#ff4444','#00aaff','#8ea4b8'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#8ea4b8', padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } }
            }
        }
    });
}



// ═══ Chart rendering for Readiness ═══
function renderReadinessCharts() {
    var canvas = document.getElementById('readinessGauge');
    if (!canvas) return;
    var ao = 0.87;
    if (typeof window._readinessAo === 'number' && !isNaN(window._readinessAo)) {
        ao = window._readinessAo;
    } else {
        var el = document.getElementById('readinessAo') || document.getElementById('statAo');
        if (el && el.textContent && el.textContent !== '\u2014') {
            var parsed = parseFloat(el.textContent);
            if (!isNaN(parsed)) ao = parsed > 1 ? parsed / 100 : parsed;
        }
    }
    if (canvas.__chartInstance) canvas.__chartInstance.destroy();
    // Derive category readiness from Ao baseline
    var base = Math.round(ao * 100);
    var personnel = Math.min(100, base + 8);
    var equipment = Math.min(100, base - 3);
    var supply = Math.min(100, base - 10);
    var training = Math.min(100, base + 12);
    var maintenance = Math.min(100, base + 2);
    var c4isr = Math.min(100, base + 5);
    var barColors = [personnel, equipment, supply, training, maintenance, c4isr].map(function(v) {
        return v >= 90 ? 'rgba(0,204,102,0.7)' : v >= 75 ? 'rgba(0,170,255,0.6)' : v >= 60 ? 'rgba(255,165,0,0.6)' : 'rgba(255,68,68,0.6)';
    });
    canvas.__chartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Personnel', 'Equipment', 'Supply', 'Training', 'Maintenance', 'C4ISR'],
            datasets: [{
                label: 'Readiness %',
                data: [personnel, equipment, supply, training, maintenance, c4isr],
                backgroundColor: barColors,
                borderColor: barColors.map(function(c) { return c.replace('0.7','1').replace('0.6','1'); }),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: function(ctx) { return ctx.parsed.y + '%'; } } }
            },
            scales: {
                x: { ticks: { color: '#8ea4b8', font: { size: 11 } }, grid: { display: false } },
                y: { ticks: { color: '#6b7d93', font: { size: 10 }, callback: function(v) { return v + '%'; } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, max: 100 }
            }
        }
    });
}



// ═══ Chart rendering for Compliance ═══
function renderComplianceCharts() {
    var canvas = document.getElementById('complianceRadarChart');
    if (!canvas) return;
    if (canvas.__chartInstance) canvas.__chartInstance.destroy();
    canvas.__chartInstance = new Chart(canvas, {
        type: 'radar',
        data: {
            labels: ['CMMC L2','NIST 800-171','DFARS 7012','ITAR','FIPS 140-2','FedRAMP','IL4/IL5'],
            datasets: [{
                label: 'Current Posture',
                data: (window._complianceScores && window._complianceScores.reduce(function(a,b){return a+b;},0) > 0) ? window._complianceScores : [78, 85, 92, 88, 70, 65, 82],
                backgroundColor: 'rgba(0,170,255,0.12)',
                borderColor: '#00aaff',
                borderWidth: 2,
                pointBackgroundColor: '#00aaff',
                pointRadius: 4
            },{
                label: 'Target',
                data: [95, 95, 100, 100, 90, 85, 95],
                backgroundColor: 'rgba(201,168,76,0.06)',
                borderColor: 'rgba(201,168,76,0.5)',
                borderWidth: 1,
                borderDash: [4,4],
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.06)' }, angleLines: { color: 'rgba(255,255,255,0.06)' }, pointLabels: { color: '#8ea4b8', font: { size: 10 } } } },
            plugins: { legend: { labels: { color: '#8ea4b8', usePointStyle: true, font: { size: 11 } } } }
        }
    });
}



// ═══ Chart rendering for ROI ═══
// Delegated to bulletproof chart system (block 5) to prevent dual-render conflict
function renderROICharts() {
    var canvas = document.getElementById('roiLineChart');
    if (!canvas) return;
    // Clear stale bp-rendered flag so bulletproof system re-renders fresh
    if (canvas.getAttribute('data-bp-rendered')) canvas.removeAttribute('data-bp-rendered');
    // If bulletproof system is available, delegate to it
    var panel = document.getElementById('hub-roi');
    if (panel && typeof Chart !== 'undefined') {
        // Let existing chart remain if it looks correct
        var existing = null;
        try { existing = Chart.getChart(canvas); } catch(e) {}
        if (existing && existing.data && existing.data.labels && existing.data.labels.length >= 20) return;
        // Otherwise destroy and let bulletproof re-render on next hook
    }
    // Fallback: render directly if bulletproof not yet loaded
    if (canvas.__chartInstance) try { canvas.__chartInstance.destroy(); } catch(e) {}
    // Pull live values from ROI inputs instead of hardcoded
    var ftes = parseFloat((document.getElementById('roiFTEs')||{}).value) || 8;
    var rate = parseFloat((document.getElementById('roiRate')||{}).value) || 145;
    var auditCost = parseFloat((document.getElementById('roiAudit')||{}).value) || 250000;
    var errorCost = parseFloat((document.getElementById('roiError')||{}).value) || 8500;
    var incidents = parseFloat((document.getElementById('roiIncidents')||{}).value) || 35;
    var license = parseFloat((document.getElementById('roiLicense')||{}).value) || 120000;
    var laborSavings = ftes * 2080 * rate * 0.65;
    var errorSavings = incidents * errorCost * 0.90;
    var auditSavings = auditCost * 0.70;
    var baseSavings = laborSavings + errorSavings + auditSavings;
    var cumulative = [];
    var years = ['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10','Q11','Q12','Q13','Q14','Q15','Q16','Q17','Q18','Q19','Q20'];
    for (var q = 1; q <= 20; q++) {
        // Realistic adoption curve: savings ramp from 20% to 85% over 20 quarters
        var adoptionRate = 0.20 + 0.65 * (1 - Math.exp(-0.18 * q));
        var qtrlySavings = (baseSavings / 4) * adoptionRate;
        var qtrlyLicense = license / 4;
        var prev = q > 1 ? cumulative[q - 2] : 0;
        cumulative.push(Math.round(prev + qtrlySavings - qtrlyLicense));
    }
    canvas.__chartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Cumulative ROI ($)',
                data: cumulative,
                borderColor: '#00aaff',
                backgroundColor: 'rgba(0,170,255,0.08)',
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointBackgroundColor: '#00aaff',
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7
            },{
                label: 'Break-Even Line',
                data: [0, 0, 0, 0, 0],
                borderColor: 'rgba(255,255,255,0.2)',
                borderDash: [5, 5],
                borderWidth: 1,
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8ea4b8', callback: function(v) { return '$' + (v/1000).toFixed(0) + 'K'; } } },
                x: { grid: { display: false }, ticks: { color: '#8ea4b8' } }
            },
            plugins: { legend: { labels: { color: '#8ea4b8', usePointStyle: true, font: { size: 11 } } } }
        }
    });
}



// ═══ Chart rendering for Risk Engine ═══
function renderRiskCharts() {
    var canvas = document.getElementById('riskHeatChart');
    if (!canvas) return;
    if (canvas.__chartInstance) canvas.__chartInstance.destroy();
    canvas.__chartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Supply Chain','Cyber/Data','Obsolescence','Financial','Regulatory','Operational'],
            datasets: [{
                label: 'Risk Score',
                data: (window._riskChartScores && window._riskChartScores.length === 6) ? window._riskChartScores : [78, 62, 85, 45, 55, 71],
                backgroundColor: function(ctx) {
                    var v = ctx.raw;
                    return v >= 75 ? 'rgba(255,68,68,0.7)' : v >= 50 ? 'rgba(255,165,0,0.7)' : 'rgba(0,204,102,0.7)';
                },
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8ea4b8' } },
                y: { ticks: { color: '#8ea4b8', font: { size: 11 } }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}



// ═══ Chart rendering for Lifecycle Cost ═══
function renderLifecycleCharts() {
    var canvas = document.getElementById('lifecyclePieChart');
    if (!canvas) return;
    if (canvas.__chartInstance) canvas.__chartInstance.destroy();
    canvas.__chartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Acquisition','Sustainment (O&S)','DMSMS / Obsol.','Disposal','Personnel','Training'],
            datasets: [{
                data: (window._lifecycleChartData && window._lifecycleChartData.length === 6) ? window._lifecycleChartData : [28, 42, 12, 5, 8, 5],
                backgroundColor: ['#00aaff','#c9a84c','#ff4444','#8ea4b8','#00cc66','#9b59b6'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '50%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#8ea4b8', padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } }
            }
        }
    });
}



// ═══ Inject Chart Canvases into Panels ═══
function injectChartContainers() {
    // Inject chart containers into panels — VISIBLE by default
    var panels = {
        'hub-analysis': {target:'ilsResult', charts:'<div class="row mt-3" id="gapChartsRow"><div class="col-md-6"><div class="chart-container"><div class="chart-title"><i class="fas fa-chart-pie"></i> ILS Element Coverage</div><canvas id="gapRadarChart" height="240"></canvas></div></div><div class="col-md-6"><div class="chart-container"><div class="chart-title"><i class="fas fa-chart-bar"></i> Element Scores</div><canvas id="gapBarChart" height="240"></canvas></div></div></div>'},
        'hub-dmsms': {target:null, charts:'<div class="chart-container mt-3" id="dmsmsChartArea"><div class="chart-title"><i class="fas fa-chart-pie"></i> Obsolescence Risk Distribution</div><canvas id="dmsmsPieChart" height="200"></canvas></div>'},
        'hub-readiness': {target:null, charts:'<div class="chart-container mt-3" style="max-width:100%" id="readinessGaugeArea"><div class="chart-title"><i class="fas fa-gauge-high"></i> Operational Availability</div><canvas id="readinessGauge" height="300"></canvas></div>'},
        'hub-compliance': {target:null, charts:'<div class="chart-container mt-3" id="complianceChartArea"><div class="chart-title"><i class="fas fa-shield-halved"></i> Compliance Framework Radar</div><canvas id="complianceRadarChart" height="250"></canvas></div>'},
        'hub-roi': {target:null, charts:'<div class="chart-container mt-3" id="roiChartArea"><div class="chart-title"><i class="fas fa-chart-line"></i> ROI Projection — 5 Year Cumulative</div><canvas id="roiLineChart" height="220"></canvas></div>'},
        'hub-risk': {target:null, charts:'<div class="chart-container mt-3" id="riskChartArea"><div class="chart-title"><i class="fas fa-triangle-exclamation"></i> Risk Category Assessment</div><canvas id="riskHeatChart" height="220"></canvas></div>'},
        'hub-lifecycle': {target:null, charts:'<div class="chart-container mt-3" id="lifecycleChartArea"><div class="chart-title"><i class="fas fa-chart-pie"></i> Total Ownership Cost Breakdown</div><canvas id="lifecyclePieChart" height="220"></canvas></div>'}
    };
    
    Object.keys(panels).forEach(function(panelId) {
        var conf = panels[panelId];
        var panel = document.getElementById(panelId);
        if (!panel) return;
        
        // ROBUST guard: check if charts already injected
        if (panel.getAttribute('data-charts-injected')) return;
        var firstCanvasId = conf.charts.match(/id="([^"]+)"/);
        if (firstCanvasId && document.getElementById(firstCanvasId[1])) { panel.setAttribute('data-charts-injected','1'); return; }
        
        var card = panel.querySelector('.demo-card');
        if (!card) return;
        
        // For gap analysis, insert after the result panel
        if (conf.target) {
            var target = document.getElementById(conf.target);
            if (target) {
                var wrapper = document.createElement('div');
                wrapper.innerHTML = conf.charts;
                target.parentNode.insertBefore(wrapper.firstElementChild, target.nextSibling);
                panel.setAttribute('data-charts-injected','1');
                return;
            }
        }
        
        // For others, append to the first demo-card
        var wrapper = document.createElement('div');
        wrapper.innerHTML = conf.charts;
        card.appendChild(wrapper.firstElementChild);
        panel.setAttribute('data-charts-injected','1');
    });
}


// ═══ Hook into tool opening to render charts ═══
var _origOpenILSTool = openILSTool;
openILSTool = function(toolId) {
    _origOpenILSTool(toolId);
    injectChartContainers();
    setTimeout(function() {
        if (toolId === 'hub-analysis' && ilsResults) renderGapAnalysisCharts();
        if (toolId === 'hub-dmsms') renderDMSMSCharts();
        if (toolId === 'hub-readiness') renderReadinessCharts();
        if (toolId === 'hub-compliance') renderComplianceCharts();
        if (toolId === 'hub-roi') renderROICharts();
        if (toolId === 'hub-risk') renderRiskCharts();
        if (toolId === 'hub-lifecycle') renderLifecycleCharts();
    }, 300);
};

// Also hook switchHubTab
var _origSwitchHubTab = switchHubTab;
switchHubTab = function(panelId, btn) {
    _origSwitchHubTab(panelId, btn);
    injectChartContainers();
    setTimeout(function() {
        if (panelId === 'hub-analysis' && typeof ilsResults !== 'undefined' && ilsResults) renderGapAnalysisCharts();
        if (panelId === 'hub-dmsms') renderDMSMSCharts();
        if (panelId === 'hub-readiness') renderReadinessCharts();
        if (panelId === 'hub-compliance') renderComplianceCharts();
        if (panelId === 'hub-roi') renderROICharts();
        if (panelId === 'hub-risk') renderRiskCharts();
        if (panelId === 'hub-lifecycle') renderLifecycleCharts();
    }, 300);
};

// Hook analysis completion to show charts
var _origShowILSResults = null;
if (typeof showILSResults === 'function') {
    _origShowILSResults = showILSResults;
    showILSResults = function() {
        _origShowILSResults.apply(this, arguments);
        var chartsRow = document.getElementById('gapChartsRow');
        if (chartsRow) chartsRow.style.display = 'flex';
        setTimeout(renderGapAnalysisCharts, 500);
    };
}

// ═══ R12: LIFECYCLE COST CALCULATOR (was missing!) ═══
function calcLifecycle() {
    var progKey = (document.getElementById('lifecycleProgram') || {}).value || 'ddg51';
    var serviceLife = parseFloat((document.getElementById('lcServiceLife') || {}).value) || 30;
    var opHours = parseFloat((document.getElementById('lcOpHours') || {}).value) || 2500;
    var acqCostM = parseFloat((document.getElementById('lcAcqCost') || {}).value) || 85;
    var fleetSize = parseFloat((document.getElementById('lcFleetSize') || {}).value) || 20;
    var sustRate = parseFloat((document.getElementById('lcSustRate') || {}).value) || 8;

    var acqTotal = acqCostM * fleetSize;
    var annualSust = acqTotal * (sustRate / 100);
    var sustTotal = annualSust * serviceLife;
    var dmsmsFactor = 0.12 + (serviceLife > 25 ? 0.04 : 0);
    var dmsmsCost = sustTotal * dmsmsFactor;
    var disposalCost = acqTotal * 0.05;
    var personnelCost = sustTotal * 0.18;
    var trainingCost = sustTotal * 0.08;
    var totalCost = acqTotal + sustTotal + dmsmsCost + disposalCost + personnelCost + trainingCost;
    var totalOpHours = opHours * fleetSize * serviceLife;
    var costPerHour = totalOpHours > 0 ? totalCost / totalOpHours : 0;

    function fmtM(v) { return v >= 1000 ? '$' + (v/1000).toFixed(1) + 'B' : '$' + v.toFixed(0) + 'M'; }

    var e = function(id) { return document.getElementById(id); };
    if (e('lcTotalCost')) e('lcTotalCost').textContent = fmtM(totalCost);
    if (e('lcSustCost')) e('lcSustCost').textContent = fmtM(sustTotal);
    if (e('lcDmsmsCost')) e('lcDmsmsCost').textContent = fmtM(dmsmsCost);
    if (e('lcCostPerHr')) e('lcCostPerHr').textContent = '$' + costPerHour.toFixed(0) + '/hr';

    var acqPct = Math.round((acqTotal / totalCost) * 100);
    var sustPct = Math.round((sustTotal / totalCost) * 100);
    var dmsmsPct = Math.round((dmsmsCost / totalCost) * 100);
    var disposalPct = Math.round((disposalCost / totalCost) * 100);
    var personnelPct = Math.round((personnelCost / totalCost) * 100);
    var trainingPct = Math.round((trainingCost / totalCost) * 100);

    // Store globally for chart reactivity
    window._lifecycleChartData = [acqPct, sustPct, dmsmsPct, disposalPct, personnelPct, trainingPct];

    var output = e('lifecycleOutput');
    if (output) {
        var platName = (window.S4_PLATFORMS && S4_PLATFORMS[progKey]) ? S4_PLATFORMS[progKey].n : progKey.toUpperCase();
        output.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:3px;padding:20px;margin-top:12px">'
            + '<div class="section-label"><i class="fas fa-clock"></i> LIFECYCLE COST BREAKDOWN \u2014 ' + platName + '</div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:0.85rem;margin-bottom:16px">'
            + '<div><span style="color:var(--steel)">Acquisition (' + acqPct + '%)</span><br><strong style="color:#00aaff">' + fmtM(acqTotal) + '</strong></div>'
            + '<div><span style="color:var(--steel)">Sustainment (' + sustPct + '%)</span><br><strong style="color:#c9a84c">' + fmtM(sustTotal) + '</strong></div>'
            + '<div><span style="color:var(--steel)">DMSMS/Obsol (' + dmsmsPct + '%)</span><br><strong style="color:#ff4444">' + fmtM(dmsmsCost) + '</strong></div>'
            + '<div><span style="color:var(--steel)">Disposal (' + disposalPct + '%)</span><br><strong style="color:#8ea4b8">' + fmtM(disposalCost) + '</strong></div>'
            + '<div><span style="color:var(--steel)">Personnel (' + personnelPct + '%)</span><br><strong style="color:#00cc66">' + fmtM(personnelCost) + '</strong></div>'
            + '<div><span style="color:var(--steel)">Training (' + trainingPct + '%)</span><br><strong style="color:#9b59b6">' + fmtM(trainingCost) + '</strong></div>'
            + '</div>'
            + '<hr style="border-color:var(--border);margin:12px 0">'
            + '<div style="display:flex;justify-content:space-between;align-items:center">'
            + '<div><span style="color:var(--steel);font-size:0.82rem">Total Ownership Cost</span><br><span style="font-size:1.5rem;font-weight:800;color:#00aaff">' + fmtM(totalCost) + '</span></div>'
            + '<div><span style="color:var(--steel);font-size:0.82rem">Cost per Op Hour</span><br><span style="font-size:1.1rem;font-weight:700;color:var(--accent)">$' + costPerHour.toFixed(0) + '/hr</span></div>'
            + '<div><span style="color:var(--steel);font-size:0.82rem">Fleet Size</span><br><span style="font-size:1.1rem;font-weight:700;color:#fff">' + fleetSize + ' units \u00d7 ' + serviceLife + ' yrs</span></div>'
            + '</div>'
            + '</div>';
    }
    // Trigger chart update
    if (typeof renderLifecycleCharts === 'function') setTimeout(renderLifecycleCharts, 300);
    // Generate action items
    if (typeof generateLifecycleActions === 'function') generateLifecycleActions(progKey, totalCost, dmsmsCost, sustTotal);
}

function exportLifecycle() {
    var progKey = (document.getElementById('lifecycleProgram') || {}).value || 'ddg51';
    var platName = (window.S4_PLATFORMS && S4_PLATFORMS[progKey]) ? S4_PLATFORMS[progKey].n : progKey.toUpperCase();
    var serviceLife = parseFloat((document.getElementById('lcServiceLife') || {}).value) || 30;
    var acqCostM = parseFloat((document.getElementById('lcAcqCost') || {}).value) || 85;
    var fleetSize = parseFloat((document.getElementById('lcFleetSize') || {}).value) || 20;
    var sustRate = parseFloat((document.getElementById('lcSustRate') || {}).value) || 8;
    var acqTotal = acqCostM * fleetSize;
    var sustTotal = acqTotal * (sustRate / 100) * serviceLife;
    var dmsmsCost = sustTotal * (0.12 + (serviceLife > 25 ? 0.04 : 0));
    var totalCost = acqTotal + sustTotal + dmsmsCost + (acqTotal * 0.05) + (sustTotal * 0.18) + (sustTotal * 0.08);
    var report = 'S4 LEDGER — LIFECYCLE COST REPORT\n' +
        '================================\n\n' +
        'Platform: ' + platName + '\n' +
        'Fleet Size: ' + fleetSize + ' units\n' +
        'Service Life: ' + serviceLife + ' years\n' +
        'Sustainment Rate: ' + sustRate + '%\n\n' +
        'Acquisition: $' + acqTotal.toFixed(0) + 'M\n' +
        'Sustainment: $' + sustTotal.toFixed(0) + 'M\n' +
        'DMSMS/Obsolescence: $' + dmsmsCost.toFixed(0) + 'M\n' +
        'Total Ownership Cost: $' + totalCost.toFixed(0) + 'M\n\n' +
        'Generated: ' + new Date().toISOString() + '\n';
    var blob = new Blob([report], {type: 'text/plain'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'S4_Lifecycle_' + platName.replace(/\s+/g,'_') + '_' + new Date().toISOString().substring(0,10) + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    if (typeof s4Notify === 'function') s4Notify('Exported', 'Lifecycle cost report downloaded.', 'success');
}

async function anchorLifecycle() {
    var progKey = (document.getElementById('lifecycleProgram') || {}).value || 'ddg51';
    var platName = (window.S4_PLATFORMS && S4_PLATFORMS[progKey]) ? S4_PLATFORMS[progKey].n : progKey.toUpperCase();
    var serviceLife = parseFloat((document.getElementById('lcServiceLife') || {}).value) || 30;
    var acqCostM = parseFloat((document.getElementById('lcAcqCost') || {}).value) || 85;
    var fleetSize = parseFloat((document.getElementById('lcFleetSize') || {}).value) || 20;
    var sustRate = parseFloat((document.getElementById('lcSustRate') || {}).value) || 8;
    var acqTotal = acqCostM * fleetSize;
    var sustTotal = acqTotal * (sustRate / 100) * serviceLife;
    var dmsmsCost = sustTotal * (0.12 + (serviceLife > 25 ? 0.04 : 0));
    var totalCost = acqTotal + sustTotal + dmsmsCost + (acqTotal * 0.05) + (sustTotal * 0.18) + (sustTotal * 0.08);
    var text = 'Lifecycle Cost | Program: ' + platName + ' | Fleet: ' + fleetSize + ' | TOC: $' + totalCost.toFixed(0) + 'M | Date: ' + new Date().toISOString();
    var hash = await sha256(text);
    showAnchorAnimation(hash, 'Lifecycle Cost Report', 'CUI');
    stats.anchored++; stats.types.add('LIFECYCLE_COST'); stats.slsFees = Math.round((stats.slsFees + 0.01) * 100) / 100; updateStats(); saveStats();
    var result = await _anchorToXRPL(hash, 'LIFECYCLE_COST', text.substring(0,100));
    var rec = {hash:hash, type:'LIFECYCLE_COST', branch:'JOINT', timestamp:new Date().toISOString(), label:'Lifecycle Cost — '+platName, txHash:result.txHash};
    sessionRecords.push(rec);
    saveLocalRecord({hash:hash, record_type:'LIFECYCLE_COST', record_label:'Lifecycle Cost — '+platName, branch:'JOINT', timestamp:new Date().toISOString(), timestamp_display:new Date().toISOString().replace('T',' ').substring(0,19)+' UTC', fee:0.01, tx_hash:result.txHash, system:'Lifecycle Cost Estimator', explorer_url:result.explorerUrl, network:result.network});
    addToVault({hash:hash, txHash:result.txHash, type:'LIFECYCLE_COST', label:'Lifecycle Cost — '+platName, branch:'JOINT', icon:'<i class="fas fa-clock"></i>', content:text.substring(0,100), encrypted:false, timestamp:new Date().toISOString(), source:'Lifecycle Cost Estimator', fee:0.01, explorerUrl:result.explorerUrl, network:result.network});
    updateTxLog();
    _updateDemoSlsBalance();
    setTimeout(function(){ document.getElementById('animStatus').innerHTML = '<i class="fas fa-check-circle" style="color:var(--accent)"></i> Lifecycle report anchored!'; document.getElementById('animStatus').style.color = '#00aaff'; }, 2200);
    await new Promise(function(r){ setTimeout(r, 3200); });
    hideAnchorAnimation();
    if (typeof s4Notify === 'function') s4Notify('Anchored', 'Lifecycle cost report anchored to XRPL.', 'success');
}

// (Hook removed — calcLifecycle is now defined directly above with built-in chart call)

// Chart containers injected on demand by bulletproof renderer

// ═══════════════════════════════════════════════════════════════
// ═══ ANCHOR-S4 DOM TRANSFORMATION ENGINE ═══
// Restructures tool panels for professional dashboard appearance
// ═══════════════════════════════════════════════════════════════
(function() {
    'use strict';
    
    function transformPanel(panelId) {
        var panel = document.getElementById(panelId);
        if (!panel || panel.dataset.uxDone) return;
        panel.dataset.uxDone = '1';
        
        // ── Phase 1: Strip inline styles to let CSS take over ──
        panel.querySelectorAll('details').forEach(function(el) {
            el.removeAttribute('style');
        });
        panel.querySelectorAll('details summary').forEach(function(el) {
            el.removeAttribute('style');
        });
        panel.querySelectorAll('details > div').forEach(function(el) {
            el.removeAttribute('style');
        });
        // Strip inline color from h3/h4 icons (let CSS handle accent color)
        panel.querySelectorAll('h3 > i[style], h4 > i[style]').forEach(function(el) {
            el.removeAttribute('style');
        });
        // Strip inline style from first description paragraph
        var cards = panel.querySelectorAll('.demo-card');
        cards.forEach(function(card) {
            var h = card.querySelector('h3, h4');
            if (h) {
                var sib = h.nextElementSibling;
                // Check for hub-tool-header wrapper
                var header = card.querySelector('.hub-tool-header');
                if (header) sib = header.nextElementSibling;
                if (sib && sib.tagName === 'P' && sib.getAttribute('style')) {
                    sib.removeAttribute('style');
                }
            }
        });
        
        // ── Phase 2: Upgrade buttons ──
        panel.querySelectorAll('button[style]').forEach(function(btn) {
            // Skip dropzone buttons, post-action buttons, file inputs
            if (btn.closest('.ils-dropzone') || btn.closest('.post-actions') || btn.closest('.post-action-btn')) return;
            if (btn.style.display === 'none') return;
            
            var text = btn.textContent.toLowerCase();
            var isAnchor = text.includes('anchor') || text.includes('xrpl');
            var isExport = text.includes('export') || text.includes('download') || text.includes('generate');
            var isRunAction = text.includes('run ') || text.includes('analyze') || text.includes('calculate');
            var isDanger = text.includes('clear') || text.includes('delete');
            
            if (isDanger) return; // Keep danger buttons as-is
            var innerHtml = btn.innerHTML;
            var onclick = btn.getAttribute('onclick');
            if (isAnchor) {
                btn.removeAttribute('style');
                btn.className = 'btn-anchor';
            } else if (isRunAction) {
                btn.removeAttribute('style');
                btn.className = 'btn-anchor';
            } else if (isExport) {
                btn.removeAttribute('style');
                btn.className = 'btn-export';
            }
        });
        
        // ── Phase 3: Upgrade button containers to action bars ──
        panel.querySelectorAll('div[style]').forEach(function(div) {
            var s = div.getAttribute('style') || '';
            if (s.includes('display:flex') && s.includes('gap:10') && s.includes('flex-wrap:wrap') && !div.classList.contains('ils-dropzone') && !div.querySelector('.ils-dropzone') && !div.closest('.post-actions')) {
                // Check if it contains action buttons
                var btns = div.querySelectorAll('button');
                if (btns.length > 0) {
                    div.className = 'tool-actions-bar';
                    div.removeAttribute('style');
                }
            }
        });
        
        // ── Phase 4: Add section dividers ──
        cards.forEach(function(card) {
            // Find the first <label> element (start of configuration)
            var labels = card.querySelectorAll(':scope > label, :scope > .row > .col-md-6 > label');
            var firstLabel = card.querySelector(':scope > label');
            if (firstLabel && !firstLabel.previousElementSibling?.classList?.contains('section-label')) {
                var divider = document.createElement('div');
                divider.className = 'section-label';
                divider.innerHTML = '<i class="fas fa-sliders"></i> CONFIGURATION';
                var hr = document.createElement('hr');
                hr.className = 'section-divider';
                firstLabel.parentNode.insertBefore(hr, firstLabel);
                firstLabel.parentNode.insertBefore(divider, hr);
            }
            
            // Find results container and add results section label
            var resultDiv = card.querySelector('[id$="Results"], [id$="Output"], [id$="result"], [id$="Result"]');
            if (resultDiv && !resultDiv.previousElementSibling?.classList?.contains('section-label')) {
                var divider2 = document.createElement('div');
                divider2.className = 'section-label';
                divider2.innerHTML = '<i class="fas fa-chart-bar"></i> RESULTS';
                var hr2 = document.createElement('hr');
                hr2.className = 'section-divider';
                resultDiv.parentNode.insertBefore(hr2, resultDiv);
                resultDiv.parentNode.insertBefore(divider2, hr2);
            }
            
            // Add actions section label before action bars
            var actionBar = card.querySelector('.tool-actions-bar');
            if (actionBar && !actionBar.previousElementSibling?.classList?.contains('section-label')) {
                var divider3 = document.createElement('div');
                divider3.className = 'section-label';
                divider3.innerHTML = '<i class="fas fa-bolt"></i> ACTIONS';
                actionBar.parentNode.insertBefore(divider3, actionBar);
            }
        });
        
        // ── Phase 5: Move stat-mini rows to top (dashboard KPI strip) ──
        var firstCard = panel.querySelector('.demo-card');
        if (!firstCard) return;
        
        // For panels with a two-column layout (hub-analysis, hub-actions), 
        // skip moving stats as they're in different columns.
        var twoCol = panelId === 'hub-analysis' || panelId === 'hub-actions';
        
        if (!twoCol) {
            // Find stat rows that contain 3+ stat-mini cards
            var allDirectRows = firstCard.querySelectorAll(':scope > .row');
            var statRow = null;
            for (var i = 0; i < allDirectRows.length; i++) {
                var row = allDirectRows[i];
                if (row.querySelectorAll('.stat-mini').length >= 3) {
                    statRow = row;
                    break;
                }
            }
            
            if (statRow) {
                // Get the h3/h4 or hub-tool-header
                var header = firstCard.querySelector('.hub-tool-header') || firstCard.querySelector('h3, h4');
                if (header) {
                    var insertAfter = header;
                    // Wrap stat row in KPI strip styling
                    statRow.style.cssText = '';
                    statRow.classList.add('mb-3');
                    // Move to right after the header
                    insertAfter.parentNode.insertBefore(statRow, insertAfter.nextSibling);
                }
            }
        }
        
        // For hub-actions, find stats in the left column
        if (panelId === 'hub-actions') {
            var leftCol = firstCard.querySelector('.col-lg-8');
            if (leftCol) {
                var innerCard = leftCol.querySelector('.demo-card');
                if (innerCard) {
                    var statsInActions = null;
                    var rows = innerCard.querySelectorAll(':scope > .row');
                    for (var j = 0; j < rows.length; j++) {
                        if (rows[j].querySelectorAll('.stat-mini').length >= 3) {
                            statsInActions = rows[j];
                            break;
                        }
                    }
                    if (statsInActions) {
                        var h3a = innerCard.querySelector('h3');
                        if (h3a) {
                            statsInActions.style.cssText = '';
                            statsInActions.classList.add('mb-3');
                            h3a.parentNode.insertBefore(statsInActions, h3a.nextSibling);
                        }
                    }
                }
            }
        }
        
        // ── Phase 6: Strip inline styles from form inputs ──
        panel.querySelectorAll('input[style], select[style]').forEach(function(el) {
            // Keep hidden inputs and file inputs
            if (el.type === 'file' || el.type === 'hidden') return;
            if (el.style.display === 'none') return;
            // Remove inline background/color/border styles
            el.removeAttribute('style');
        });
        
        // ── Phase 7: Show chart containers immediately with placeholder ──
        var chartAreas = panel.querySelectorAll('.chart-container');
        chartAreas.forEach(function(c) {
            c.style.display = 'block';
        });
        var gapChartsRow = panel.querySelector('#gapChartsRow');
        if (gapChartsRow) gapChartsRow.style.display = 'flex';
    }
    
    // ═══ Hook into panel opening ═══
    var _prevOpen2 = openILSTool;
    openILSTool = function(toolId) {
        _prevOpen2(toolId);
        setTimeout(function() { transformPanel(toolId); }, 100);
    };
    
    var _prevSwitch2 = switchHubTab;
    switchHubTab = function(panelId, btn) {
        _prevSwitch2(panelId, btn);
        setTimeout(function() { transformPanel(panelId); }, 100);
    };
    
    // Transform any currently visible panel on page load
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            document.querySelectorAll('.ils-hub-panel.active, .ils-hub-panel[style*="display:block"], .ils-hub-panel[style*="display: block"]').forEach(function(p) {
                transformPanel(p.id);
            });
        }, 2500);
    });
})();


console.log('[Anchor-S4] Chart & KPI Enhancement Engine loaded');

// AI agent context update when entering Anchor-S4 tab (no auto-open — user clicks to open)
document.addEventListener('DOMContentLoaded', function() {
    var ilsTabLink = document.querySelector('a[href="#tabILS"]');
    if (ilsTabLink) {
        ilsTabLink.addEventListener('shown.bs.tab', function() {
            updateAiContext(currentHubPanel || 'hub-analysis');
        });
    }
});


// ═══ ACTION ITEMS CALENDAR ═══
var _calYear, _calMonth;
(function initCal() {
    var now = new Date();
    _calYear = now.getFullYear();
    _calMonth = now.getMonth();
})();

function changeCalMonth(delta) {
    _calMonth += delta;
    if (_calMonth > 11) { _calMonth = 0; _calYear++; }
    if (_calMonth < 0) { _calMonth = 11; _calYear--; }
    renderActionCalendar();
}

function renderActionCalendar() {
    var grid = document.getElementById('actionCalendarGrid');
    var label = document.getElementById('calMonthLabel');
    if (!grid || !label) return;
    // Safety: ensure calendar vars are initialized
    if (typeof _calYear === 'undefined' || _calYear === undefined || _calYear === null) {
        var _now = new Date(); _calYear = _now.getFullYear(); _calMonth = _now.getMonth();
    }
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    label.textContent = months[_calMonth] + ' ' + _calYear;

    var firstDay = new Date(_calYear, _calMonth, 1).getDay();
    var daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
    var today = new Date();
    var isCurrentMonth = (today.getFullYear() === _calYear && today.getMonth() === _calMonth);

    // Collect action item due dates from in-memory array and localStorage
    var actionDates = {};
    try {
        var items = (typeof s4ActionItems !== 'undefined' && s4ActionItems.length > 0)
            ? s4ActionItems
            : JSON.parse(localStorage.getItem('s4ActionItems') || '[]');
        items.forEach(function(item) {
            var dueStr = item.due || item.schedule || '';
            if (dueStr) {
                var d = new Date(dueStr);
                if (!isNaN(d.getTime()) && d.getFullYear() === _calYear && d.getMonth() === _calMonth) {
                    var day = d.getDate();
                    if (!actionDates[day]) actionDates[day] = [];
                    actionDates[day].push(item);
                }
            }
        });
    } catch(e) {}

    // Also generate some demo action dates for visual appeal
    if (Object.keys(actionDates).length === 0) {
        var demoActions = [
            {day:3, title:'DMSMS Review — AN/SPS-49 Radar', severity:'critical'},
            {day:7, title:'ILS Gap Analysis — DDG-51 FY25', severity:'warning'},
            {day:10, title:'Parts Order Deadline — CVN-78', severity:'critical'},
            {day:12, title:'Compliance Audit Prep', severity:'info'},
            {day:15, title:'Warranty Expiry — GE LM2500', severity:'warning'},
            {day:18, title:'Lifecycle Cost Review', severity:'info'},
            {day:21, title:'Risk Assessment Update', severity:'warning'},
            {day:24, title:'Readiness Report Due', severity:'critical'},
            {day:27, title:'Obsolescence Check — MIL-STD-1553', severity:'info'}
        ];
        demoActions.forEach(function(a) {
            if (a.day <= daysInMonth) {
                if (!actionDates[a.day]) actionDates[a.day] = [];
                actionDates[a.day].push(a);
            }
        });
    }

    var html = '';
    // Day headers
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(function(d) {
        html += '<div style="padding:4px;font-weight:700;color:var(--steel);font-size:0.7rem">' + d + '</div>';
    });
    // Empty cells before first day
    for (var i = 0; i < firstDay; i++) {
        html += '<div style="padding:6px"></div>';
    }
    // Day cells
    for (var d = 1; d <= daysInMonth; d++) {
        var isToday = isCurrentMonth && d === today.getDate();
        var hasActions = actionDates[d];
        var bg = isToday ? 'rgba(0,170,255,0.2)' : (hasActions ? 'rgba(0,170,255,0.06)' : 'var(--surface)');
        var border = isToday ? '1px solid var(--accent)' : (hasActions ? '1px solid rgba(0,170,255,0.15)' : '1px solid var(--border)');
        var dots = '';
        if (hasActions) {
            hasActions.forEach(function(a) {
                var col = a.severity === 'critical' ? '#ff3333' : (a.severity === 'warning' ? '#ffa500' : '#00aaff');
                dots += '<span style="display:inline-block;width:4px;height:4px;border-radius:50%;background:' + col + ';margin:0 1px"></span>';
            });
        }
        html += '<div onclick="showCalDay(' + d + ')" style="padding:4px 2px;background:' + bg + ';border:' + border + ';border-radius:4px;cursor:' + (hasActions ? 'pointer' : 'default') + ';min-height:32px">'
            + '<div style="color:' + (isToday ? '#00aaff' : '#fff') + ';font-weight:' + (isToday ? '800' : '400') + '">' + d + '</div>'
            + (dots ? '<div style="margin-top:2px">' + dots + '</div>' : '')
            + '</div>';
    }
    grid.innerHTML = html;
}

function showCalDay(day) {
    var detail = document.getElementById('calDayDetail');
    if (!detail) return;
    // Get actions for this day
    var actionDates = {};
    try {
        var items = (typeof s4ActionItems !== 'undefined' && s4ActionItems.length > 0)
            ? s4ActionItems
            : JSON.parse(localStorage.getItem('s4ActionItems') || '[]');
        items.forEach(function(item) {
            var dueStr = item.due || item.schedule || '';
            if (dueStr) {
                var d = new Date(dueStr);
                if (!isNaN(d.getTime()) && d.getFullYear() === _calYear && d.getMonth() === _calMonth) {
                    var dy = d.getDate();
                    if (!actionDates[dy]) actionDates[dy] = [];
                    actionDates[dy].push(item);
                }
            }
        });
    } catch(e) {}
    // Demo data fallback
    var demoActions = {
        3: [{title:'DMSMS Review — AN/SPS-49 Radar', severity:'critical', owner:'NAVSEA 04'}],
        7: [{title:'ILS Gap Analysis — DDG-51 FY25', severity:'warning', owner:'PMS 400'}],
        10: [{title:'Parts Order Deadline — CVN-78', severity:'critical', owner:'PMS 312'}],
        12: [{title:'Compliance Audit Prep', severity:'info', owner:'ILS Manager'}],
        15: [{title:'Warranty Expiry — GE LM2500', severity:'warning', owner:'PMS 300'}],
        18: [{title:'Lifecycle Cost Review', severity:'info', owner:'CAPE'}],
        21: [{title:'Risk Assessment Update', severity:'warning', owner:'PMS 400'}],
        24: [{title:'Readiness Report Due', severity:'critical', owner:'TYCOM'}],
        27: [{title:'Obsolescence Check — MIL-STD-1553', severity:'info', owner:'NAVSEA 04'}]
    };
    var items = actionDates[day] || demoActions[day] || [];
    if (items.length === 0) { detail.style.display = 'none'; return; }
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var html = '<div style="font-weight:700;color:#fff;margin-bottom:6px"><i class="fas fa-calendar-day" style="color:var(--accent);margin-right:4px"></i>' + months[_calMonth] + ' ' + day + ', ' + _calYear + '</div>';
    items.forEach(function(item) {
        var col = item.severity === 'critical' ? '#ff3333' : (item.severity === 'warning' ? '#ffa500' : '#00aaff');
        html += '<div style="padding:6px 8px;background:rgba(0,0,0,0.2);border-left:3px solid ' + col + ';border-radius:4px;margin-bottom:4px">'
            + '<div style="font-weight:600;color:#fff;font-size:0.8rem">' + (item.title || 'Action Item') + '</div>'
            + (item.owner ? '<div style="font-size:0.72rem;color:var(--steel)">Owner: ' + item.owner + '</div>' : '')
            + '</div>';
    });
    detail.innerHTML = html;
    detail.style.display = 'block';
}

// Render calendar robustly — retry until grid exists and is visible
function renderActionCalendarSafe() {
    var grid = document.getElementById('actionCalendarGrid');
    var label = document.getElementById('calMonthLabel');
    if (!grid || !label) {
        // Retry — elements may not exist yet
        setTimeout(renderActionCalendarSafe, 500);
        return;
    }
    renderActionCalendar();
    // Double-check it actually rendered content
    if (!grid.innerHTML || grid.innerHTML.trim() === '') {
        setTimeout(renderActionCalendar, 300);
    }
}
// Initial render on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(renderActionCalendarSafe, 800); });
} else {
    setTimeout(renderActionCalendarSafe, 800);
}
// Also observe hub-actions panel visibility
(function() {
    var _actionsObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            if (m.type === 'attributes' && m.attributeName === 'style') {
                var panel = m.target;
                if (panel.id === 'hub-actions' && panel.style.display !== 'none') {
                    setTimeout(renderActionCalendar, 150);
                }
            }
        });
    });
    var actionsPanel = document.getElementById('hub-actions');
    if (actionsPanel) {
        _actionsObserver.observe(actionsPanel, { attributes: true, attributeFilter: ['style'] });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            var ap = document.getElementById('hub-actions');
            if (ap) _actionsObserver.observe(ap, { attributes: true, attributeFilter: ['style'] });
        });
    }
})();

