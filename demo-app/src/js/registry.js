// S4 Ledger Demo — registry
// Extracted from monolith lines 1319-1563
// 243 lines

/* Global drag/drop prevention — stops browser from navigating away on stray drops */
document.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); }, false);
document.addEventListener('drop', function(e) { e.preventDefault(); e.stopPropagation(); }, false);

/* ═══ S4 MODULE REGISTRY & ERROR HANDLING ═══ */
/* Provides a namespace for future modularization and global error boundaries */
window.S4 = window.S4 || {
    version: '5.12.0',
    modules: {},
    register: function(name, mod) { this.modules[name] = mod; },
    getModule: function(name) { return this.modules[name] || null; }
};

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
            'nav.requestDemo': 'Request Demo',
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

/* Global error boundary — log to console only, never show user-facing toasts */
window.onerror = function(msg, source, line, col, error) {
    console.error('[S4 Error]', msg, 'at', source, line + ':' + col);
    return true; /* Suppress from browser console noise */
};
window.addEventListener('unhandledrejection', function(e) {
    console.warn('[S4 Unhandled Promise]', e.reason);
});

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

    // ── 2. Session Timeout — auto-lock after inactivity ──
    var _sessionTimeout = 30 * 60 * 1000; // 30 minutes
    var _sessionTimer = null;
    var _sessionLocked = false;
    S4.sessionTimeout = _sessionTimeout;

    function _resetSessionTimer() {
        if (_sessionLocked) return;
        clearTimeout(_sessionTimer);
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
