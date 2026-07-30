import { NextRequest, NextResponse } from 'next/server'
import { getShares, getTab, updateShare } from '@/lib/db'
import { resolveMismatchSchema } from '@/lib/schemas'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ code: string; i: string }> }

/** Host accepts or rejects a mismatched payment. */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { code: raw, i } = await ctx.params
    const code = raw.toUpperCase()
    const index = Number(i)
    const body = resolveMismatchSchema.parse(await req.json())
    const tab = await getTab(code)
    if (!tab) return NextResponse.json({ error: 'Tab not found' }, { status: 404 })
    if (body.host_token !== tab.host_token) {
      return NextResponse.json({ error: 'Host only' }, { status: 403 })
    }

    const shares = await getShares(code)
    const share = shares.find((s) => s.index === index)
    if (!share) return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    if (share.status !== 'mismatch') {
      return NextResponse.json({ error: 'Share is not in mismatch state' }, { status: 400 })
    }

    if (body.action === 'accept') {
      const updated = await updateShare(code, index, {
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      return NextResponse.json(updated)
    }

    const updated = await updateShare(code, index, {
      status: 'unpaid',
      tx_hash: null,
      paid_at: null,
    })
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
