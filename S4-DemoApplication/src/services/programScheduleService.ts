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
  ms: MilestoneMap         // construction milestones: { CA, SOC, LCH, BT, AT, DEL }
  acqEvents?: MilestoneMap // acquisition/design events: { SRR, PDR, CDR, SDP, IOTE, … }
  baseline?: MilestoneMap
}

export interface PSData {
  vessels: PSVessel[]
  savedAt: string | null
  version: string | null
}

/* ─── Milestone keyword map ──────────────────────────────────────── */

const MILESTONE_KEYWORDS: Record<string, string[]> = {
  // ── Construction milestones ───────────────────────────────────────
  CA:   ['contract award', 'award date', 'dac', 'after award', 'contract award date'],
  SOC:  ['start of construction', 'soc', 'keel laying', 'keel lay'],
  LCH:  ['launch', 'lch', 'float-off', 'float off'],
  BT:   ["builder's trial", "builders trial", 'bt', 'dock trial', 'builder trial'],
  AT:   ['acceptance trial', 'at', 'government acceptance', 'govt acceptance'],
  DEL:  ['delivery', 'del', 'ship delivery', 'vessel delivery'],
  // ── Acquisition / design & test review events ────────────────────
  SRR:  ['system requirements review', 'srr', 'srr deliverables', 'with srr'],
  PDR:  ['preliminary design review', 'pdr', 'after pdr'],
  CDR:  ['critical design review', 'cdr', 'prior to cdr', 'before cdr'],
  SDP:  ['software development plan', 'software design package', 'with sdp'],
  IOTE: ['initial operational test', 'iot&e', 'iote', 'iot and e', 'operational test and evaluation'],
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
    // "NLT milestone + N days" or "milestone + N calendar days" → positive offset
    const plusMatch = /\+\s*(\d+)\s*(?:calendar\s*)?days?/i.exec(lower)
    if (plusMatch) {
      return { milestone: foundMilestone, offsetDays: parseInt(plusMatch[1], 10) }
    }
    // "Submit with [milestone]" or "Submit at [milestone]" → offset 0
    if (lower.includes(' at ') || lower.includes('at the') || lower.startsWith('at ') ||
        lower.includes(' with ') || lower.includes('concurrent')) {
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
  date: string            // YYYY-MM-DD computed due date
  vessel: PSVessel
  milestone: string       // e.g. 'AT', 'CDR'
  milestoneDate: string   // the YYYY-MM value from PS for that milestone
  offsetDays: number
  milestoneGroup: 'construction' | 'acqEvent'  // which section the milestone lives in
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

  // Look up milestone date — construction milestones first, then acquisition events
  const msDate = vessel.ms[ref.milestone] ?? vessel.acqEvents?.[ref.milestone]
  if (!msDate) return null

  const milestoneGroup: 'construction' | 'acqEvent' =
    vessel.ms[ref.milestone] ? 'construction' : 'acqEvent'

  return {
    date: addDaysToYM(msDate, ref.offsetDays),
    vessel,
    milestone: ref.milestone,
    milestoneDate: msDate,
    offsetDays: ref.offsetDays,
    milestoneGroup,
  }
}

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

/* ─── Demo vessel data (exact dates from PS tool demo seed) ─────── */

/**
 * Canonical demo vessel data — matches the PS tool's built-in demo seed.
 * Used to:
 *   1. Fill in missing `acqEvents` on live Supabase/LS vessels
 *   2. Serve as a 3rd fallback so DT always has PS data in demo mode
 */
export const DEMO_PS_VESSELS: PSVessel[] = [
  {
    id: 'apl-101', designation: 'APL-101', type: 'Patrol Boat', fleet: 'PACFLT',
    ms: { CA:'2025-11', SOC:'2026-04', LCH:'2027-01', BT:'2027-05', AT:'2027-08', DEL:'2027-11' },
    acqEvents: { SRR:'2026-02', PDR:'2026-08', CDR:'2026-12', SDP:'2026-10', IOTE:'2028-03' },
  },
  {
    id: 'apl-102', designation: 'APL-102', type: 'Patrol Boat', fleet: 'PACFLT',
    ms: { CA:'2026-03', SOC:'2026-09', LCH:'2027-07', BT:'2027-11', AT:'2028-02', DEL:'2028-05' },
    acqEvents: { SRR:'2026-06', PDR:'2026-12', CDR:'2027-04', SDP:'2027-02', IOTE:'2028-09' },
  },
  {
    id: 'yrbm-51', designation: 'YRBM-51', type: 'RHIB', fleet: 'PACFLT',
    ms: { CA:'2025-09', SOC:'2026-03', LCH:'2026-08', BT:'2026-10', AT:'2026-12', DEL:'2027-03' },
    acqEvents: { SRR:'2025-12', PDR:'2026-05', CDR:'2026-08', SDP:'2026-06', IOTE:'2027-07' },
  },
  {
    id: 'yrbm-52', designation: 'YRBM-52', type: 'RHIB', fleet: 'USFF',
    ms: { CA:'2026-02', SOC:'2026-08', LCH:'2027-02', BT:'2027-05', AT:'2027-07', DEL:'2027-10' },
    acqEvents: { SRR:'2026-05', PDR:'2026-10', CDR:'2027-01', SDP:'2026-11', IOTE:'2028-02' },
  },
  {
    id: 'ytb-810', designation: 'YTB-810', type: 'Tug', fleet: 'PACFLT',
    ms: { CA:'2025-08', SOC:'2026-02', LCH:'2026-10', BT:'2027-01', AT:'2027-03', DEL:'2027-06' },
    acqEvents: { SRR:'2025-11', PDR:'2026-04', CDR:'2026-07', SDP:'2026-05', IOTE:'2027-09' },
  },
  {
    id: 'ytb-811', designation: 'YTB-811', type: 'Tug', fleet: 'USFF',
    ms: { CA:'2026-01', SOC:'2026-07', LCH:'2027-03', BT:'2027-06', AT:'2027-08', DEL:'2027-11' },
    acqEvents: { SRR:'2026-04', PDR:'2026-10', CDR:'2027-01', SDP:'2026-11', IOTE:'2028-03' },
  },
]

/** Merge missing acqEvents from demo data for matching vessels. */
function mergeAcqEvents(vessels: PSVessel[]): PSVessel[] {
  return vessels.map(v => {
    if (v.acqEvents && Object.keys(v.acqEvents).length > 0) return v
    const demo = DEMO_PS_VESSELS.find(d => d.designation === v.designation)
    return demo?.acqEvents ? { ...v, acqEvents: demo.acqEvents } : v
  })
}

/* ─── Supabase + localStorage + demo fallback fetch ─────────────── */

/**
 * Fetch the latest program schedule vessel data.
 *
 * Priority:
 *   1. Supabase  (synced by authenticated PS tool users)
 *   2. localStorage['s4_ps_v2']  (written by PS tool even in demo mode; same origin)
 *   3. DEMO_PS_VESSELS  (built-in fallback so DT always has PS data)
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
        return { vessels: mergeAcqEvents(vessels), savedAt: raw.saved_at, version: raw.version }
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
    return { ...lsData, vessels: mergeAcqEvents(lsData.vessels) }
  }

  // 3 — Built-in demo fallback — always available
  console.info('[PS Service] Using built-in demo vessel data')
  return { vessels: DEMO_PS_VESSELS, savedAt: null, version: 'demo' }
}
