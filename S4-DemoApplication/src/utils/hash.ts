/** Compute SHA-256 hex digest of a string using the Web Crypto API. */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Hash a row object by canonicalizing keys (sorted) and computing SHA-256. */
export function hashRow(row: Record<string, unknown>): Promise<string> {
  const canonical = JSON.stringify(row, Object.keys(row).sort())
  return sha256(canonical)
}
