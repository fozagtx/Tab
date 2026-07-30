import { NextResponse } from 'next/server'
import { fetchUsdPerNim } from '@/lib/fx'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const usd_per_nim = await fetchUsdPerNim()
    return NextResponse.json({ usd_per_nim })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Rate unavailable'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
