import { NextRequest, NextResponse } from 'next/server'
import { getTab, updateShare } from '@/lib/db'
import { markShareSchema } from '@/lib/schemas'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ code: string; i: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { code: raw, i } = await ctx.params
    const code = raw.toUpperCase()
    const index = Number(i)
    const body = markShareSchema.parse(await req.json())
    const tab = await getTab(code)
    if (!tab) return NextResponse.json({ error: 'Tab not found' }, { status: 404 })
    if (body.host_token !== tab.host_token) {
      return NextResponse.json({ error: 'Host only' }, { status: 403 })
    }
    const share = await updateShare(code, index, {
      status: 'marked',
      paid_at: new Date().toISOString(),
    })
    return NextResponse.json(share)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
