// S4 Ledger — registry
// Extracted from monolith lines 1347-1782
// 434 lines

/* Global drag/drop prevention — stops browser from navigating away on stray drops */
document.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); }, false);
document.addEventListener('drop', function(e) { e.preventDefault(); e.stopPropagation(); }, false);

/* ═══ S4 MODULE REGISTRY & ERROR HANDLING ═══ */
/* Provides a namespace for future modularization and global error boundaries */
window.S4 = window.S4 || {
    version: '5.12.0',
    env: 'production',
    buildDate: '2026-02-26',
    modules: {},
    register: function(name, mod) { this.modules[name] = mod; },
    getModule: function(name) { return this.modules[name] || null; }
};

/* ═══ PRODUCTION MONITORING & ERROR REPORTING ═══ */
(function() {
    'use strict';

    // ── 1. Performance Observer — tracks LCP, FID, CLS, TTFB ──
    S4.metrics = {
        _data: { lcp: null, fid: null, cls: 0, ttfb: null, fcp: null, errors: [], apiLatency: [] },
        _startTime: performance.now(),
        record: function(name, value) { this._data[name] = value; },
        addApiLatency: function(endpoint, ms) {
            this._data.apiLatency.push({ endpoint: endpoint, ms: ms, ts: Date.now() });
            if (this._data.apiLatency.length > 200) this._data.apiLatency.shift();
        },
        getReport: function() {
            return Object.assign({}, this._data, {
                uptime: Math.round((performance.now() - this._startTime) / 1000),
                memoryMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
                version: S4.version,
                env: S4.env,
                timestamp: new Date().toISOString()
            });
        }
    };

    // Web Vitals collection
    try {
        if (typeof PerformanceObserver !== 'undefined') {
            // Largest Contentful Paint
            new PerformanceObserver(function(list) {
                var entries = list.getEntries();
                if (entries.length > 0) S4.metrics.record('lcp', Math.round(entries[entries.length - 1].startTime));
            }).observe({ type: 'largest-contentful-paint', buffered: true });

            // First Input Delay
            new PerformanceObserver(function(list) {
                var entries = list.getEntries();
                if (entries.length > 0) S4.metrics.record('fid', Math.round(entries[0].processingStart - entries[0].startTime));
            }).observe({ type: 'first-input', buffered: true });

            // Cumulative Layout Shift
            new PerformanceObserver(function(list) {
                var entries = list.getEntries();
                entries.forEach(function(e) { if (!e.hadRecentInput) S4.metrics._data.cls += e.value; });
                S4.metrics._data.cls = Math.round(S4.metrics._data.cls * 1000) / 1000;
            }).observe({ type: 'layout-shift', buffered: true });

            // First Contentful Paint
            new PerformanceObserver(function(list) {
                var entries = list.getEntries();
                entries.forEach(function(e) { if (e.name === 'first-contentful-paint') S4.metrics.record('fcp', Math.round(e.startTime)); });
            }).observe({ type: 'paint', buffered: true });
        }
    } catch(e) { /* Graceful degradation for older browsers */ }

    // TTFB
    window.addEventListener('load', function() {
        try {
            var nav = performance.getEntriesByType('navigation')[0];
            if (nav) S4.metrics.record('ttfb', Math.round(nav.responseStart - nav.requestStart));
        } catch(e) {}
    });

    // ── 2. Production Error Reporter ──
    S4.errorReporter = {
        _queue: [],
        _maxQueue: 50,
        report: function(error) {
            var entry = {
                message: typeof error === 'string' ? error : (error.message || 'Unknown error'),
                stack: error.stack || null,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                version: S4.version,
                userAgent: navigator.userAgent.substring(0, 200)
            };
            this._queue.push(entry);
            if (this._queue.length > this._maxQueue) this._queue.shift();
            console.error('[S4 Error]', entry.message);
            // Batch send to error reporting endpoint every 60s
        },
        flush: async function() {
            if (this._queue.length === 0) return;
            var batch = this._queue.splice(0);
            try {
                await fetch('/api/errors/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ errors: batch, session: sessionStorage.getItem('s4_session_id') || 'unknown' })
                });
            } catch(e) {
                // Re-queue on failure — will retry next flush
                this._queue = batch.concat(this._queue);
            }
        }
    };

    // Flush errors every 60 seconds
    setInterval(function() { S4.errorReporter.flush(); }, 60000);
    // Flush on page unload
    window.addEventListener('beforeunload', function() { S4.errorReporter.flush(); });

    // ── 3. API Interceptor — adds auth headers + latency tracking ──
    var _originalFetch = window.fetch;
    window.fetch = function(url, options) {
        var start = performance.now();
        var urlStr = typeof url === 'string' ? url : (url.url || '');

        // Inject auth token for S4 API calls
        if (urlStr.startsWith('/api/')) {
            options = options || {};
            options.headers = options.headers || {};
            if (typeof options.headers.set === 'function') {
                // Headers object
            } else {
                var token = sessionStorage.getItem('s4_auth_token');
                if (token) options.headers['Authorization'] = 'Bearer ' + token;
                var csrf = S4.csrf ? S4.csrf.getToken() : null;
                if (csrf) options.headers['X-CSRF-Token'] = csrf;
                options.headers['X-S4-Version'] = S4.version;
                options.headers['X-S4-Client'] = 'web-prod';
            }
        }

        return _originalFetch.call(window, url, options).then(function(response) {
            if (urlStr.startsWith('/api/')) {
                S4.metrics.addApiLatency(urlStr.split('?')[0], Math.round(performance.now() - start));
            }
            return response;
        }).catch(function(error) {
            if (urlStr.startsWith('/api/')) {
                S4.metrics.addApiLatency(urlStr.split('?')[0], -1); // -1 indicates failure
            }
            throw error;
        });
    };

    // ── 4. Health Check — periodic self-diagnosis ──
    S4.healthCheck = function() {
        var checks = {
            serviceWorker: 'serviceWorker' in navigator,
            crypto: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
            indexedDB: typeof indexedDB !== 'undefined',
            localStorage: (function() { try { localStorage.setItem('_hc','1'); localStorage.removeItem('_hc'); return true; } catch(e) { return false; } })(),
            webSocket: typeof WebSocket !== 'undefined',
            fetchAPI: typeof fetch !== 'undefined',
            webCrypto: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined' && typeof crypto.subtle.digest === 'function',
            performance: typeof PerformanceObserver !== 'undefined'
        };
        checks.allPassing = Object.values(checks).every(function(v) { return v === true; });
        return checks;
    };

    S4.register('monitoring', { version: '1.0.0', features: ['web-vitals', 'error-reporter', 'api-interceptor', 'health-check'] });
    console.log('[S4 Production] Monitoring module loaded \u2014 v' + S4.version + ' (' + S4.env + ')');
})();

/* ═══ i18n PREPARATION — Internationalization Framework ═══ */
/* Lightweight message catalog for future translation support. */
/* Usage: S4.t('key') returns translated string, falls back to English. */
S4.i18n = {
    locale: (navigator.language || 'en').split('-')[0],
    catalogs: {
        en: {
            'app.name': 'S4 Ledger',
            'nav.platform': 'Platform',
            'nav.useCases': 'Use Cases',
            'nav.pricing': 'Pricing',
            'nav.company': 'Company',
            'nav.docs': 'Docs',
            'nav.contact': 'Contact Us',
            'anchor.title': 'Anchor Channel',
            'anchor.placeholder': 'Or paste/type your defense logistics record here...',
            'anchor.button': 'Anchor Record',
            'verify.title': 'Verify Channel',
            'verify.placeholder': 'Paste the original defense record content here...',
            'vault.title': 'Audit Record Vault',
            'vault.empty': 'No anchored records yet. Records will appear here automatically as you anchor them.',
            'vault.search': 'Search records by type, hash, content...',
            'vault.exportCSV': 'Export CSV',
            'vault.exportXLSX': 'Export XLSX',
            'vault.reverifyAll': 'Re-Verify All',
            'vault.clear': 'Clear Vault',
            'toast.missingContent': 'Please enter record content.',
            'toast.noProgram': 'Please select a program first.',
            'toast.noAnalysis': 'Run analysis first.',
            'toast.copied': 'Copied to clipboard!',
            'toast.exported': 'records exported.',
            'toast.verified': 'records re-verified.',
            'shortcuts.title': 'Keyboard Shortcuts',
            'search.placeholder': 'Search records, vault, tools, documents...',
            'search.noResults': 'No results found'
        }
        /* Future: add 'fr', 'de', 'es', 'ar', 'ko', 'ja' catalogs here */
    },
    setLocale: function(loc) { this.locale = loc; },
    t: function(key) {
        var cat = this.catalogs[this.locale] || this.catalogs.en;
        return cat[key] || this.catalogs.en[key] || key;
    }
};
window.S4.t = S4.i18n.t.bind(S4.i18n);

/* Global error boundary — log + report to Supabase for production monitoring */
var _errorQueue = [];
var _errorFlushTimer = null;
function _reportErrors() {
    if (_errorQueue.length === 0) return;
    var batch = _errorQueue.splice(0, 20);
    try {
        var sid = localStorage.getItem('s4_session_id') || 'unknown';
        navigator.sendBeacon('/api/errors/report', JSON.stringify({ session_id: sid, errors: batch }));
    } catch(e) { /* silent */ }
}
window.onerror = function(msg, source, line, col, error) {
    console.error('[S4 Error]', msg, 'at', source, line + ':' + col);
    _errorQueue.push({ type: 'js', msg: String(msg).substring(0, 500), source: source, line: line, col: col, ts: Date.now() });
    clearTimeout(_errorFlushTimer);
    _errorFlushTimer = setTimeout(_reportErrors, 5000);
    return true;
};
window.addEventListener('unhandledrejection', function(e) {
    console.warn('[S4 Unhandled Promise]', e.reason);
    _errorQueue.push({ type: 'promise', msg: String(e.reason).substring(0, 500), ts: Date.now() });
    clearTimeout(_errorFlushTimer);
    _errorFlushTimer = setTimeout(_reportErrors, 5000);
});
window.addEventListener('error', function(e) {
    if (e.target && e.target !== window) {
        console.warn('[S4 Resource Error]', e.target.tagName, e.target.src || e.target.href);
        _errorQueue.push({ type: 'resource', tag: e.target.tagName, url: (e.target.src || e.target.href || '').substring(0, 300), ts: Date.now() });
        clearTimeout(_errorFlushTimer);
        _errorFlushTimer = setTimeout(_reportErrors, 5000);
    }
}, true);

/* ═══ S4 SECURITY MODULE ═══ */
/* Provides XSS sanitization, session timeout, encrypted storage, audit chain, rate limiting */
(function() {
    'use strict';

    // ── 1. XSS Sanitizer — safe HTML rendering for user-supplied content ──
    var _sanitizeDiv = document.createElement('div');
    S4.sanitize = function(str) {
        if (typeof str !== 'string') return '';
        _sanitizeDiv.textContent = str;
        return _sanitizeDiv.innerHTML;
    };
    // Sanitize allowing basic formatting (bold, italic, links) but strip scripts/events
    S4.sanitizeHTML = function(html) {
        if (typeof html !== 'string') return '';
        var temp = document.createElement('div');
        temp.innerHTML = html;
        // Remove script tags
        var scripts = temp.querySelectorAll('script,iframe,object,embed,form');
        for (var i = scripts.length - 1; i >= 0; i--) scripts[i].remove();
        // Remove event handlers
        var all = temp.querySelectorAll('*');
        for (var j = 0; j < all.length; j++) {
            var attrs = all[j].attributes;
            for (var k = attrs.length - 1; k >= 0; k--) {
                if (attrs[k].name.startsWith('on') || attrs[k].value.indexOf('javascript:') === 0) {
                    all[j].removeAttribute(attrs[k].name);
                }
            }
        }
        return temp.innerHTML;
    };

    // ── 2. Session Timeout — auto-lock after inactivity with warning ──
    var _sessionTimeout = 30 * 60 * 1000; // 30 minutes
    var _sessionWarnTimeout = 28 * 60 * 1000; // Warn at 28 minutes (2 min before lock)
    var _sessionTimer = null;
    var _sessionWarnTimer = null;
    var _sessionLocked = false;
    S4.sessionTimeout = _sessionTimeout;

    function _resetSessionTimer() {
        if (_sessionLocked) return;
        clearTimeout(_sessionTimer);
        clearTimeout(_sessionWarnTimer);
        // Warning toast 2 minutes before lock
        _sessionWarnTimer = setTimeout(function() {
            if (!_sessionLocked && typeof s4Notify === 'function') {
                s4Notify('Session Expiring', 'Your session will lock in 2 minutes due to inactivity. Move your mouse or press a key to stay active.', 'warning');
            }
        }, _sessionWarnTimeout);
        _sessionTimer = setTimeout(function() {
            _sessionLocked = true;
            S4.sessionLocked = true;
            // Show lock overlay
            var overlay = document.getElementById('s4SessionLockOverlay');
            if (overlay) overlay.style.display = 'flex';
            if (typeof s4Notify === 'function') s4Notify('Session Locked', 'Inactive for 30 minutes. Click to resume.', 'warning');
        }, _sessionTimeout);
    }
    S4.resumeSession = function() {
        _sessionLocked = false;
        S4.sessionLocked = false;
        var overlay = document.getElementById('s4SessionLockOverlay');
        if (overlay) overlay.style.display = 'none';
        _resetSessionTimer();
    };
    ['mousemove','mousedown','keydown','scroll','touchstart'].forEach(function(evt) {
        document.addEventListener(evt, _resetSessionTimer, {passive: true});
    });
    _resetSessionTimer();

    // ── 3. Encrypted localStorage wrapper (AES-GCM) ──
    var _encKey = null;
    S4.crypto = {
        _getKey: async function() {
            if (_encKey) return _encKey;
            var stored = sessionStorage.getItem('s4_enc_key');
            if (stored) {
                var raw = Uint8Array.from(atob(stored), function(c){ return c.charCodeAt(0); });
                _encKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt','decrypt']);
                return _encKey;
            }
            _encKey = await crypto.subtle.generateKey({name:'AES-GCM', length:256}, true, ['encrypt','decrypt']);
            var exported = await crypto.subtle.exportKey('raw', _encKey);
            sessionStorage.setItem('s4_enc_key', btoa(String.fromCharCode.apply(null, new Uint8Array(exported))));
            return _encKey;
        },
        encrypt: async function(plaintext) {
            var key = await this._getKey();
            var iv = crypto.getRandomValues(new Uint8Array(12));
            var data = new TextEncoder().encode(plaintext);
            var encrypted = await crypto.subtle.encrypt({name:'AES-GCM', iv:iv}, key, data);
            var combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);
            return btoa(String.fromCharCode.apply(null, combined));
        },
        decrypt: async function(ciphertext) {
            var key = await this._getKey();
            var combined = Uint8Array.from(atob(ciphertext), function(c){ return c.charCodeAt(0); });
            var iv = combined.slice(0, 12);
            var data = combined.slice(12);
            var decrypted = await crypto.subtle.decrypt({name:'AES-GCM', iv:iv}, key, data);
            return new TextDecoder().decode(decrypted);
        }
    };

    // ── 4. Audit Hash Chain — each vault entry references previous hash ──
    S4.auditChain = {
        computeChainHash: async function(record, previousHash) {
            var payload = (previousHash || '0'.repeat(64)) + '|' + record.hash + '|' + record.timestamp;
            var data = new TextEncoder().encode(payload);
            var buf = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
        },
        verifyChain: async function(vault) {
            if (!vault || vault.length === 0) return {valid:true, errors:[]};
            var errors = [];
            var prevHash = '0'.repeat(64);
            for (var i = 0; i < vault.length; i++) {
                if (vault[i].chainHash) {
                    var expected = await this.computeChainHash(vault[i], prevHash);
                    if (vault[i].chainHash !== expected) {
                        errors.push({index:i, expected:expected, got:vault[i].chainHash, record:vault[i].label || vault[i].type});
                    }
                    prevHash = vault[i].chainHash;
                } else {
                    prevHash = vault[i].hash || prevHash;
                }
            }
            return {valid: errors.length === 0, errors: errors};
        }
    };

    // ── 5. Rate Limiter — prevent rapid-fire API calls ──
    var _rateLimits = {};
    S4.rateLimit = function(key, maxPerMinute) {
        maxPerMinute = maxPerMinute || 30;
        var now = Date.now();
        if (!_rateLimits[key]) _rateLimits[key] = [];
        _rateLimits[key] = _rateLimits[key].filter(function(t){ return now - t < 60000; });
        if (_rateLimits[key].length >= maxPerMinute) return false;
        _rateLimits[key].push(now);
        return true;
    };

    // ── 5b. CSRF Token System ──
    S4.csrf = (function() {
        var _token = null;
        function _generate() {
            var arr = new Uint8Array(32);
            crypto.getRandomValues(arr);
            return Array.from(arr, function(b){ return b.toString(16).padStart(2,'0'); }).join('');
        }
        return {
            getToken: function() { if (!_token) _token = _generate(); return _token; },
            refresh: function() { _token = _generate(); return _token; },
            validate: function(token) { return token && token === _token; },
            addToHeaders: function(headers) { headers = headers || {}; headers['X-CSRF-Token'] = this.getToken(); return headers; }
        };
    })();

    // ── 6. Zero-Knowledge Proof Verification (simplified) ──
    // Prove a record exists in vault without revealing content
    S4.zkVerify = async function(recordHash) {
        var exists = typeof s4Vault !== 'undefined' && s4Vault.some(function(r){ return r.hash === recordHash; });
        var proof = {
            timestamp: new Date().toISOString(),
            claim: 'Record with hash prefix ' + recordHash.substring(0,8) + '... exists in vault',
            verified: exists,
            proofHash: null
        };
        // Generate proof hash (hash of the claim + secret nonce)
        var nonce = crypto.getRandomValues(new Uint8Array(16));
        var proofData = new TextEncoder().encode(JSON.stringify(proof) + Array.from(nonce).join(''));
        var buf = await crypto.subtle.digest('SHA-256', proofData);
        proof.proofHash = Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
        return proof;
    };

    S4.register('security', {version: '1.0.0', features: ['xss-sanitizer','session-timeout','encrypted-storage','audit-chain','rate-limiter','zk-verify']});
    console.log('[S4 Security] Module loaded — 6 features active');
})();
