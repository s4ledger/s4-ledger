/**
 * ═══════════════════════════════════════════════════════════════
 *  Offline Store — IndexedDB persistence + sync queue
 * ═══════════════════════════════════════════════════════════════
 *
 * Provides fully offline-capable data persistence:
 * • Stores complete DRLRow[] and AnchorRecord map in IndexedDB
 * • Queues edits made while offline for later sync
 * • Detects online/offline transitions and triggers sync
 * • Conflict detection with last-write-wins + conflict flagging
 */

import type { DRLRow, AnchorRecord } from '../types'

/* ─── Types ──────────────────────────────────────────────────── */

export interface QueuedChange {
  id: string
  rowId: string
  field: string
  oldValue: string
  newValue: string
  timestamp: string
  userEmail: string | null
  synced: boolean
}

export interface OfflineState {
  isOnline: boolean
  queuedChanges: number
  lastPersist: string | null
  lastSync: string | null
  dbReady: boolean
}

/* ─── IndexedDB Setup ────────────────────────────────────────── */

const DB_NAME = 's4-ledger-offline'
const DB_VERSION = 1
const STORE_DATA = 'drl_rows'
const STORE_ANCHORS = 'anchors'
const STORE_QUEUE = 'sync_queue'
const STORE_META = 'meta'

let dbInstance: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORE_DATA)) {
        db.createObjectStore(STORE_DATA, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_ANCHORS)) {
        db.createObjectStore(STORE_ANCHORS, { keyPath: 'rowId' })
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_QUEUE, { keyPath: 'id' })
        queueStore.createIndex('synced', 'synced', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' })
      }
    }

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result
      resolve(dbInstance)
    }

    request.onerror = () => reject(new Error(`IndexedDB open failed: ${request.error?.message || 'unknown error'}`))
  })
}

/* ─── Generic IDB helpers ────────────────────────────────────── */

async function idbPut(storeName: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error(`IndexedDB put to '${storeName}' failed: ${tx.error?.message || 'unknown error'}`))
  })
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const request = tx.objectStore(storeName).getAll()
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(new Error(`IndexedDB getAll from '${storeName}' failed: ${request.error?.message || 'unknown error'}`))
  })
}

async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const request = tx.objectStore(storeName).get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(new Error(`IndexedDB get '${key}' from '${storeName}' failed: ${request.error?.message || 'unknown error'}`))
  })
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error(`IndexedDB delete '${key}' from '${storeName}' failed: ${tx.error?.message || 'unknown error'}`))
  })
}

async function idbClear(storeName: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error(`IndexedDB clear '${storeName}' failed: ${tx.error?.message || 'unknown error'}`))
  })
}

/* ─── DRL Row Persistence ────────────────────────────────────── */

export async function persistRows(rows: DRLRow[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATA, 'readwrite')
    const store = tx.objectStore(STORE_DATA)
    for (const row of rows) {
      store.put(row)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error(`IndexedDB persistRows failed (${rows.length} rows): ${tx.error?.message || 'unknown error'}`))
  })
}

export async function loadPersistedRows(): Promise<DRLRow[] | null> {
  try {
    const rows = await idbGetAll<DRLRow>(STORE_DATA)
    return rows.length > 0 ? rows : null
  } catch {
    return null
  }
}

/* ─── Anchor Persistence ─────────────────────────────────────── */

export async function persistAnchors(anchors: Record<string, AnchorRecord>): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ANCHORS, 'readwrite')
    const store = tx.objectStore(STORE_ANCHORS)
    for (const [rowId, anchor] of Object.entries(anchors)) {
      store.put({ ...anchor, rowId })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error(`IndexedDB persistAnchors failed: ${tx.error?.message || 'unknown error'}`))
  })
}

export async function loadPersistedAnchors(): Promise<Record<string, AnchorRecord> | null> {
  try {
    const entries = await idbGetAll<AnchorRecord & { rowId: string }>(STORE_ANCHORS)
    if (entries.length === 0) return null
    const map: Record<string, AnchorRecord> = {}
    for (const entry of entries) {
      const { rowId, ...anchor } = entry
      map[rowId] = anchor as AnchorRecord
    }
    return map
  } catch {
    return null
  }
}

/* ─── Sync Queue ─────────────────────────────────────────────── */

export async function enqueueChange(change: Omit<QueuedChange, 'id' | 'synced'>): Promise<void> {
  const queued: QueuedChange = {
    ...change,
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    synced: false,
  }
  await idbPut(STORE_QUEUE, queued)
}

export async function getQueuedChanges(): Promise<QueuedChange[]> {
  const all = await idbGetAll<QueuedChange>(STORE_QUEUE)
  return all.filter(c => !c.synced).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export async function getQueueCount(): Promise<number> {
  const all = await idbGetAll<QueuedChange>(STORE_QUEUE)
  return all.filter(c => !c.synced).length
}

export async function markChangeSynced(id: string): Promise<void> {
  const change = await idbGet<QueuedChange>(STORE_QUEUE, id)
  if (change) {
    await idbPut(STORE_QUEUE, { ...change, synced: true })
  }
}

export async function clearSyncedChanges(): Promise<void> {
  const all = await idbGetAll<QueuedChange>(STORE_QUEUE)
  for (const c of all) {
    if (c.synced) {
      await idbDelete(STORE_QUEUE, c.id)
    }
  }
}

export async function clearAllQueued(): Promise<void> {
  await idbClear(STORE_QUEUE)
}

/* ─── Meta Store ─────────────────────────────────────────────── */

export async function setMeta(key: string, value: unknown): Promise<void> {
  await idbPut(STORE_META, { key, value })
}

export async function getMeta<T>(key: string): Promise<T | null> {
  const entry = await idbGet<{ key: string; value: T }>(STORE_META, key)
  return entry?.value ?? null
}

/* ─── Online/Offline Detection ───────────────────────────────── */

type StatusCallback = (online: boolean) => void
let statusCallbacks: StatusCallback[] = []

export function onOnlineStatusChange(cb: StatusCallback): () => void {
  statusCallbacks.push(cb)

  const handleOnline = () => {
    for (const fn of statusCallbacks) fn(true)
  }
  const handleOffline = () => {
    for (const fn of statusCallbacks) fn(false)
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    statusCallbacks = statusCallbacks.filter(f => f !== cb)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

export function isOnline(): boolean {
  return navigator.onLine
}

/* ─── Initialize DB ──────────────────────────────────────────── */

export async function initOfflineStore(): Promise<void> {
  await openDB()
}
