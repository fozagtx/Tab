'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Link from 'next/link'
import { MotionItem } from '@/components/anim/MotionShell'
import { PressableSurface } from '@/components/anim/Pressable'
import { RiveLoader } from '@/components/anim/RiveLoader'
import { TabLogo } from '@/components/TabLogo'
import { AppShell } from '@/components/AppShell'

export function QrScreen({ code }: { code: string }) {
  const [card, setCard] = useState<{ origin: string; dataUrl: string } | null>(null)

  useEffect(() => {
    const origin = window.location.origin
    const url = `${origin}/p/${code}-01`
    let cancelled = false
    let lock: { release: () => void } | null = null

    QRCode.toDataURL(url, {
      margin: 1,
      width: 480,
      color: { dark: '#1F2348', light: '#FBFAF7' },
    }).then((dataUrl) => {
      if (!cancelled) setCard({ origin, dataUrl })
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wake = (navigator as any).wakeLock
    if (wake?.request) {
      wake
        .request('screen')
        .then((l: { release: () => void }) => {
          lock = l
        })
        .catch(() => undefined)
    }
    return () => {
      cancelled = true
      lock?.release()
    }
  }, [code])

  return (
    <AppShell
      tone="qr"
      compactHero
      className="flex flex-col items-center text-center"
      dock={
        <PressableSurface>
          <Link href={`/t/${code}`} className="cta-secondary">
            Back
          </Link>
        </PressableSurface>
      }
    >
      <MotionItem>
        <div className="flex justify-center pt-2">
          <TabLogo size={28} />
        </div>
        <p className="eyebrow mt-4">Scan</p>
        <p className="mono mt-4 font-bold leading-none tracking-wider text-[clamp(36px,14vw,56px)]">{code}</p>
        <p className="mt-2 text-[14px] text-muted">Or say the code</p>
      </MotionItem>

      <MotionItem className="mt-6 w-full max-w-[280px] rounded-[14px] border border-paper-edge bg-paper p-3">
        {card ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.dataUrl} alt={`QR for tab ${code}`} className="h-auto w-full" />
        ) : (
          <div className="flex aspect-square items-center justify-center">
            <RiveLoader size={64} variant="pulse" />
          </div>
        )}
      </MotionItem>

      <MotionItem>
        <p className="mono mt-4 break-all px-2 text-[11px] text-muted">
          {card ? `${card.origin}/p/${code}-01` : `…/p/${code}-01`}
        </p>
      </MotionItem>
    </AppShell>
  )
}
