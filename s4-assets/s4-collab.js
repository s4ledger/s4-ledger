/* ============================================================
   S4 Ledger — Collaboration & Notification Module
   v3.9.17 — Team action items, comments, email notifications
   ============================================================ */

const S4Collab = (() => {
    // ── Team Members (simulated) ──
    const TEAM_MEMBERS = [
        { id: 'current', name: 'You', email: '', role: 'analyst' },
        { id: 'tm1', name: 'CDR Johnson', email: 'johnson@navy.mil', role: 'manager' },
        { id: 'tm2', name: 'LCDR Williams', email: 'williams@navy.mil', role: 'analyst' },
        { id: 'tm3', name: 'LT Martinez', email: 'martinez@navy.mil', role: 'analyst' },
        { id: 'tm4', name: 'CWO3 Thompson', email: 'thompson@navy.mil', role: 'auditor' },
        { id: 'tm5', name: 'Ms. Chen', email: 'chen@contractor.com', role: 'analyst' },
        { id: 'tm6', name: 'Mr. Davis', email: 'davis@navsea.navy.mil', role: 'manager' }
    ];

    function getTeamMembers() {
        const user = typeof S4Auth !== 'undefined' ? S4Auth.getSession() : null;
        if (user) TEAM_MEMBERS[0].name = user.name;
        if (user) TEAM_MEMBERS[0].email = user.email;
        return TEAM_MEMBERS;
    }

    // ── Assignee Picker Widget ──
    function renderAssigneePicker(containerId, selectedId, onChange) {
        const c = document.getElementById(containerId);
        if (!c) return;
        const members = getTeamMembers();
        c.innerHTML = `
            <select id="${containerId}_select" style="background:rgba(5,8,16,0.95);border:1px solid rgba(0,170,255,0.2);border-radius:8px;padding:8px 12px;color:#e0e8f0;font-size:0.82rem;width:100%;font-family:inherit">
                <option value="">Unassigned</option>
                ${members.map(m => `<option value="${m.id}" ${m.id === selectedId ? 'selected' : ''}>${m.name} (${m.role})</option>`).join('')}
            </select>`;
        const sel = c.querySelector('select');
        sel.onchange = () => {
            const member = members.find(m => m.id === sel.value);
            if (onChange) onChange(member || null);
        };
    }

    // ── Action Item Assignment Modal ──
    function showAssignModal(item, onSave) {
        const members = getTeamMembers();
        const modal = document.createElement('div');
        modal.id = 's4CollabModal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(5,8,16,0.92);display:flex;align-items:center;justify-content:center;padding:1rem';
        modal.onclick = e => { if (e.target === modal) modal.remove(); };

        modal.innerHTML = `
        <div style="background:#0a1020;border:1px solid rgba(0,170,255,0.2);border-radius:16px;max-width:480px;width:100%;padding:24px;position:relative">
            <button onclick="document.getElementById('s4CollabModal').remove()" style="position:absolute;top:12px;right:16px;background:none;border:none;color:var(--text-muted,#8ea4b8);font-size:1.2rem;cursor:pointer">&times;</button>
            <h4 style="color:#00aaff;margin-bottom:16px;font-size:1rem"><i class="fas fa-user-plus" style="margin-right:6px"></i>Assign Action Item</h4>
            
            <div style="margin-bottom:12px">
                <label style="display:block;font-weight:600;color:#8ea4b8;font-size:0.82rem;margin-bottom:4px">Title</label>
                <input id="assignTitle" type="text" value="${(item?.title || '').replace(/"/g, '&quot;')}" style="width:100%;background:rgba(5,8,16,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;color:#fff;font-family:inherit;font-size:0.88rem">
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
                <div>
                    <label style="display:block;font-weight:600;color:#8ea4b8;font-size:0.82rem;margin-bottom:4px">Assign To</label>
                    <select id="assignTo" style="width:100%;background:rgba(5,8,16,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;color:#fff;font-family:inherit;font-size:0.85rem">
                        <option value="">Unassigned</option>
                        ${members.map(m => `<option value="${m.id}" ${m.id === item?.assigneeId ? 'selected' : ''}>${m.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="display:block;font-weight:600;color:#8ea4b8;font-size:0.82rem;margin-bottom:4px">Priority</label>
                    <select id="assignPriority" style="width:100%;background:rgba(5,8,16,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;color:#fff;font-family:inherit;font-size:0.85rem">
                        <option value="critical" ${item?.priority === 'critical' ? 'selected' : ''}>Critical</option>
                        <option value="high" ${item?.priority === 'high' ? 'selected' : ''}>High</option>
                        <option value="medium" ${!item?.priority || item?.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="low" ${item?.priority === 'low' ? 'selected' : ''}>Low</option>
                    </select>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
                <div>
                    <label style="display:block;font-weight:600;color:#8ea4b8;font-size:0.82rem;margin-bottom:4px">Due Date</label>
                    <input id="assignDue" type="date" value="${item?.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : ''}" style="width:100%;background:rgba(5,8,16,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;color:#fff;font-family:inherit;font-size:0.85rem">
                </div>
                <div>
                    <label style="display:block;font-weight:600;color:#8ea4b8;font-size:0.82rem;margin-bottom:4px">Status</label>
                    <select id="assignStatus" style="width:100%;background:rgba(5,8,16,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;color:#fff;font-family:inherit;font-size:0.85rem">
                        <option value="open" ${!item?.status || item?.status === 'open' ? 'selected' : ''}>Open</option>
                        <option value="in-progress" ${item?.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="blocked" ${item?.status === 'blocked' ? 'selected' : ''}>Blocked</option>
                        <option value="closed" ${item?.status === 'closed' ? 'selected' : ''}>Closed</option>
                    </select>
                </div>
            </div>

            <div style="margin-bottom:16px">
                <label style="display:block;font-weight:600;color:#8ea4b8;font-size:0.82rem;margin-bottom:4px">Notes</label>
                <textarea id="assignNotes" rows="3" style="width:100%;background:rgba(5,8,16,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;color:#fff;font-family:inherit;font-size:0.85rem;resize:vertical">${item?.description || ''}</textarea>
            </div>

            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
                <input type="checkbox" id="assignNotify" checked>
                <label for="assignNotify" style="font-size:0.82rem;color:#8ea4b8;cursor:pointer"><i class="fas fa-bell" style="color:#c9a84c;margin-right:4px"></i>Notify assignee via email</label>
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button onclick="document.getElementById('s4CollabModal').remove()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 20px;color:#8ea4b8;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>
                <button id="assignSaveBtn" style="background:linear-gradient(135deg,#00aaff,#0088cc);border:none;border-radius:8px;padding:10px 24px;color:#fff;font-weight:700;cursor:pointer;font-family:inherit">
                    <i class="fas fa-save" style="margin-right:4px"></i>Save & Assign
                </button>
            </div>
        </div>`;

        document.body.appendChild(modal);

        document.getElementById('assignSaveBtn').onclick = async () => {
            const assigneeId = document.getElementById('assignTo').value;
            const member = members.find(m => m.id === assigneeId);
            const result = {
                id: item?.id,
                title: document.getElementById('assignTitle').value,
                priority: document.getElementById('assignPriority').value,
                dueDate: document.getElementById('assignDue').value ? new Date(document.getElementById('assignDue').value).getTime() : null,
                status: document.getElementById('assignStatus').value,
                description: document.getElementById('assignNotes').value,
                assignee: member?.name || null,
                assigneeEmail: member?.email || null,
                assigneeId: assigneeId || null
            };

            // Save via S4Data if available
            if (typeof S4Data !== 'undefined') {
                await S4Data.saveActionItem(result);
                if (document.getElementById('assignNotify').checked && member) {
                    await S4Data.notify(
                        'Action Item Assigned',
                        `"${result.title}" assigned to ${member.name}`,
                        { type: 'assignment' }
                    );
                }
            }

            // Simulate email notification
            if (document.getElementById('assignNotify').checked && member && member.email) {
                showNotificationToast(`Notification sent to ${member.name} (${member.email})`);
            }

            if (onSave) onSave(result);
            modal.remove();
        };
    }

    // ── Comment Thread Widget ──
    function renderCommentThread(containerId, recordId) {
        const c = document.getElementById(containerId);
        if (!c) return;

        const renderComments = async () => {
            const comments = typeof S4Data !== 'undefined' ? await S4Data.getComments(recordId) : [];
            const user = typeof S4Auth !== 'undefined' ? S4Auth.getSession() : null;

            c.innerHTML = `
            <div style="border:1px solid rgba(0,170,255,0.15);border-radius:10px;overflow:hidden">
                <div style="background:rgba(0,170,255,0.06);padding:10px 14px;font-weight:700;font-size:0.85rem;color:#00aaff;border-bottom:1px solid rgba(0,170,255,0.1)">
                    <i class="fas fa-comments" style="margin-right:6px"></i>Discussion (${comments.length})
                </div>
                <div style="max-height:250px;overflow-y:auto;padding:10px 14px">
                    ${comments.length ? comments.map(c => `
                        <div style="margin-bottom:10px;padding:8px;background:rgba(255,255,255,0.03);border-radius:8px">
                            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                                <span style="font-weight:600;font-size:0.82rem;color:#fff">${c.author}</span>
                                <span style="font-size:0.72rem;color:#8ea4b8">${formatTime(c.timestamp)}</span>
                            </div>
                            <div style="font-size:0.82rem;color:#c8d6e5">${c.text}</div>
                        </div>
                    `).join('') : '<div style="color:#8ea4b8;font-size:0.82rem;text-align:center;padding:20px">No comments yet</div>'}
                </div>
                <div style="padding:10px 14px;border-top:1px solid rgba(255,255,255,0.04);display:flex;gap:8px">
                    <input id="${containerId}_input" type="text" placeholder="Add a comment..." style="flex:1;background:rgba(5,8,16,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;color:#fff;font-family:inherit;font-size:0.82rem">
                    <button id="${containerId}_btn" style="background:linear-gradient(135deg,#00aaff,#0088cc);border:none;border-radius:8px;padding:8px 14px;color:#fff;font-weight:600;cursor:pointer;font-size:0.82rem;font-family:inherit"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>`;

            const input = document.getElementById(`${containerId}_input`);
            const btn = document.getElementById(`${containerId}_btn`);
            const submit = async () => {
                const text = input.value.trim();
                if (!text) return;
                if (typeof S4Data !== 'undefined') {
                    await S4Data.addComment(recordId, text, user?.name || 'Anonymous');
                }
                input.value = '';
                renderComments();
            };
            btn.onclick = submit;
            input.onkeypress = e => { if (e.key === 'Enter') submit(); };
        };

        renderComments();
    }

    // ── Notification Toast ──
    function showNotificationToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.style.cssText = `position:fixed;top:80px;right:20px;z-index:10001;background:${type === 'error' ? '#ff3333' : '#14f195'};color:${type === 'error' ? '#fff' : '#000'};padding:12px 20px;border-radius:10px;font-weight:600;font-size:0.85rem;box-shadow:0 8px 30px rgba(0,0,0,0.3);animation:slideIn 0.3s ease;font-family:'Plus Jakarta Sans',sans-serif`;
        toast.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}" style="margin-right:6px"></i>${message}`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
    }

    function formatTime(ts) {
        const diff = Date.now() - ts;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        return new Date(ts).toLocaleDateString();
    }

    return { getTeamMembers, renderAssigneePicker, showAssignModal, renderCommentThread, showNotificationToast };
})();
