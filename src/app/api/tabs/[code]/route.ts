import { NextRequest, NextResponse } from 'next/server'
import { getShares, getTab, publicTabView, setTabStatus } from '@/lib/db'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ code: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const { code: raw } = await ctx.params
  const code = raw.toUpperCase()
  const tab = await getTab(code)
  if (!tab) return NextResponse.json({ error: 'Tab not found' }, { status: 404 })

  if (tab.status === 'open' && new Date(tab.expires_at).getTime() < Date.now()) {
    await setTabStatus(code, 'expired')
    tab.status = 'expired'
  }

  const shares = await getShares(code)
  const hostToken = req.nextUrl.searchParams.get('host_token')
  const isHost = Boolean(hostToken && hostToken === tab.host_token)

  return NextResponse.json(publicTabView(tab, shares, isHost))
}
