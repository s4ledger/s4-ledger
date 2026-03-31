import { AnchorRecord } from '../types'

function randomHex(length: number): string {
  const chars = '0123456789ABCDEF'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * 16)]
  }
  return result
}

export async function simulateAnchor(
  rowId: string,
  hash: string
): Promise<AnchorRecord> {
  // Simulate XRPL transaction delay
  await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800))

  return {
    rowId,
    hash,
    timestamp: new Date().toISOString(),
    txHash: randomHex(64),
    ledgerIndex: 85_000_000 + Math.floor(Math.random() * 1_000_000),
    network: 'XRPL Mainnet',
  }
}

export async function simulateVerify(
  currentHash: string,
  anchoredHash: string
): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400))
  return currentHash === anchoredHash
}
