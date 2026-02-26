// S4 Ledger Demo — wallet-toggle
// Extracted from monolith lines 1935-1955
// 19 lines

        // Show SLS Economic Flow panel only when Wallet tab is active
        document.addEventListener('DOMContentLoaded', function() {
            var walletTab = document.querySelector('a[href="#tabWallet"]');
            if (walletTab) {
                walletTab.addEventListener('shown.bs.tab', function() {
                    var p = document.getElementById('demoPanel');
                    if (p) p.style.display = 'block';
                });
            }
            // Hide panel when any OTHER tab is activated
            document.querySelectorAll('.nav-link[data-bs-toggle="pill"]').forEach(function(tab) {
                if (tab.getAttribute('href') !== '#tabWallet') {
                    tab.addEventListener('shown.bs.tab', function() {
                        var p = document.getElementById('demoPanel');
                        if (p) p.style.display = 'none';
                    });
                }
            });
        });
