// S4 Ledger — Web Vitals Tracking (Core Web Vitals)
// Lightweight observer using PerformanceObserver API (no external deps)
// Reports LCP, FID, CLS, INP, TTFB to S4.vitals namespace

(function() {
    'use strict';

    var vitals = { lcp: null, fid: null, cls: 0, inp: null, ttfb: null, entries: [] };
    var S4 = window.S4 = window.S4 || {};
    S4.vitals = vitals;

    function _log(name, value) {
        vitals.entries.push({ name: name, value: Math.round(value * 100) / 100, ts: Date.now() });
    }

    // TTFB — Time to First Byte
    try {
        var nav = performance.getEntriesByType('navigation');
        if (nav && nav[0]) {
            vitals.ttfb = Math.round(nav[0].responseStart);
            _log('TTFB', vitals.ttfb);
        }
    } catch(e) { /* navigation timing not available */ }

    // LCP — Largest Contentful Paint
    try {
        if ('PerformanceObserver' in window) {
            var lcpObserver = new PerformanceObserver(function(list) {
                var entries = list.getEntries();
                var last = entries[entries.length - 1];
                if (last) {
                    vitals.lcp = Math.round(last.startTime);
                    _log('LCP', vitals.lcp);
                }
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        }
    } catch(e) { /* LCP not supported */ }

    // FID — First Input Delay
    try {
        if ('PerformanceObserver' in window) {
            var fidObserver = new PerformanceObserver(function(list) {
                var entries = list.getEntries();
                if (entries[0]) {
                    vitals.fid = Math.round(entries[0].processingStart - entries[0].startTime);
                    _log('FID', vitals.fid);
                    fidObserver.disconnect();
                }
            });
            fidObserver.observe({ type: 'first-input', buffered: true });
        }
    } catch(e) { /* FID not supported */ }

    // CLS — Cumulative Layout Shift
    try {
        if ('PerformanceObserver' in window) {
            var clsObserver = new PerformanceObserver(function(list) {
                var entries = list.getEntries();
                entries.forEach(function(entry) {
                    if (!entry.hadRecentInput) {
                        vitals.cls += entry.value;
                    }
                });
                vitals.cls = Math.round(vitals.cls * 10000) / 10000;
                _log('CLS', vitals.cls);
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
        }
    } catch(e) { /* CLS not supported */ }

    // INP — Interaction to Next Paint
    try {
        if ('PerformanceObserver' in window) {
            var inpObserver = new PerformanceObserver(function(list) {
                var entries = list.getEntries();
                entries.forEach(function(entry) {
                    var dur = entry.duration;
                    if (vitals.inp === null || dur > vitals.inp) {
                        vitals.inp = Math.round(dur);
                        _log('INP', vitals.inp);
                    }
                });
            });
            inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 40 });
        }
    } catch(e) { /* INP not supported */ }

    // API: S4.vitals.summary() — returns formatted report
    S4.vitals.summary = function() {
        return {
            TTFB: vitals.ttfb !== null ? vitals.ttfb + 'ms' : 'n/a',
            LCP: vitals.lcp !== null ? vitals.lcp + 'ms' : 'n/a',
            FID: vitals.fid !== null ? vitals.fid + 'ms' : 'n/a',
            CLS: vitals.cls.toFixed(4),
            INP: vitals.inp !== null ? vitals.inp + 'ms' : 'n/a',
            grade: _grade()
        };
    };

    function _grade() {
        var score = 0, count = 0;
        if (vitals.lcp !== null) { score += vitals.lcp <= 2500 ? 1 : vitals.lcp <= 4000 ? 0.5 : 0; count++; }
        if (vitals.fid !== null) { score += vitals.fid <= 100 ? 1 : vitals.fid <= 300 ? 0.5 : 0; count++; }
        if (vitals.cls !== null) { score += vitals.cls <= 0.1 ? 1 : vitals.cls <= 0.25 ? 0.5 : 0; count++; }
        if (vitals.inp !== null) { score += vitals.inp <= 200 ? 1 : vitals.inp <= 500 ? 0.5 : 0; count++; }
        if (count === 0) return 'n/a';
        var pct = Math.round((score / count) * 100);
        return pct >= 90 ? 'Good' : pct >= 50 ? 'Needs Improvement' : 'Poor';
    }

    // ── Threshold Alerts (6.3) ──────────────────────────────────────
    var _alertFired = {};
    function _checkThreshold(metric, value, good, poor) {
        if (_alertFired[metric]) return;
        if (value > poor) {
            _alertFired[metric] = true;
            console.warn('[S4 Vitals] POOR ' + metric + ': ' + value + ' (threshold: ' + poor + ')');
            if (typeof S4 !== 'undefined' && S4.toast) {
                S4.toast('Performance: ' + metric + ' is poor (' + Math.round(value) + 'ms)', 'warning', 6000);
            }
        }
    }

    // Check thresholds as values arrive
    var _origLcp = Object.getOwnPropertyDescriptor(vitals, 'lcp') || {};
    S4.vitals._checkAll = function() {
        if (vitals.lcp !== null) _checkThreshold('LCP', vitals.lcp, 2500, 4000);
        if (vitals.fid !== null) _checkThreshold('FID', vitals.fid, 100, 300);
        if (vitals.inp !== null) _checkThreshold('INP', vitals.inp, 200, 500);
        if (vitals.cls > 0.25) _checkThreshold('CLS', vitals.cls * 1000, 100, 250);
    };
    // Run threshold checks 10s after load (all CWV should be collected by then)
    setTimeout(function() { S4.vitals._checkAll(); }, 10000);

    // ── Beacon Report (6.3) — send vitals to /api/vitals on unload ──
    window.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden' && vitals.lcp !== null) {
            var payload = JSON.stringify({
                ttfb: vitals.ttfb, lcp: vitals.lcp, fid: vitals.fid,
                cls: parseFloat(vitals.cls.toFixed(4)), inp: vitals.inp,
                grade: _grade(), url: location.pathname
            });
            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/vitals', payload);
            }
        }
    });
})();
