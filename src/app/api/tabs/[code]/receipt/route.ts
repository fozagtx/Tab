import { NextRequest, NextResponse } from 'next/server'
import { getShares, getTab, saveReceipt, setTabStatus } from '@/lib/db'
import { receiptSchema } from '@/lib/schemas'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ code: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { code: raw } = await ctx.params
    const code = raw.toUpperCase()
    const body = receiptSchema.parse(await req.json())
    const tab = await getTab(code)
    if (!tab) return NextResponse.json({ error: 'Tab not found' }, { status: 404 })
    if (body.host_token !== tab.host_token) {
      return NextResponse.json({ error: 'Host only' }, { status: 403 })
    }

    const shares = await getShares(code)
    const unresolved = shares.filter((s) => !['paid', 'marked'].includes(s.status))
    if (unresolved.length > 0) {
      return NextResponse.json(
        { error: 'Every share must be paid or marked before signing.' },
        { status: 400 },
      )
    }

    const receipt = await saveReceipt({
      tab_code: code,
      canonical: body.canonical,
      signer: body.signer,
      public_key: body.public_key,
      signature: body.signature,
    })
    await setTabStatus(code, 'settled')

    return NextResponse.json({ receipt, url: `/r/${code}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
