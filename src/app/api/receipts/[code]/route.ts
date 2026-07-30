import { NextResponse } from 'next/server'
import { getReceipt, getShares, getTab, publicTabView } from '@/lib/db'
import { verifyReceipt } from '@/lib/nimiq/verify-receipt'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ code: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const { code: raw } = await ctx.params
  const code = raw.toUpperCase()
  const receipt = await getReceipt(code)
  if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })

  const tab = await getTab(code)
  const shares = tab ? await getShares(code) : []
  const verified = await verifyReceipt({
    canonical: receipt.canonical,
    publicKey: receipt.public_key,
    signature: receipt.signature,
  })

  return NextResponse.json({
    receipt,
    verified,
    tab: tab ? publicTabView(tab, shares) : null,
  })
}
