/* ============================================================
   S4 Ledger — Auth & Session Management Service
   v3.9.16 — User authentication, saved sessions, role-based UI
   ============================================================ */

const S4Auth = (() => {
    const SESSION_KEY = 's4_user';
    const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
    const SESSIONS_KEY = 's4_sessions';
    const PREFS_KEY = 's4_prefs';

    // ── Session Management ──
    function getSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const user = JSON.parse(raw);
            const remember = user.rememberMe !== false;
            const maxAge = remember ? SESSION_DURATION : 86400000; // 7 days or 24h
            if (Date.now() - user.loginTime > maxAge) {
                logout();
                return null;
            }
            return user;
        } catch { return null; }
    }

    function createSession(email, name, opts = {}) {
        const user = {
            id: 's4_' + Date.now().toString(36),
            email,
            name,
            role: opts.role || 'analyst',
            org: opts.org || extractOrg(email),
            loginTime: Date.now(),
            lastActive: Date.now(),
            rememberMe: opts.rememberMe !== false,
            loginMethod: opts.loginMethod || 'password',
            avatar: opts.avatar || generateAvatar(name)
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        trackSession(user);
        return user;
    }

    function updateActivity() {
        const user = getSession();
        if (user) {
            user.lastActive = Date.now();
            localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        }
    }

    function logout() {
        localStorage.removeItem(SESSION_KEY);
    }

    function isLoggedIn() {
        return getSession() !== null;
    }

    // ── Session History ──
    function trackSession(user) {
        try {
            const sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
            sessions.unshift({
                email: user.email,
                name: user.name,
                loginTime: user.loginTime,
                method: user.loginMethod,
                device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
            });
            // Keep last 20 sessions
            localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 20)));
        } catch {}
    }

    function getSessionHistory() {
        try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); }
        catch { return []; }
    }

    // ── Preferences ──
    function getPrefs() {
        try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); }
        catch { return {}; }
    }

    function setPrefs(prefs) {
        const current = getPrefs();
        localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
    }

    // ── Helpers ──
    function extractOrg(email) {
        const domain = email.split('@')[1] || '';
        if (domain.includes('.mil')) return 'Department of Defense';
        if (domain.includes('.gov')) return 'U.S. Government';
        return domain.replace(/\.(com|org|net|io)$/, '').replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    function generateAvatar(name) {
        const parts = (name || 'U').split(' ');
        return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    }

    // ── Roles ──
    const ROLES = {
        admin: { label: 'Administrator', color: '#ff6b6b', permissions: ['all'] },
        manager: { label: 'Program Manager', color: '#c9a84c', permissions: ['read', 'write', 'approve', 'export'] },
        analyst: { label: 'ILS Analyst', color: '#00aaff', permissions: ['read', 'write', 'export'] },
        auditor: { label: 'Auditor', color: '#14f195', permissions: ['read', 'export', 'audit'] },
        viewer: { label: 'Viewer', color: '#8ea4b8', permissions: ['read'] }
    };

    function getRole(user) {
        return ROLES[user?.role] || ROLES.analyst;
    }

    function hasPermission(permission) {
        const user = getSession();
        if (!user) return false;
        const role = getRole(user);
        return role.permissions.includes('all') || role.permissions.includes(permission);
    }

    // ── UI Helpers ──
    function renderAuthBadge(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const user = getSession();
        if (!user) {
            container.innerHTML = `<a href="/s4-login/" style="color:var(--accent);font-weight:600;text-decoration:none;font-size:0.85rem"><i class="fas fa-sign-in-alt"></i> Sign In</a>`;
            return;
        }
        const role = getRole(user);
        container.innerHTML = `
            <div class="s4-auth-badge" style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="document.getElementById('s4AuthMenu').classList.toggle('active')">
                <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,${role.color},${role.color}88);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.75rem;color:#fff">${user.avatar}</div>
                <div style="line-height:1.2">
                    <div style="font-weight:700;font-size:0.82rem;color:#fff">${user.name}</div>
                    <div style="font-size:0.7rem;color:${role.color}">${role.label}</div>
                </div>
                <i class="fas fa-chevron-down" style="font-size:0.65rem;color:var(--text-muted)"></i>
            </div>
            <div id="s4AuthMenu" class="s4-auth-menu">
                <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06)">
                    <div style="font-weight:700;color:#fff;font-size:0.88rem">${user.name}</div>
                    <div style="font-size:0.78rem;color:var(--text-muted)">${user.email}</div>
                    <div style="font-size:0.72rem;color:${role.color};margin-top:2px">${role.label} • ${user.org}</div>
                </div>
                <a href="/s4-login/" class="s4-auth-menu-item"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                <a href="#" onclick="S4Auth.showProfile();return false" class="s4-auth-menu-item"><i class="fas fa-user-cog"></i> Profile & Settings</a>
                <a href="#" onclick="S4Auth.showSessions();return false" class="s4-auth-menu-item"><i class="fas fa-clock"></i> Session History</a>
                <div style="border-top:1px solid rgba(255,255,255,0.06);padding:8px 16px">
                    <a href="#" onclick="S4Auth.logout();window.location.href='/s4-login/';return false" class="s4-auth-menu-item" style="color:#ff6b6b"><i class="fas fa-sign-out-alt"></i> Sign Out</a>
                </div>
            </div>`;
    }

    function showProfile() {
        const user = getSession();
        if (!user) return;
        const role = getRole(user);
        const prefs = getPrefs();
        const html = `
            <div style="padding:20px">
                <h4 style="color:var(--accent);margin-bottom:16px"><i class="fas fa-user-cog"></i> Profile & Settings</h4>
                <div style="display:grid;gap:12px">
                    <div style="background:rgba(0,170,255,0.05);border:1px solid rgba(0,170,255,0.15);border-radius:10px;padding:16px">
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                            <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,${role.color},${role.color}88);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.2rem;color:#fff">${user.avatar}</div>
                            <div><div style="font-weight:700;font-size:1.1rem">${user.name}</div><div style="font-size:0.82rem;color:var(--text-muted)">${user.email}</div></div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.82rem">
                            <div><span style="color:var(--text-muted)">Role:</span> <span style="color:${role.color}">${role.label}</span></div>
                            <div><span style="color:var(--text-muted)">Org:</span> ${user.org}</div>
                            <div><span style="color:var(--text-muted)">Login:</span> ${user.loginMethod}</div>
                            <div><span style="color:var(--text-muted)">Session:</span> ${formatTimeAgo(user.loginTime)}</div>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px">
                        <h5 style="font-size:0.9rem;margin-bottom:10px"><i class="fas fa-cog" style="color:var(--accent)"></i> Preferences</h5>
                        <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:0.85rem;cursor:pointer">
                            <input type="checkbox" ${prefs.autoSave !== false ? 'checked' : ''} onchange="S4Auth.setPrefs({autoSave:this.checked})"> Auto-save analyses
                        </label>
                        <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:0.85rem;cursor:pointer">
                            <input type="checkbox" ${prefs.notifications !== false ? 'checked' : ''} onchange="S4Auth.setPrefs({notifications:this.checked})"> Enable notifications
                        </label>
                        <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer">
                            <input type="checkbox" ${prefs.darkMode !== false ? 'checked' : ''} onchange="S4Auth.setPrefs({darkMode:this.checked})"> Dark mode (default)
                        </label>
                    </div>
                </div>
            </div>`;
        showModal(html);
    }

    function showSessions() {
        const sessions = getSessionHistory();
        const html = `
            <div style="padding:20px">
                <h4 style="color:var(--accent);margin-bottom:16px"><i class="fas fa-clock"></i> Session History</h4>
                <div style="max-height:350px;overflow-y:auto">
                    ${sessions.length ? sessions.map((s, i) => `
                        <div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.82rem">
                            <i class="fas fa-${s.device === 'Mobile' ? 'mobile-alt' : 'desktop'}" style="color:var(--accent);width:20px"></i>
                            <div style="flex:1">
                                <div style="color:#fff;font-weight:600">${s.name} <span style="color:var(--text-muted);font-weight:400">(${s.method})</span></div>
                                <div style="color:var(--text-muted);font-size:0.75rem">${s.email} • ${s.device}</div>
                            </div>
                            <div style="color:var(--text-muted);font-size:0.75rem">${formatTimeAgo(s.loginTime)}</div>
                            ${i === 0 ? '<span style="font-size:0.68rem;background:rgba(20,241,149,0.15);color:#14f195;padding:2px 6px;border-radius:4px">Current</span>' : ''}
                        </div>
                    `).join('') : '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center">No session history</div>'}
                </div>
            </div>`;
        showModal(html);
    }

    function formatTimeAgo(ts) {
        const diff = Date.now() - ts;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        return Math.floor(diff / 86400000) + 'd ago';
    }

    function showModal(html) {
        let modal = document.getElementById('s4AuthModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 's4AuthModal';
            modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(5,8,16,0.9);display:flex;align-items:center;justify-content:center;padding:1rem';
            modal.onclick = e => { if (e.target === modal) modal.remove(); };
            document.body.appendChild(modal);
        }
        modal.innerHTML = `<div style="background:#0a1020;border:1px solid rgba(0,170,255,0.2);border-radius:16px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;position:relative">
            <button onclick="document.getElementById('s4AuthModal').remove()" style="position:absolute;top:12px;right:16px;background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer">&times;</button>
            ${html}
        </div>`;
    }

    // ── Global Auth CSS ──
    function injectStyles() {
        if (document.getElementById('s4-auth-styles')) return;
        const style = document.createElement('style');
        style.id = 's4-auth-styles';
        style.textContent = `
            .s4-auth-menu{display:none;position:absolute;right:0;top:calc(100% + 8px);background:#0a1020;border:1px solid rgba(0,170,255,0.2);border-radius:12px;min-width:240px;z-index:9999;box-shadow:0 12px 40px rgba(0,0,0,0.5);overflow:hidden}
            .s4-auth-menu.active{display:block}
            .s4-auth-menu-item{display:flex;align-items:center;gap:10px;padding:10px 16px;color:var(--text-secondary,#c8d6e5);font-size:0.85rem;text-decoration:none;transition:all 0.15s}
            .s4-auth-menu-item:hover{background:rgba(0,170,255,0.08);color:#00aaff}
            .s4-auth-menu-item i{width:16px;text-align:center;font-size:0.82rem}
        `;
        document.head.appendChild(style);
    }

    // Auto-init
    document.addEventListener('DOMContentLoaded', () => {
        injectStyles();
        updateActivity();
        // Close auth menu on outside click
        document.addEventListener('click', e => {
            const menu = document.getElementById('s4AuthMenu');
            if (menu && !e.target.closest('.s4-auth-badge') && !e.target.closest('.s4-auth-menu')) {
                menu.classList.remove('active');
            }
        });
    });

    return {
        getSession, createSession, updateActivity, logout, isLoggedIn,
        getSessionHistory, getPrefs, setPrefs, getRole, hasPermission,
        renderAuthBadge, showProfile, showSessions, ROLES
    };
})();
