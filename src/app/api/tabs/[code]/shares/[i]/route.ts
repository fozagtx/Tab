import { NextRequest, NextResponse } from 'next/server'
import { getShares, getTab, updateShare } from '@/lib/db'
import { patchShareSchema } from '@/lib/schemas'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ code: string; i: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { code: raw, i } = await ctx.params
    const code = raw.toUpperCase()
    const index = Number(i)
    const body = patchShareSchema.parse(await req.json())
    const tab = await getTab(code)
    if (!tab) return NextResponse.json({ error: 'Tab not found' }, { status: 404 })

    const isHost = body.host_token === tab.host_token
    if (body.amount_luna !== undefined && !isHost) {
      return NextResponse.json({ error: 'Host only' }, { status: 403 })
    }

    if (body.amount_luna !== undefined) {
      const shares = await getShares(code)
      const others = shares
        .filter((s) => s.index !== index)
        .reduce((a, s) => a + s.amount_luna, 0)
      if (others + body.amount_luna !== tab.total_luna) {
        return NextResponse.json(
          { error: 'Shares must still sum to the tab total.' },
          { status: 400 },
        )
      }
    }

    const share = await updateShare(code, index, {
      ...(body.label !== undefined ? { label: body.label } : {}),
      ...(body.amount_luna !== undefined ? { amount_luna: body.amount_luna } : {}),
    })
    return NextResponse.json(share)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
