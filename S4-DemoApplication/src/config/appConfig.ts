/**
 * ═══════════════════════════════════════════════════════════════
 *  S4 Ledger — Application Configuration Layer
 *
 *  Supports two modes via VITE_APP_MODE env var:
 *    "demo"       → hardcoded sample data (default, safe for public demos)
 *    "production" → reads from s4-config.json (you populate with real data)
 *
 *  In production mode, if s4-config.json is missing or malformed,
 *  the system falls back to demo defaults and logs a warning.
 * ═══════════════════════════════════════════════════════════════
 */

import type { DRLRow, Program, Contract } from '../types'

/* ─── Runtime mode ───────────────────────────────────────────── */

export type AppMode = 'demo' | 'production'

export function getAppMode(): AppMode {
  const raw = import.meta.env.VITE_APP_MODE as string | undefined
  if (raw === 'production') return 'production'
  return 'demo'
}

export function isProductionMode(): boolean {
  return getAppMode() === 'production'
}

/* ─── Configuration schema ───────────────────────────────────── */

/** Craft type entry for the platform registry */
export interface CraftEntry {
  label: string
  desc: string
}

/** Contract mapping rule — maps craft name patterns to contract IDs */
export interface ContractMappingRule {
  contractId: string
  /** Case-insensitive substrings in title that match this contract */
  patterns: string[]
}

/** SharePoint column name mapping (NSERC IDE schema) */
export interface SchemaMapping {
  drlId: string
  title: string
  diNumber: string
  contractDue: string
  calcDueDate: string
  submittalGuide: string
  actualSubDate: string
  received: string
  calDaysReview: string
  notes: string
  status: string
  revision?: string
  comments?: string
  /** Additional custom fields to import */
  customFields?: Record<string, string>
}

/** DRL template used when auto-generating rows for new craft */
export interface DRLTemplate {
  titlePrefix: string
  diNumber: string
  contractDueOffset?: string
  submittalGuidance: string
}

/** Top-level configuration file schema (s4-config.json) */
export interface S4Config {
  /** Application mode label (informational) */
  mode?: string

  /** Craft/platform registry — replaces PMS300_CRAFT_REGISTRY */
  craftRegistry: CraftEntry[]

  /** Program definitions */
  programs: Program[]

  /** Contract definitions */
  contracts: Contract[]

  /** Rules for mapping DRL titles → contract IDs */
  contractMapping: ContractMappingRule[]

  /** SharePoint / NSERC IDE column name mapping */
  schemaMapping: SchemaMapping

  /** Sample/seed data rows (optional — if omitted, app starts empty in production mode) */
  sampleData?: DRLRow[]

  /** DRL title prefixes for auto-generated new-craft rows */
  drlTemplates?: DRLTemplate[]

  /** Chat channel craft labels (optional — auto-derived from craftRegistry if omitted) */
  chatCraftChannels?: string[]
}

/* ─── Config singleton ───────────────────────────────────────── */

let _configPromise: Promise<S4Config> | null = null
let _configSync: S4Config | null = null

/**
 * Load configuration asynchronously.
 * - Production mode: fetches /s4-config.json
 * - Demo mode: returns demo defaults immediately
 */
export async function loadConfig(): Promise<S4Config> {
  if (_configPromise) return _configPromise

  _configPromise = (async () => {
    if (getAppMode() === 'production') {
      try {
        const resp = await fetch('/s4-config.json')
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const json = await resp.json() as Partial<S4Config>
        const validated = validateConfig(json)
        _configSync = validated
        console.info('[S4 Config] Production config loaded successfully')
        return validated
      } catch (err) {
        console.warn('[S4 Config] Failed to load s4-config.json — falling back to demo defaults:', err)
        const { getDemoConfig } = await import('./demoDefaults')
        const demo = getDemoConfig()
        _configSync = demo
        return demo
      }
    }

    // Demo mode — use hardcoded defaults
    const { getDemoConfig } = await import('./demoDefaults')
    const demo = getDemoConfig()
    _configSync = demo
    return demo
  })()

  return _configPromise
}

/**
 * Get config synchronously (returns null if not yet loaded).
 * Call loadConfig() first during app initialization.
 */
export function getConfigSync(): S4Config | null {
  return _configSync
}

/**
 * Get config synchronously, falling back to demo if not yet loaded.
 */
export function getConfigOrDemo(): S4Config {
  if (_configSync) return _configSync
  // Lazy-load demo defaults synchronously (they're just static data)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getDemoConfig } = require('./demoDefaults') as { getDemoConfig: () => S4Config }
  const demo = getDemoConfig()
  _configSync = demo
  return demo
}

/* ─── Validation ─────────────────────────────────────────────── */

function validateConfig(raw: Partial<S4Config>): S4Config {
  // Minimal validation — ensure required arrays exist
  if (!raw.craftRegistry || !Array.isArray(raw.craftRegistry) || raw.craftRegistry.length === 0) {
    throw new Error('s4-config.json: craftRegistry must be a non-empty array')
  }
  if (!raw.programs || !Array.isArray(raw.programs) || raw.programs.length === 0) {
    throw new Error('s4-config.json: programs must be a non-empty array')
  }
  if (!raw.contracts || !Array.isArray(raw.contracts) || raw.contracts.length === 0) {
    throw new Error('s4-config.json: contracts must be a non-empty array')
  }
  if (!raw.contractMapping || !Array.isArray(raw.contractMapping)) {
    throw new Error('s4-config.json: contractMapping must be an array')
  }
  if (!raw.schemaMapping || typeof raw.schemaMapping !== 'object') {
    throw new Error('s4-config.json: schemaMapping must be an object')
  }

  const sm = raw.schemaMapping
  const requiredFields: (keyof SchemaMapping)[] = ['drlId', 'title', 'diNumber', 'contractDue', 'status']
  for (const f of requiredFields) {
    if (!sm[f]) throw new Error(`s4-config.json: schemaMapping.${f} is required`)
  }

  return raw as S4Config
}

/* ─── Helper: assign contract IDs using config rules ─────────── */

export function assignContractIdFromConfig(title: string, rules: ContractMappingRule[], fallbackContractId: string): string {
  const lower = title.toLowerCase()
  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return rule.contractId
      }
    }
  }
  return fallbackContractId
}
