import { customAlphabet } from 'nanoid'

/** Unambiguous alphabet — no 0/O/1/I/l */
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const makeTabCode = customAlphabet(alphabet, 6)
export const makeHostToken = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  24,
)

export function padShareIndex(index: number): string {
  return String(index).padStart(2, '0')
}

export function shareMemo(code: string, index: number): string {
  return `TAB ${code}-${padShareIndex(index)}`
}

/** Matcher B: amount fingerprint = share index (luna). Invisible in fiat. */
export function shareFingerprint(index: number): number {
  return index
}

export function parseStubParam(stub: string): { code: string; index: number } | null {
  const m = stub.toUpperCase().match(/^([2-9A-HJ-NP-Z]{6})-(\d{1,2})$/)
  if (!m) return null
  const index = Number(m[2])
  if (index < 1 || index > 12) return null
  return { code: m[1], index }
}
