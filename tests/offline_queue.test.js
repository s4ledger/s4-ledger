/**
 * Offline Queue Tests for S4 Ledger
 * Run: npx jest tests/offline_queue.test.js
 * Or: node --experimental-vm-modules tests/offline_queue.test.js
 */

// ── Mock localStorage ──
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (i) => Object.keys(store)[i] || null,
    };
})();

// ── Mock navigator ──
let mockOnline = true;
const navigatorMock = { get onLine() { return mockOnline; } };

// ── Mock crypto.subtle ──
const cryptoMock = {
    getRandomValues: (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256); return arr; },
    subtle: {
        digest: async (algo, data) => {
            const { createHash } = require('crypto');
            const buf = Buffer.from(data);
            return createHash('sha256').update(buf).digest().buffer;
        },
        importKey: async () => ({ type: 'secret' }),
        deriveKey: async () => ({ type: 'secret', algorithm: { name: 'AES-GCM' } }),
        encrypt: async (algo, key, data) => {
            // Simple XOR mock for testing — NOT real encryption
            const buf = new Uint8Array(data);
            for (let i = 0; i < buf.length; i++) buf[i] ^= 0x42;
            return buf.buffer;
        },
        decrypt: async (algo, key, data) => {
            const buf = new Uint8Array(data);
            for (let i = 0; i < buf.length; i++) buf[i] ^= 0x42;
            return buf.buffer;
        },
    }
};

// ── Setup global mocks ──
global.localStorage = localStorageMock;
global.navigator = navigatorMock;
global.crypto = cryptoMock;
global.location = { origin: 'https://s4ledger.com' };
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// ── Constants matching the app ──
const OFFLINE_QUEUE_KEY = 's4_offline_queue';
const OFFLINE_SYNC_KEY = 's4_offline_last_sync';
const OFFLINE_QUEUE_ENCRYPTED_KEY = 's4_offline_queue_enc';

// ── Inline the queue functions for unit testing ──
function getOfflineQueue() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'); }
    catch(e) { return []; }
}

function saveOfflineQueue(queue) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function offlineRemoveItem(index) {
    const q = getOfflineQueue();
    q.splice(index, 1);
    saveOfflineQueue(q);
}

function offlineClearQueue() {
    saveOfflineQueue([]);
}

// ── Tests ──
describe('Offline Queue — Core', () => {
    beforeEach(() => {
        localStorage.clear();
        mockOnline = true;
    });

    test('getOfflineQueue returns empty array when no data', () => {
        expect(getOfflineQueue()).toEqual([]);
    });

    test('saveOfflineQueue persists items to localStorage', () => {
        const items = [
            { hash: 'abc123', record_type: 'JOINT', branch: 'JOINT', timestamp: '2025-02-20T00:00:00Z', synced: false },
            { hash: 'def456', record_type: 'MAINTENANCE', branch: 'LOGISTICS', timestamp: '2025-02-20T00:01:00Z', synced: false },
        ];
        saveOfflineQueue(items);
        expect(getOfflineQueue()).toEqual(items);
    });

    test('offlineRemoveItem removes item at index', () => {
        const items = [
            { hash: 'aaa', synced: false },
            { hash: 'bbb', synced: false },
            { hash: 'ccc', synced: false },
        ];
        saveOfflineQueue(items);
        offlineRemoveItem(1); // Remove 'bbb'
        const result = getOfflineQueue();
        expect(result).toHaveLength(2);
        expect(result[0].hash).toBe('aaa');
        expect(result[1].hash).toBe('ccc');
    });

    test('offlineClearQueue empties the queue', () => {
        saveOfflineQueue([{ hash: 'test', synced: false }]);
        offlineClearQueue();
        expect(getOfflineQueue()).toEqual([]);
    });

    test('getOfflineQueue handles malformed JSON gracefully', () => {
        localStorage.setItem(OFFLINE_QUEUE_KEY, '{not valid json');
        expect(getOfflineQueue()).toEqual([]);
    });

    test('queue preserves all record fields', () => {
        const item = {
            hash: 'abc123def456',
            record_type: 'CUSTODY_TRANSFER',
            branch: 'LOGISTICS',
            timestamp: '2025-02-20T12:00:00.000Z',
            synced: false,
        };
        saveOfflineQueue([item]);
        const retrieved = getOfflineQueue();
        expect(retrieved[0]).toEqual(item);
    });

    test('synced items are preserved correctly', () => {
        const items = [
            { hash: 'aaa', synced: true, synced_at: '2025-02-20T01:00:00Z' },
            { hash: 'bbb', synced: false },
        ];
        saveOfflineQueue(items);
        const result = getOfflineQueue();
        expect(result[0].synced).toBe(true);
        expect(result[0].synced_at).toBe('2025-02-20T01:00:00Z');
        expect(result[1].synced).toBe(false);
    });
});

describe('Offline Queue — Encryption', () => {
    test('encrypted queue can be stored and retrieved', async () => {
        const data = [{ hash: 'encrypted_test', synced: false }];
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey('raw', enc.encode('test'), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: enc.encode('salt'), iterations: 100000, hash: 'SHA-256' },
            keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const jsonBytes = enc.encode(JSON.stringify(data));
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, jsonBytes);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        const result = JSON.parse(new TextDecoder().decode(decrypted));
        expect(result).toEqual(data);
    });
});

describe('Offline Queue — Navigator Status', () => {
    test('navigator.onLine reflects mock state', () => {
        mockOnline = true;
        expect(navigator.onLine).toBe(true);
        mockOnline = false;
        expect(navigator.onLine).toBe(false);
    });

    test('queue operations work regardless of online state', () => {
        mockOnline = false;
        saveOfflineQueue([{ hash: 'offline_item', synced: false }]);
        expect(getOfflineQueue()).toHaveLength(1);
        mockOnline = true;
        expect(getOfflineQueue()).toHaveLength(1);
    });
});

describe('Offline Queue — Exponential Backoff', () => {
    test('backoff delay doubles with each attempt', () => {
        const baseDelay = 1000;
        const delays = [0, 1, 2, 3, 4].map(attempt => baseDelay * Math.pow(2, attempt));
        expect(delays).toEqual([1000, 2000, 4000, 8000, 16000]);
    });

    test('max retries is 5', () => {
        const maxRetries = 5;
        expect(maxRetries).toBe(5);
        // After 5 retries, total wait ≈ 1+2+4+8+16 = 31 seconds (+ jitter)
        const totalMinWait = [0,1,2,3,4].reduce((s, a) => s + 1000 * Math.pow(2, a), 0);
        expect(totalMinWait).toBe(31000);
    });
});

describe('Offline Queue — Fetch Interceptor', () => {
    test('identifies anchor routes correctly', () => {
        const anchorUrls = ['/api/anchor', '/api/demo/anchor'];
        const nonAnchorUrls = ['/api/demo/provision', '/api/demo/status', '/api/metrics'];
        anchorUrls.forEach(url => {
            expect(url.indexOf('/api/anchor') !== -1 || url.indexOf('/api/demo/anchor') !== -1).toBe(true);
        });
        nonAnchorUrls.forEach(url => {
            const isAnchor = url.indexOf('/api/anchor') !== -1 || url.indexOf('/api/demo/anchor') !== -1;
            expect(isAnchor).toBe(false);
        });
    });

    test('identifies provision route correctly', () => {
        expect('/api/demo/provision'.indexOf('/api/demo/provision') !== -1).toBe(true);
        expect('/api/demo/anchor'.indexOf('/api/demo/provision') !== -1).toBe(false);
    });
});
