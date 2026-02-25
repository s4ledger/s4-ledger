// S4 Ledger Service Worker v3.1.0 — Full Offline / Air-Gapped Support
const CACHE_VERSION = 's4-v330';
const STATIC_CACHE = CACHE_VERSION + '-static';
const DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';
const API_CACHE = CACHE_VERSION + '-api';
const MAX_DYNAMIC_ITEMS = 100;

// Core shell assets — precached on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  '/s4-assets/S4Ledger_logo.png',
  '/s4-assets/style.css',
  '/s4-assets/s4-mobile.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  '/s4-assets/platforms.js',
  '/s4-assets/defense-docs.js'
];

// ── Install — precache shell ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Precaching', PRECACHE_ASSETS.length, 'assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate — clean old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => {
          console.log('[SW] Purging old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Helper: trim dynamic cache to limit ──
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    return trimCache(cacheName, maxItems);
  }
}

// ── Fetch strategies ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and chrome extensions
  if (e.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Strategy 1: Network-first for API calls (cache response for offline fallback)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Return offline JSON for API calls
          return new Response(JSON.stringify({
            error: 'offline',
            message: 'S4 Ledger is operating in air-gapped mode. Data shown is from the last sync.',
            cached_at: new Date().toISOString()
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }))
    );
    return;
  }

  // Strategy 2: NetworkFirst for HTML pages (always fetch fresh, fall back to cache)
  if (e.request.destination === 'document' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Strategy 3: Cache-first for static assets (fonts, CSS, JS, images)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(e.request, clone);
            trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
          });
        }
        return response;
      });
    }).catch(() => {
      // Fallback for navigation
      if (e.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});

// ═══ PUSH NOTIFICATIONS ═══
self.addEventListener('push', e => {
  let data = { title: 'S4 Ledger', body: 'New notification', icon: '/s4-assets/S4Ledger_logo.png' };
  try {
    if (e.data) data = Object.assign(data, e.data.json());
  } catch (err) {
    if (e.data) data.body = e.data.text();
  }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon || '/s4-assets/S4Ledger_logo.png',
    badge: data.badge || '/s4-assets/S4Ledger_logo.png',
    tag: data.tag || 's4-notification',
    data: data.url || './',
    vibrate: [200, 100, 200],
    actions: data.actions || [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }));
});

// Handle notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes('s4') && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ═══ BACKGROUND SYNC — Offline-queued anchors ═══
self.addEventListener('sync', e => {
  if (e.tag === 's4-anchor-sync') {
    e.waitUntil(syncOfflineAnchors());
  }
  if (e.tag === 's4-data-sync') {
    e.waitUntil(syncOfflineData());
  }
});

async function syncOfflineAnchors() {
  try {
    // Open IndexedDB to get queued anchors
    const db = await openDB();
    const tx = db.transaction('offline_queue', 'readonly');
    const store = tx.objectStore('offline_queue');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const items = request.result || [];
        if (items.length === 0) return resolve();

        let synced = 0;
        for (const item of items) {
          try {
            const resp = await fetch('/api/anchor', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.data)
            });
            if (resp.ok) {
              // Remove from queue
              const delTx = db.transaction('offline_queue', 'readwrite');
              delTx.objectStore('offline_queue').delete(item.id);
              synced++;
            }
          } catch (err) {
            console.log('[SW] Sync failed for item', item.id, err);
          }
        }

        if (synced > 0) {
          self.registration.showNotification('S4 Ledger', {
            body: synced + ' offline anchor' + (synced > 1 ? 's' : '') + ' synced to XRPL',
            tag: 'sync-complete',
            icon: '/s4-assets/S4Ledger_logo.png'
          });
          // Notify all clients
          const allClients = await clients.matchAll();
          allClients.forEach(client => {
            client.postMessage({ type: 's4-sync-complete', synced: synced });
          });
        }
        resolve();
      };
      request.onerror = reject;
    });
  } catch (err) {
    console.log('[SW] Background sync error:', err);
  }
}

async function syncOfflineData() {
  // Notify clients to refresh their data
  const allClients = await clients.matchAll();
  allClients.forEach(client => {
    client.postMessage({ type: 's4-data-refresh' });
  });
}

// ── IndexedDB helper for SW ──
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('s4ledger', 3);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Periodic sync (if browser supports it) ──
self.addEventListener('periodicsync', e => {
  if (e.tag === 's4-periodic-refresh') {
    e.waitUntil(syncOfflineData());
  }
});
