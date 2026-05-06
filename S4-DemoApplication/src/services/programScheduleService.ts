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

/* ─── Supabase fetch ─────────────────────────────────────────────── */

/**
 * Fetch the latest program schedule data for tool_id='ps-v2'.
 * Returns null on network error or if no record exists.
 */
export async function fetchProgramSchedule(): Promise<PSData | null> {
  try {
    const { data, error } = await supabase
      .from('program_schedule')
      .select('vessels, saved_at, version')
      .eq('tool_id', 'ps-v2')
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        // PGRST116 = no rows — not an error condition
        console.warn('[PS Service] Supabase error:', error.message)
      }
      return null
    }

    const raw = data as { vessels: unknown; saved_at: string | null; version: string | null }
    const vessels: PSVessel[] = Array.isArray(raw.vessels) ? (raw.vessels as PSVessel[]) : []

    return {
      vessels,
      savedAt: raw.saved_at,
      version: raw.version,
    }
  } catch (err) {
    console.error('[PS Service] Unexpected error fetching program schedule:', err)
    return null
  }
}
