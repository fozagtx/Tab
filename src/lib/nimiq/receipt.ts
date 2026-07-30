import type { Share } from '../types'

/** Fixed key order — never change. */
export function buildCanonical(opts: {
  code: string
  currency: string
  total_luna: number
  closed_at: string
  shares: Pick<Share, 'index' | 'label' | 'amount_luna' | 'status' | 'tx_hash'>[]
}): string {
  const shares = opts.shares
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((s) => ({
      i: s.index,
      l: s.label,
      luna: s.amount_luna,
      st: s.status,
      tx: s.tx_hash ?? null,
    }))

  return (
    '{' +
    `"v":1,` +
    `"tab":${JSON.stringify(opts.code)},` +
    `"currency":${JSON.stringify(opts.currency)},` +
    `"total_luna":${opts.total_luna},` +
    `"closed_at":${JSON.stringify(opts.closed_at)},` +
    `"shares":[${shares
      .map(
        (s) =>
          `{"i":${s.i},"l":${JSON.stringify(s.l)},"luna":${s.luna},"st":${JSON.stringify(s.st)},"tx":${JSON.stringify(s.tx)}}`,
      )
      .join(',')}]` +
    '}'
  )
}

const PREFIX = 'Nimiq Signed Message:\n'

export async function messageHash(canonical: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const msg = enc.encode(canonical)
  const prefix = enc.encode(`\x16${PREFIX}${msg.length}`)
  const buf = new Uint8Array(prefix.length + msg.length)
  buf.set(prefix, 0)
  buf.set(msg, prefix.length)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return new Uint8Array(digest)
}
