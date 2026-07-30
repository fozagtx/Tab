import { NextRequest, NextResponse } from 'next/server'
import { getShares, getTab, updateShare } from '@/lib/db'
import { getTransactionByHash, toChainTx } from '@/lib/nimiq/rpc'
import { matchTransaction } from '@/lib/nimiq/match'
import { claimSchema } from '@/lib/schemas'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ code: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { code: raw } = await ctx.params
    const code = raw.toUpperCase()
    const body = claimSchema.parse(await req.json())
    const tab = await getTab(code)
    if (!tab) return NextResponse.json({ error: 'Tab not found' }, { status: 404 })
    if (tab.status === 'expired') {
      return NextResponse.json({ error: 'This tab expired.' }, { status: 410 })
    }

    const shares = await getShares(code)
    const share = shares.find((s) => s.index === body.share_index)
    if (!share) return NextResponse.json({ error: 'Share not found' }, { status: 404 })

    // Optimistic pending — poller confirms
    await updateShare(code, body.share_index, {
      status: 'pending',
      tx_hash: body.tx_hash,
    })

    const tx = await getTransactionByHash(body.tx_hash)
    if (tx) {
      const result = matchTransaction(toChainTx(tx), shares, code)
      if (result.kind === 'match' && result.shareIndex === body.share_index) {
        const settled = await updateShare(code, body.share_index, {
          status: 'paid',
          tx_hash: body.tx_hash,
          paid_at: new Date().toISOString(),
        })
        return NextResponse.json({ status: 'paid', share: settled })
      }
      if (result.kind === 'mismatch' && result.shareIndex === body.share_index) {
        const settled = await updateShare(code, body.share_index, {
          status: 'mismatch',
          tx_hash: body.tx_hash,
        })
        return NextResponse.json({ status: 'mismatch', share: settled, delta: result.deltaLuna })
      }
    }

    return NextResponse.json({ status: 'pending', tx_hash: body.tx_hash })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
