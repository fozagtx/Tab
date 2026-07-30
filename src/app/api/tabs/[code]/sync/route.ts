import { NextResponse } from 'next/server'
import {
  getShares,
  getTab,
  parkUnmatched,
  publicTabView,
  settleShareByTx,
  updateShare,
} from '@/lib/db'
import { matchTransaction } from '@/lib/nimiq/match'
import { getTransactionsByAddress, toChainTx } from '@/lib/nimiq/rpc'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ code: string }> }

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { code: raw } = await ctx.params
    const code = raw.toUpperCase()
    const tab = await getTab(code)
    if (!tab) return NextResponse.json({ error: 'Tab not found' }, { status: 404 })

    let shares = await getShares(code)
    const txs = await getTransactionsByAddress(tab.host_address, 40)
    const incoming = txs.filter(
      (t) => t.to.replace(/\s/g, '') === tab.host_address.replace(/\s/g, ''),
    )

    const settled: number[] = []
    const unmatched: string[] = []

    for (const rawTx of incoming) {
      const tx = toChainTx(rawTx)
      const result = matchTransaction(tx, shares, code)

      if (result.kind === 'ignore') continue

      if (result.kind === 'match') {
        await settleShareByTx(code, result.shareIndex, tx.hash, 'paid')
        settled.push(result.shareIndex)
        shares = await getShares(code)
        continue
      }

      if (result.kind === 'mismatch') {
        await updateShare(code, result.shareIndex, {
          status: 'mismatch',
          tx_hash: tx.hash,
        })
        shares = await getShares(code)
        continue
      }

      // unmatched — only park if it looks recent / related (has TAB memo for this code or near amounts)
      if (tx.data?.includes(code) || shares.some((s) => Math.abs(s.amount_luna - tx.value) / s.amount_luna < 0.05)) {
        await parkUnmatched({
          tx_hash: tx.hash,
          tab_code: code,
          value_luna: tx.value,
          memo: tx.data,
        })
        unmatched.push(tx.hash)
      }
    }

    shares = await getShares(code)
    return NextResponse.json({
      settled,
      unmatched,
      tab: publicTabView(tab, shares),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
