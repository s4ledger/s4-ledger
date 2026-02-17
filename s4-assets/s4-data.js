/* ============================================================
   S4 Ledger — Persistent Data Layer (IndexedDB + localStorage)
   v3.9.16 — Save analyses, action items, vault records, settings
   ============================================================ */

const S4Data = (() => {
    const DB_NAME = 's4ledger_db';
    const DB_VERSION = 1;
    let db = null;

    // ── IndexedDB Setup ──
    function openDB() {
        return new Promise((resolve, reject) => {
            if (db) { resolve(db); return; }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = e => {
                const d = e.target.result;
                // Analyses store
                if (!d.objectStoreNames.contains('analyses')) {
                    const store = d.createObjectStore('analyses', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp');
                    store.createIndex('program', 'program');
                    store.createIndex('userId', 'userId');
                }
                // Action items store
                if (!d.objectStoreNames.contains('actionItems')) {
                    const store = d.createObjectStore('actionItems', { keyPath: 'id' });
                    store.createIndex('status', 'status');
                    store.createIndex('assignee', 'assignee');
                    store.createIndex('dueDate', 'dueDate');
                    store.createIndex('analysisId', 'analysisId');
                }
                // Vault records store
                if (!d.objectStoreNames.contains('vault')) {
                    const store = d.createObjectStore('vault', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp');
                    store.createIndex('branch', 'branch');
                    store.createIndex('type', 'type');
                }
                // Settings/config store
                if (!d.objectStoreNames.contains('settings')) {
                    d.createObjectStore('settings', { keyPath: 'key' });
                }
                // Collaboration store
                if (!d.objectStoreNames.contains('comments')) {
                    const store = d.createObjectStore('comments', { keyPath: 'id' });
                    store.createIndex('recordId', 'recordId');
                    store.createIndex('timestamp', 'timestamp');
                }
                // Notifications store
                if (!d.objectStoreNames.contains('notifications')) {
                    const store = d.createObjectStore('notifications', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp');
                    store.createIndex('read', 'read');
                }
            };
            req.onsuccess = e => { db = e.target.result; resolve(db); };
            req.onerror = e => { console.error('S4Data: DB error', e); reject(e); };
        });
    }

    // ── Generic CRUD Operations ──
    async function put(storeName, record) {
        const d = await openDB();
        return new Promise((resolve, reject) => {
            const tx = d.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).put(record);
            tx.oncomplete = () => resolve(record);
            tx.onerror = e => reject(e);
        });
    }

    async function get(storeName, id) {
        const d = await openDB();
        return new Promise((resolve, reject) => {
            const req = d.transaction(storeName, 'readonly').objectStore(storeName).get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = e => reject(e);
        });
    }

    async function getAll(storeName, indexName, query) {
        const d = await openDB();
        return new Promise((resolve, reject) => {
            const store = d.transaction(storeName, 'readonly').objectStore(storeName);
            const source = indexName ? store.index(indexName) : store;
            const req = query ? source.getAll(query) : source.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = e => reject(e);
        });
    }

    async function remove(storeName, id) {
        const d = await openDB();
        return new Promise((resolve, reject) => {
            const tx = d.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = e => reject(e);
        });
    }

    async function count(storeName) {
        const d = await openDB();
        return new Promise((resolve, reject) => {
            const req = d.transaction(storeName, 'readonly').objectStore(storeName).count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = e => reject(e);
        });
    }

    // ── Analyses ──
    async function saveAnalysis(data) {
        const record = {
            id: data.id || 'analysis_' + Date.now().toString(36),
            timestamp: Date.now(),
            userId: data.userId || (typeof S4Auth !== 'undefined' ? S4Auth.getSession()?.id : null),
            program: data.program || 'Unknown',
            platform: data.platform || '',
            readiness: data.readiness || 0,
            gaps: data.gaps || [],
            findings: data.findings || [],
            documents: data.documents || [],
            actionItems: data.actionItems || [],
            summary: data.summary || '',
            status: data.status || 'complete'
        };
        await put('analyses', record);
        notify('Analysis saved', `${record.program} — ${record.readiness}% readiness`);
        return record;
    }

    async function getAnalyses(limit = 50) {
        const all = await getAll('analyses');
        return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    }

    async function getAnalysis(id) {
        return get('analyses', id);
    }

    // ── Action Items ──
    async function saveActionItem(item) {
        const record = {
            id: item.id || 'ai_' + Date.now().toString(36),
            analysisId: item.analysisId || null,
            title: item.title,
            description: item.description || '',
            status: item.status || 'open',
            priority: item.priority || 'medium',
            assignee: item.assignee || null,
            assigneeEmail: item.assigneeEmail || null,
            dueDate: item.dueDate || null,
            created: item.created || Date.now(),
            updated: Date.now(),
            comments: item.comments || [],
            tags: item.tags || []
        };
        await put('actionItems', record);
        return record;
    }

    async function getActionItems(filters = {}) {
        let items = await getAll('actionItems');
        if (filters.status) items = items.filter(i => i.status === filters.status);
        if (filters.assignee) items = items.filter(i => i.assignee === filters.assignee);
        if (filters.analysisId) items = items.filter(i => i.analysisId === filters.analysisId);
        return items.sort((a, b) => {
            const prio = { critical: 0, high: 1, medium: 2, low: 3 };
            return (prio[a.priority] || 2) - (prio[b.priority] || 2);
        });
    }

    async function updateActionItemStatus(id, status) {
        const item = await get('actionItems', id);
        if (item) {
            item.status = status;
            item.updated = Date.now();
            await put('actionItems', item);
        }
        return item;
    }

    // ── Vault Records ──
    async function saveVaultRecord(record) {
        const entry = {
            id: record.id || 'vault_' + Date.now().toString(36),
            timestamp: record.timestamp || Date.now(),
            type: record.type || 'record',
            branch: record.branch || 'JOINT',
            label: record.label || 'Untitled Record',
            hash: record.hash || '',
            txHash: record.txHash || '',
            content: record.content || '',
            icon: record.icon || '<i class="fas fa-clipboard-list"></i>',
            source: record.source || 'manual',
            metadata: record.metadata || {}
        };
        await put('vault', entry);
        return entry;
    }

    async function getVaultRecords(filters = {}) {
        let records = await getAll('vault');
        if (filters.branch) records = records.filter(r => r.branch === filters.branch);
        if (filters.type) records = records.filter(r => r.type === filters.type);
        return records.sort((a, b) => b.timestamp - a.timestamp);
    }

    // ── Notifications ──
    async function notify(title, body, opts = {}) {
        const notification = {
            id: 'notif_' + Date.now().toString(36),
            title, body,
            type: opts.type || 'info',
            read: false,
            timestamp: Date.now(),
            actionUrl: opts.actionUrl || null
        };
        await put('notifications', notification);
        // Dispatch event for real-time UI updates
        window.dispatchEvent(new CustomEvent('s4:notification', { detail: notification }));
        return notification;
    }

    async function getNotifications(unreadOnly = false) {
        let items = await getAll('notifications');
        if (unreadOnly) items = items.filter(n => !n.read);
        return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
    }

    async function markRead(id) {
        const n = await get('notifications', id);
        if (n) { n.read = true; await put('notifications', n); }
    }

    async function markAllRead() {
        const items = await getNotifications(true);
        for (const n of items) { n.read = true; await put('notifications', n); }
    }

    // ── Comments / Collaboration ──
    async function addComment(recordId, text, author) {
        const comment = {
            id: 'cmt_' + Date.now().toString(36),
            recordId,
            text,
            author: author || (typeof S4Auth !== 'undefined' ? S4Auth.getSession()?.name : 'Unknown'),
            timestamp: Date.now()
        };
        await put('comments', comment);
        return comment;
    }

    async function getComments(recordId) {
        const all = await getAll('comments', 'recordId', recordId);
        return all.sort((a, b) => a.timestamp - b.timestamp);
    }

    // ── Settings ──
    async function setSetting(key, value) {
        await put('settings', { key, value, updated: Date.now() });
    }

    async function getSetting(key, defaultVal = null) {
        const record = await get('settings', key);
        return record ? record.value : defaultVal;
    }

    // ── Stats ──
    async function getStats() {
        const [analyses, items, records, notifs] = await Promise.all([
            count('analyses'), count('actionItems'), count('vault'), getNotifications(true)
        ]);
        return { analyses, actionItems: items, vaultRecords: records, unreadNotifications: notifs.length };
    }

    // ── Export / Import ──
    async function exportAll() {
        const [analyses, items, records, settings] = await Promise.all([
            getAll('analyses'), getAll('actionItems'), getAll('vault'), getAll('settings')
        ]);
        return { version: '3.9.16', exported: Date.now(), analyses, actionItems: items, vault: records, settings };
    }

    async function importData(data) {
        if (!data || !data.version) throw new Error('Invalid export data');
        for (const a of (data.analyses || [])) await put('analyses', a);
        for (const i of (data.actionItems || [])) await put('actionItems', i);
        for (const v of (data.vault || [])) await put('vault', v);
        for (const s of (data.settings || [])) await put('settings', s);
        return true;
    }

    // Init
    openDB().catch(e => console.warn('S4Data: IndexedDB init failed, using fallback', e));

    return {
        saveAnalysis, getAnalyses, getAnalysis,
        saveActionItem, getActionItems, updateActionItemStatus,
        saveVaultRecord, getVaultRecords,
        notify, getNotifications, markRead, markAllRead,
        addComment, getComments,
        setSetting, getSetting,
        getStats, exportAll, importData,
        remove, openDB
    };
})();
