/**
 * Payment matchers A (memo) and B (amount fingerprint).
 * Pure — no DB imports. Safe to unit-test.
 */

export type MatchableShare = {
  index: number
  memo: string
  amount_luna: number
  fingerprint: number
  status: string
  tx_hash: string | null
}

export type ChainTx = {
  hash: string
  to: string
  value: number
  /** Decoded memo / recipient data text, if any */
  data: string | null
}

export type MatchResult =
  | { kind: 'match'; shareIndex: number; matcher: 'memo' | 'fingerprint' }
  | { kind: 'mismatch'; shareIndex: number; deltaLuna: number }
  | { kind: 'unmatched' }
  | { kind: 'ignore'; reason: 'already_settled' }

const MEMO_RE = /TAB\s+([2-9A-HJ-NP-Z]{6})-(\d{1,2})/i

export function parseMemo(data: string | null | undefined): {
  code: string
  index: number
} | null {
  if (!data) return null
  const m = data.match(MEMO_RE)
  if (!m) return null
  return { code: m[1].toUpperCase(), index: Number(m[2]) }
}

export function matchTransaction(
  tx: ChainTx,
  shares: MatchableShare[],
  tabCode: string,
): MatchResult {
  if (shares.some((s) => s.tx_hash === tx.hash)) {
    return { kind: 'ignore', reason: 'already_settled' }
  }

  const open = shares.filter((s) =>
    ['unpaid', 'pending', 'mismatch', 'marked'].includes(s.status),
  )

  // Matcher A — memo
  const memo = parseMemo(tx.data)
  if (memo && memo.code === tabCode.toUpperCase()) {
    const share = shares.find((s) => s.index === memo.index)
    if (!share) return { kind: 'unmatched' }
    if (share.tx_hash) return { kind: 'ignore', reason: 'already_settled' }
    if (!['unpaid', 'pending', 'mismatch', 'marked'].includes(share.status)) {
      return { kind: 'unmatched' }
    }
    return { kind: 'match', shareIndex: share.index, matcher: 'memo' }
  }

  // Matcher B — exact amount + fingerprint
  const exact = open.find(
    (s) => s.amount_luna + s.fingerprint === tx.value,
  )
  if (exact) {
    return { kind: 'match', shareIndex: exact.index, matcher: 'fingerprint' }
  }

  // Near-match within 1% of exactly one open share (base amount, ignoring fingerprint)
  const near = open.filter((s) => {
    const target = s.amount_luna + s.fingerprint
    const delta = Math.abs(tx.value - target)
    return delta > 0 && delta / target <= 0.01
  })
  if (near.length === 1) {
    const s = near[0]
    return {
      kind: 'mismatch',
      shareIndex: s.index,
      deltaLuna: tx.value - (s.amount_luna + s.fingerprint),
    }
  }

  return { kind: 'unmatched' }
}
