// S4 Ledger Demo — scroll
// Extracted from monolith lines 12769-13006
// 236 lines

// Scroll progress bar
window.addEventListener('scroll', function() {
    var scroll = window.scrollY;
    var height = document.documentElement.scrollHeight - window.innerHeight;
    var bar = document.getElementById('scrollProgress');
    if (bar) bar.style.width = (height > 0 ? (scroll / height * 100) : 0) + '%';
    var btn = document.getElementById('backToTop');
    if (btn) { if (scroll > 400) { btn.style.opacity='1'; btn.style.visibility='visible'; } else { btn.style.opacity='0'; btn.style.visibility='hidden'; } }
});
// Reveal on scroll
var revealObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal-demo').forEach(function(el) { revealObserver.observe(el); });

// ═══════════════════════════════════════════════════════════════════
//  MY WALLET — Balance, Credentials, Buy SLS
// ═══════════════════════════════════════════════════════════════════

function loadWalletData() {
    const walletData = JSON.parse(localStorage.getItem('s4_wallet') || 'null');
    const noWallet = document.getElementById('walletNoWallet');
    const creds = document.getElementById('walletCredentials');

    if (!walletData || !walletData.wallet) {
        if (noWallet) noWallet.style.display = 'block';
        if (creds) creds.style.display = 'none';
        return;
    }

    if (noWallet) noWallet.style.display = 'none';
    if (creds) creds.style.display = 'block';

    // Display credentials
    document.getElementById('walletAddress').textContent = walletData.wallet.address;
    document.getElementById('seedRevealed').textContent = walletData.wallet.seed;

    const explorerBase = (walletData.wallet.network === 'mainnet')
        ? 'https://livenet.xrpl.org/accounts/'
        : 'https://testnet.xrpl.org/accounts/';
    document.getElementById('demoWalletExplorer').href = explorerBase + walletData.wallet.address;

    // Fetch live balance
    fetchWalletBalance(walletData.wallet.address);
}

async function fetchWalletBalance(address) {
    try {
        // NETWORK_DEPENDENT: Wallet balance requires XRPL connectivity
        const resp = await fetch('/api/wallet/balance?address=' + encodeURIComponent(address));
        const data = await resp.json();
        if (data.error) {
            document.getElementById('walletSLSBalance').textContent = '0';
            document.getElementById('walletAnchors').textContent = '0';
            document.getElementById('walletXRP').textContent = '0';
            return;
        }
        document.getElementById('walletSLSBalance').textContent = parseFloat(data.sls_balance).toLocaleString();
        document.getElementById('walletSLSUSD').textContent = (parseFloat(data.sls_balance) * data.sls_price_usd).toFixed(2);
        document.getElementById('walletAnchors').textContent = data.anchors_available.toLocaleString();
        document.getElementById('walletXRP').textContent = data.xrp_balance.toFixed(2);
        document.getElementById('walletNetwork').textContent = 'XRPL ' + data.network.charAt(0).toUpperCase() + data.network.slice(1);
    } catch (e) {
        console.log('Balance fetch error:', e);
        // In demo mode, populate wallet from session state
        if (_demoSession && _demoSession.subscription) {
            var _alloc = _demoSession.subscription.sls_allocation || 25000;
            var _spent = (typeof stats !== 'undefined') ? (stats.slsFees || 0) : 0;
            var _rem = Math.round((_alloc - _spent) * 100) / 100;
            var wBal = document.getElementById('walletSLSBalance');
            if (wBal) wBal.textContent = _rem.toLocaleString(undefined,{maximumFractionDigits:2});
            var wAnch = document.getElementById('walletAnchors');
            if (wAnch) wAnch.textContent = Math.floor(_rem / 0.01).toLocaleString();
            var wXrp = document.getElementById('walletXRP');
            if (wXrp) wXrp.textContent = '12.00';
            var wNet = document.getElementById('walletNetwork');
            if (wNet) wNet.textContent = 'XRPL Mainnet (Demo)';
        }
    }
}

function toggleSeed() {
    const masked = document.getElementById('seedMasked');
    const revealed = document.getElementById('seedRevealed');
    const btn = document.getElementById('seedToggleBtn');
    if (revealed.style.display === 'none') {
        revealed.style.display = 'inline';
        masked.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide';
    } else {
        revealed.style.display = 'none';
        masked.style.display = 'inline';
        btn.innerHTML = '<i class="fas fa-eye"></i> Show';
    }
}

function copyWalletField(id) {
    const text = document.getElementById(id).textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById(id).parentElement.querySelector('button');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => { btn.innerHTML = orig; }, 1200);
    });
}

function setSLSAmount(usd, btn) {
    document.getElementById('slsUsdInput').value = usd;
    updateSLSPreview();
    // Highlight selected button
    document.querySelectorAll('.sls-amt-btn').forEach(b => {
        b.style.borderColor = 'var(--border)';
        b.style.background = 'var(--surface)';
        b.style.color = 'var(--steel)';
    });
    if (btn) {
        btn.style.borderColor = 'rgba(0,170,255,0.5)';
        btn.style.background = 'rgba(0,170,255,0.08)';
        btn.style.color = 'var(--accent)';
    }
}

function updateSLSPreview() {
    const usd = parseFloat(document.getElementById('slsUsdInput').value) || 0;
    const slsTokens = Math.round(usd / 0.01);
    document.getElementById('slsPreviewTokens').textContent = slsTokens.toLocaleString() + ' SLS';
    document.getElementById('slsPreviewAnchors').textContent = (slsTokens * 100).toLocaleString();
}

async function handleBuySLS() {
    const walletData = JSON.parse(localStorage.getItem('s4_wallet') || 'null');
    const resultEl = document.getElementById('buySLSResult');
    const btn = document.getElementById('buySLSBtn');

    if (!walletData || !walletData.wallet) {
        resultEl.style.display = 'block';
        resultEl.style.background = 'rgba(255,51,51,0.08)';
        resultEl.style.border = '1px solid rgba(255,51,51,0.2)';
        resultEl.style.color = '#ff6b6b';
        resultEl.innerHTML = '<i class="fas fa-exclamation-circle" style="margin-right:6px"></i>Please <a href="/s4-login/" style="color:var(--accent)">create an account</a> first to get a wallet.';
        return;
    }

    const usd = parseFloat(document.getElementById('slsUsdInput').value) || 0;
    if (usd <= 0) {
        resultEl.style.display = 'block';
        resultEl.style.background = 'rgba(255,51,51,0.08)';
        resultEl.style.border = '1px solid rgba(255,51,51,0.2)';
        resultEl.style.color = '#ff6b6b';
        resultEl.textContent = 'Please enter a valid amount.';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    resultEl.style.display = 'none';

    try {
        // NETWORK_DEPENDENT: SLS purchase requires XRPL connectivity
        const resp = await fetch('/api/wallet/buy-sls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wallet_address: walletData.wallet.address,
                usd_amount: usd,
                payment_method: 'card'
            })
        });
        const data = await resp.json();

        if (data.error) {
            resultEl.style.display = 'block';
            resultEl.style.background = 'rgba(255,51,51,0.08)';
            resultEl.style.border = '1px solid rgba(255,51,51,0.2)';
            resultEl.style.color = '#ff6b6b';
            resultEl.innerHTML = '<i class="fas fa-exclamation-circle" style="margin-right:6px"></i>' + data.error;
        } else {
            resultEl.style.display = 'block';
            resultEl.style.background = 'rgba(0,170,255,0.2)';
            resultEl.style.border = '1px solid rgba(0,170,255,0.2)';
            resultEl.style.color = '#00aaff';
            resultEl.innerHTML = '<i class="fas fa-check-circle" style="margin-right:6px"></i>Purchased ' + parseFloat(data.purchase.sls_received).toLocaleString() + ' SLS for $' + data.purchase.usd_paid.toFixed(2) + '! <a href="' + data.explorer_url + '" target="_blank" style="color:var(--accent);margin-left:8px">View TX <i class="fas fa-external-link-alt" style="font-size:0.7rem"></i></a>';
            // Refresh balance
            fetchWalletBalance(walletData.wallet.address);
        }
    } catch (e) {
        resultEl.style.display = 'block';
        resultEl.style.background = 'rgba(255,51,51,0.08)';
        resultEl.style.border = '1px solid rgba(255,51,51,0.2)';
        resultEl.style.color = '#ff6b6b';
        resultEl.innerHTML = '<i class="fas fa-exclamation-circle" style="margin-right:6px"></i>Network error: ' + e.message;
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-credit-card" style="margin-right:6px"></i> Purchase with Card';
}

// SLS Usage Chart range selector
function setChartRange(range) {
    document.querySelectorAll('.chart-range-btn').forEach(b => {
        b.style.background = 'var(--surface)';
        b.style.border = '1px solid var(--border)';
        b.style.color = 'var(--steel)';
        b.style.fontWeight = '400';
    });
    const btn = document.getElementById('chart' + range.charAt(0).toUpperCase() + range.slice(1));
    if (btn) {
        btn.style.background = 'rgba(26,58,92,0.2)';
        btn.style.border = '1px solid rgba(201,168,76,0.3)';
        btn.style.color = '#00aaff';
        btn.style.fontWeight = '700';
    }
    // Chart data updates when persistent backend is connected
    // For now, show the range label
    const overlay = document.getElementById('chartOverlay');
    if (overlay) {
        overlay.querySelector('p').textContent = 'Showing ' + range + ' usage data. Chart populates as records are anchored.';
    }
}

// Load wallet on tab switch
// Auto-load metrics on session start — only if workspace is visible
setTimeout(function() {
    var ws = document.getElementById('platformWorkspace');
    if (ws && ws.style.display === 'block' && typeof loadPerformanceMetrics === 'function') {
        loadPerformanceMetrics().catch(function(e) { console.warn('[S4] metrics load:', e); });
    }
}, 2000);

document.addEventListener('shown.bs.tab', function(e) {
    if (e.target.getAttribute('href') === '#tabWallet') loadWalletData();
});

// Auto-load if #tabWallet in URL
if (window.location.hash === '#tabWallet') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(loadWalletData, 500));
}
