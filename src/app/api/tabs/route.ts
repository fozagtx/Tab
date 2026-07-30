import { NextRequest, NextResponse } from 'next/server'
import { evenFiatShares, fiatToLuna } from '@/lib/amounts'
import { makeHostToken, makeTabCode, shareFingerprint, shareMemo } from '@/lib/codes'
import { countTabsByDevice, createTab } from '@/lib/db'
import { fetchUsdPerNim } from '@/lib/fx'
import { createTabSchema } from '@/lib/schemas'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = createTabSchema.parse(await req.json())

    if (body.host_device_id) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const n = await countTabsByDevice(body.host_device_id, since)
      if (n >= 20) {
        return NextResponse.json(
          { error: 'Rate limit: 20 tabs per hour on this device.' },
          { status: 429 },
        )
      }
    }

    const fx = await fetchUsdPerNim()
    const fiats =
      body.share_fiats && body.share_fiats.length === body.people
        ? body.share_fiats
        : evenFiatShares(body.total_fiat, body.people)

    const sum = fiats.reduce((a, b) => a + b, 0)
    if (Math.abs(sum - body.total_fiat) > 0.02) {
      return NextResponse.json(
        { error: 'Share amounts must add up to the total.' },
        { status: 400 },
      )
    }

    const shareLunas = fiats.map((f) => fiatToLuna(f, fx))
    // Adjust rounding so sum(shares) === total_luna exactly
    const totalLuna = fiatToLuna(body.total_fiat, fx)
    const diff = totalLuna - shareLunas.reduce((a, b) => a + b, 0)
    shareLunas[0] += diff

    let code = makeTabCode()
    // Extremely unlikely collision; retry a few times via create
    for (let i = 0; i < 5; i++) {
      try {
        const hostToken = makeHostToken()
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        const { tab, shares } = await createTab({
          code,
          host_token: hostToken,
          host_address: body.host_address.trim(),
          host_device_id: body.host_device_id ?? null,
          currency: body.currency,
          total_luna: totalLuna,
          fx_rate: fx,
          title: body.title ?? null,
          expires_at: expires,
          shares: shareLunas.map((amount_luna, i) => ({
            index: i + 1,
            label: null,
            amount_luna,
            memo: shareMemo(code, i + 1),
            fingerprint: shareFingerprint(i + 1),
          })),
        })
        return NextResponse.json({
          code: tab.code,
          host_token: tab.host_token,
          fx_rate: tab.fx_rate,
          total_luna: tab.total_luna,
          shares: shares.map((s) => ({
            index: s.index,
            amount_luna: s.amount_luna,
            memo: s.memo,
            fingerprint: s.fingerprint,
          })),
        })
      } catch {
        code = makeTabCode()
      }
    }
    return NextResponse.json({ error: 'Could not create tab.' }, { status: 500 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
