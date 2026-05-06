/**
 * programScheduleService.ts
 *
 * Fetches Program Schedule (PS) vessel milestone data from the shared
 * Supabase `program_schedule` table and provides helpers for computing
 * DRL due dates driven by those milestones.
 */
import { supabase } from '../lib/supabaseClient'

/* ─── PS data shapes ─────────────────────────────────────────────── */

/** Milestones stored per vessel: keys are milestone codes, values are YYYY-MM strings. */
export type MilestoneMap = Record<string, string>

export interface PSVessel {
  id: string
  designation: string      // e.g. 'APL-101'
  type: string             // e.g. 'Patrol Boat'
  fleet?: string
  status?: string
  ms: MilestoneMap         // { CA: '2024-03', SOC: '2024-09', BT: '2025-06', AT: '2025-08', DEL: '2025-10', … }
  baseline?: MilestoneMap
}

export interface PSData {
  vessels: PSVessel[]
  savedAt: string | null
  version: string | null
}

/* ─── Milestone keyword map ──────────────────────────────────────── */

const MILESTONE_KEYWORDS: Record<string, string[]> = {
  CA:  ['contract award', 'award date', 'dac', 'after award', 'contract award date'],
  SOC: ['start of construction', 'soc', 'keel laying', 'keel lay'],
  LCH: ['launch', 'lch', 'float-off', 'float off'],
  BT:  ["builder's trial", "builders trial", 'bt', 'dock trial', 'builder trial'],
  AT:  ['acceptance trial', 'at', 'government acceptance', 'govt acceptance'],
  DEL: ['delivery', 'del', 'ship delivery', 'vessel delivery'],
}

/** Offset pattern: "30 days prior" or "45 calendar days after" */
const OFFSET_RE = /(\d+)\s*(?:calendar\s*)?days?\s*(prior|before|after)/i

export interface MilestoneRef {
  milestone: string   // e.g. 'AT'
  offsetDays: number  // positive = after; negative = before
}

/**
 * Parse a plain-English submittalGuidance string into a milestone code
 * and signed day offset.  Returns null if no recognisable pattern found.
 *
 * Examples:
 *   "Submit 30 days after contract award" → { milestone: 'CA', offsetDays: 30 }
 *   "Submit 14 days prior to BT"          → { milestone: 'BT', offsetDays: -14 }
 *   "Submit at acceptance trial (AT)"     → { milestone: 'AT', offsetDays: 0  }
 */
export function parseMilestoneRef(guidance: string): MilestoneRef | null {
  const lower = guidance.toLowerCase()

  // Detect milestone
  let foundMilestone: string | null = null
  for (const [code, keywords] of Object.entries(MILESTONE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      foundMilestone = code
      break
    }
  }
  if (!foundMilestone) return null

  // Detect offset
  const match = OFFSET_RE.exec(lower)
  if (!match) {
    // "Submit at [milestone]" → offset 0
    if (lower.includes(' at ') || lower.includes('at the') || lower.startsWith('at ')) {
      return { milestone: foundMilestone, offsetDays: 0 }
    }
    return null
  }

  const days = parseInt(match[1], 10)
  const direction = match[2].toLowerCase()
  const signed = direction === 'prior' || direction === 'before' ? -days : days

  return { milestone: foundMilestone, offsetDays: signed }
}

/* ─── Date arithmetic ────────────────────────────────────────────── */

/**
 * Given a YYYY-MM string (representing the 1st of that month)
 * and a signed day offset, return a YYYY-MM-DD date string.
 */
export function addDaysToYM(ym: string, offsetDays: number): string {
  const [year, month] = ym.split('-').map(Number)
  const base = new Date(Date.UTC(year, month - 1, 1))
  base.setUTCDate(base.getUTCDate() + offsetDays)
  return base.toISOString().slice(0, 10)
}

/* ─── Vessel inference from title text ───────────────────────────── */

const TYPE_KEYWORDS: Record<string, string[]> = {
  'Patrol Boat': ['apl', 'patrol boat', 'patrol craft', '40ft'],
  'RHIB':        ['yrbm', 'rhib', 'rigid hull', '11m'],
  'Ferry':       ['yfb', 'ferry'],
  'Tug':         ['ytb', 'tug', 'tugboat', 'harbor tug'],
}

/**
 * Try to infer which PS vessel a DRL row belongs to based on:
 *  1. Exact designation match anywhere in the title (e.g. "APL-101 appears")
 *  2. Type-keyword + hull-number matching (e.g. "40ft Patrol Boat — Hull 1" → first APL vessel)
 */
export function inferVesselFromTitle(title: string, vessels: PSVessel[]): PSVessel | null {
  const lower = title.toLowerCase()

  // Pass 1 — exact designation substring match
  for (const v of vessels) {
    if (lower.includes(v.designation.toLowerCase())) {
      return v
    }
  }

  // Pass 2 — type keyword match, then pick by hull number if multiple
  let matchedType: string | null = null
  for (const [typeName, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      matchedType = typeName
      break
    }
  }
  if (!matchedType) return null

  const ofType = vessels.filter(v =>
    v.type.toLowerCase().includes(matchedType!.toLowerCase()) ||
    TYPE_KEYWORDS[matchedType!]?.some(kw => v.designation.toLowerCase().includes(kw.replace('-', '')))
  )
  if (ofType.length === 0) return null

  // Hull number extraction: "(Hull 2)" → index 1
  const hullMatch = title.match(/hull\s*(\d+)/i)
  const hullNum = hullMatch ? parseInt(hullMatch[1], 10) : 1
  return ofType[hullNum - 1] ?? ofType[0]
}

/* ─── Compute a PS-driven due date for a DRL row ────────────────── */

export interface PSDueDateResult {
  date: string            // YYYY-MM-DD
  vessel: PSVessel
  milestone: string       // e.g. 'AT'
  milestoneDate: string   // the YYYY-MM value from PS for that milestone
  offsetDays: number
}

/**
 * Combine parseMilestoneRef + addDaysToYM for a specific DRL row.
 * Accepts the row's vesselId (explicit) or title (for inference fallback).
 * Returns null if no PS data match can be found.
 */
export function computePSDueDate(
  submittalGuidance: string,
  vesselId: string | undefined,
  title: string,
  vessels: PSVessel[],
): PSDueDateResult | null {
  if (vessels.length === 0) return null

  // Resolve vessel
  let vessel: PSVessel | null = null
  if (vesselId) {
    vessel = vessels.find(v => v.designation === vesselId) ?? null
  }
  if (!vessel) {
    vessel = inferVesselFromTitle(title, vessels)
  }
  if (!vessel) return null

  // Parse milestone ref
  const ref = parseMilestoneRef(submittalGuidance)
  if (!ref) return null

  // Look up milestone date
  const msDate = vessel.ms[ref.milestone]
  if (!msDate) return null

  return {
    date: addDaysToYM(msDate, ref.offsetDays),
    vessel,
    milestone: ref.milestone,
    milestoneDate: msDate,
    offsetDays: ref.offsetDays,
  }
}

/* ─── Default vessels (mirrors PS tool DEMO array) ──────────────── */
// Used as the final fallback so the DT always has real vessel data even
// before a user has saved a schedule or visited the PS tool.
const DEFAULT_VESSELS: PSVessel[] = [
  { id:'apl-101',  type:'APL',  designation:'APL-101',  fleet:'PACFLT', status:'on-track',
    ms:{ CA:'2025-11', SOC:'2026-04', LCH:'2027-01', BT:'2027-05', AT:'2027-08', DEL:'2027-11' } },
  { id:'apl-102',  type:'APL',  designation:'APL-102',  fleet:'PACFLT', status:'delayed',
    ms:{ CA:'2026-03', SOC:'2026-09', LCH:'2027-07', BT:'2027-11', AT:'2028-02', DEL:'2028-05' } },
  { id:'apl-103',  type:'APL',  designation:'APL-103',  fleet:'USFF',   status:'on-track',
    ms:{ CA:'2026-09', SOC:'2027-03', LCH:'2028-01', BT:'2028-05', AT:'2028-08', DEL:'2028-11' } },
  { id:'apl-104',  type:'APL',  designation:'APL-104',  fleet:'PACFLT', status:'not-planned',
    ms:{ CA:'2027-04', SOC:'', LCH:'', BT:'', AT:'', DEL:'' } },
  { id:'apl-105',  type:'APL',  designation:'APL-105',  fleet:'USFF',   status:'not-planned',
    ms:{ CA:'2027-10', SOC:'', LCH:'', BT:'', AT:'', DEL:'' } },
  { id:'yrbm-51',  type:'YRBM', designation:'YRBM-51',  fleet:'PACFLT', status:'delayed',
    ms:{ CA:'2025-09', SOC:'2026-03', LCH:'2026-08', BT:'2026-10', AT:'2026-12', DEL:'2027-03' } },
  { id:'yrbm-52',  type:'YRBM', designation:'YRBM-52',  fleet:'USFF',   status:'on-track',
    ms:{ CA:'2026-02', SOC:'2026-08', LCH:'2027-02', BT:'2027-05', AT:'2027-07', DEL:'2027-10' } },
  { id:'yrbm-53',  type:'YRBM', designation:'YRBM-53',  fleet:'PACFLT', status:'on-track',
    ms:{ CA:'2026-09', SOC:'2027-03', LCH:'2027-10', BT:'2028-01', AT:'2028-04', DEL:'2028-07' } },
  { id:'yrbm-54',  type:'YRBM', designation:'YRBM-54',  fleet:'USFF',   status:'not-planned',
    ms:{ CA:'2027-06', SOC:'', LCH:'', BT:'', AT:'', DEL:'' } },
  { id:'yfb-88',   type:'YFB',  designation:'YFB-88',   fleet:'PACFLT', status:'on-track',
    ms:{ CA:'2025-12', SOC:'2026-05', LCH:'2026-10', BT:'2026-12', AT:'2027-02', DEL:'2027-05' } },
  { id:'yfb-89',   type:'YFB',  designation:'YFB-89',   fleet:'USFF',   status:'delayed',
    ms:{ CA:'2026-06', SOC:'2026-12', LCH:'2027-06', BT:'2027-09', AT:'2027-11', DEL:'2028-02' } },
  { id:'yfb-90',   type:'YFB',  designation:'YFB-90',   fleet:'PACFLT', status:'not-planned',
    ms:{ CA:'2027-03', SOC:'', LCH:'', BT:'', AT:'', DEL:'' } },
  { id:'ytb-810',  type:'YTB',  designation:'YTB-810',  fleet:'PACFLT', status:'on-track',
    ms:{ CA:'2025-08', SOC:'2026-02', LCH:'2026-10', BT:'2027-01', AT:'2027-03', DEL:'2027-06' } },
  { id:'ytb-811',  type:'YTB',  designation:'YTB-811',  fleet:'USFF',   status:'on-track',
    ms:{ CA:'2026-01', SOC:'2026-07', LCH:'2027-03', BT:'2027-06', AT:'2027-08', DEL:'2027-11' } },
  { id:'ytb-812',  type:'YTB',  designation:'YTB-812',  fleet:'PACFLT', status:'delayed',
    ms:{ CA:'2026-08', SOC:'2027-02', LCH:'2027-10', BT:'2028-01', AT:'2028-04', DEL:'2028-07' } },
  { id:'ytb-813',  type:'YTB',  designation:'YTB-813',  fleet:'USFF',   status:'not-planned',
    ms:{ CA:'2027-06', SOC:'', LCH:'', BT:'', AT:'', DEL:'' } },
]

const PS_LOCALSTORAGE_KEY = 's4_ps_v2'

/** Read vessel data from the shared localStorage written by the PS tool. */
function fetchFromLocalStorage(): PSData | null {
  try {
    const raw = (typeof window !== 'undefined') && window.localStorage?.getItem(PS_LOCALSTORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { vessels?: unknown; saved_at?: string; version?: string }
    const vessels: PSVessel[] = Array.isArray(parsed.vessels) ? (parsed.vessels as PSVessel[]) : []
    if (vessels.length === 0) return null
    return { vessels, savedAt: parsed.saved_at ?? null, version: parsed.version ?? null }
  } catch {
    return null
  }
}

/* ─── Supabase + localStorage + default fallback fetch ─────────── */

/**
 * Fetch the latest program schedule vessel data.
 *
 * Priority:
 *   1. Supabase  (synced by authenticated PS tool users)
 *   2. localStorage['s4_ps_v2']  (written by PS tool even in demo mode; same origin)
 *   3. Embedded DEFAULT_VESSELS  (mirrors PS tool DEMO array — always available)
 *
 * This guarantees the DT always has real vessel milestone data to drive
 * due-date calculations and AI context, regardless of auth/session state.
 */
export async function fetchProgramSchedule(): Promise<PSData | null> {
  // 1 — Supabase
  try {
    const { data, error } = await supabase
      .from('program_schedule')
      .select('vessels, saved_at, version')
      .eq('tool_id', 'ps-v2')
      .single()

    if (!error && data) {
      const raw = data as { vessels: unknown; saved_at: string | null; version: string | null }
      const vessels: PSVessel[] = Array.isArray(raw.vessels) ? (raw.vessels as PSVessel[]) : []
      if (vessels.length > 0) {
        return { vessels, savedAt: raw.saved_at, version: raw.version }
      }
    } else if (error && error.code !== 'PGRST116') {
      console.warn('[PS Service] Supabase error:', error.message)
    }
  } catch (err) {
    console.warn('[PS Service] Supabase unreachable:', err)
  }

  // 2 — localStorage written by PS tool (same origin: s4ledger.com)
  const lsData = fetchFromLocalStorage()
  if (lsData) {
    console.info(`[PS Service] Using localStorage PS data (${lsData.vessels.length} vessels)`)
    return lsData
  }

  // 3 — Embedded default vessels (PS tool DEMO data — always current)
  console.info('[PS Service] Using embedded default vessels')
  return { vessels: DEFAULT_VESSELS, savedAt: null, version: 'default' }
}
