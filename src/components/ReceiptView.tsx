'use client'

import { useEffect, useState } from 'react'
import { formatNimFixed, lunaToFiat } from '@/lib/amounts'
import { NimiqLogo } from '@/components/NimiqLogo'
import { EXPLORER_TX } from '@/lib/types'
import { MotionItem } from '@/components/anim/MotionShell'
import { Pressable } from '@/components/anim/Pressable'
import { PaidStamp } from '@/components/anim/PaidStamp'
import { RiveCheck } from '@/components/anim/RiveCheck'
import { RiveLoader } from '@/components/anim/RiveLoader'
import { TabLogo } from '@/components/TabLogo'
import { AppShell } from '@/components/AppShell'
import { PartyCard } from '@/components/PartyCard'
import { faceForIndex } from '@/lib/people-faces'

type Payload = {
  verified: boolean
  receipt: {
    canonical: string
    signer: string
    public_key: string
    signature: string
    created_at: string
  }
  tab: {
    code: string
    title: string | null
    currency: string
    total_luna: number
    fx_rate: number
    shares: {
      index: number
      label: string | null
      amount_luna: number
      status: string
      tx_hash: string | null
    }[]
  } | null
}

export function ReceiptView({ code }: { code: string }) {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/receipts/${code}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Receipt not found')
        return
      }
      setData(json)
    })()
  }, [code])

  if (error) {
    return (
      <AppShell tone="receipt">
        <p className="text-alert">{error}</p>
      </AppShell>
    )
  }

  if (!data?.tab) {
    return (
      <AppShell tone="receipt" className="flex items-center justify-center gap-3">
        <RiveLoader size={48} variant="pulse" />
        <p className="text-muted">Loading receipt…</p>
      </AppShell>
    )
  }

  const { tab, receipt, verified } = data
  const settled = tab.shares.filter((s) => ['paid', 'marked'].includes(s.status)).length
  const partySize = tab.shares.length

  return (
    <AppShell
      tone="receipt"
      compactHero
      dock={
        <Pressable
          type="button"
          className="cta"
          onClick={async () => {
            const text = `Tab cleared · ${partySize} people · ${lunaToFiat(tab.total_luna, tab.fx_rate).toFixed(2)} ${tab.currency} · ${tab.code}`
            if (navigator.share) {
              await navigator.share({
                title: `Tab ${tab.code}`,
                text,
                url: window.location.href,
              })
            } else {
              await navigator.clipboard.writeText(`${text}\n${window.location.href}`)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }
          }}
        >
          {copied ? 'Copied' : 'Share the clear'}
        </Pressable>
      }
    >
      <MotionItem>
        <header className="pt-1">
          <TabLogo size={28} />
          <p className="eyebrow mt-3">Receipt · {tab.code}</p>
          <h1 className="title mt-2">{tab.title || tab.code}</h1>
          <div className="mt-4 flex items-center gap-3">
            {verified ? (
              <span className="inline-flex items-center gap-2">
                <RiveCheck size={36} playKey={receipt.signature} />
                <PaidStamp playKey={receipt.signature}>Verified</PaidStamp>
              </span>
            ) : (
              <span
                className="stamp stamp-marked"
                style={{ borderColor: 'var(--alert)', color: 'var(--alert)' }}
              >
                Unverified
              </span>
            )}
          </div>
        </header>
      </MotionItem>

      <MotionItem>
        <PartyCard
          className="mt-5"
          code={tab.code}
          title={tab.title}
          currency={tab.currency}
          totalFiat={lunaToFiat(tab.total_luna, tab.fx_rate)}
          settled={settled}
          partySize={partySize}
          cleared
        />
      </MotionItem>

      <div className="mt-5">
        {tab.shares.map((s) => (
          <MotionItem key={s.index}>
            <div className="flex items-start justify-between gap-3 border-t border-dashed border-paper-edge py-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className="people-face people-face--row" aria-hidden>
                  {faceForIndex(Math.max(0, s.index - 1))}
                </span>
                <div>
                  <p className="font-semibold">
                    <span className="share-idx mr-2 inline-block">
                      {String(s.index).padStart(2, '0')}
                    </span>
                    {s.label || `Share ${String(s.index).padStart(2, '0')}`}
                  </p>
                  <p className="mono mt-1 inline-flex items-center gap-1.5 text-[14px]">
                    <NimiqLogo size={13} />
                    <span>
                      {formatNimFixed(s.amount_luna)} NIM
                      {s.status === 'marked' ? ' · cash' : ''}
                    </span>
                  </p>
                </div>
              </div>
              {s.tx_hash ? (
                <a
                  className="mono shrink-0 text-[12px] text-paid underline"
                  href={EXPLORER_TX(s.tx_hash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  tx
                </a>
              ) : (
                <span className="shrink-0 text-[12px] text-muted">-</span>
              )}
            </div>
          </MotionItem>
        ))}
        <MotionItem>
          <div className="border-t border-dashed border-paper-edge p-4 text-[12px] leading-5 text-muted break-all">
            <p>
              <span className="text-ink">Signer</span> {receipt.signer}
            </p>
            <p className="mt-2">
              <span className="text-ink">Key</span> {receipt.public_key}
            </p>
            <p className="mt-2">
              <span className="text-ink">Sig</span> {receipt.signature}
            </p>
          </div>
        </MotionItem>
      </div>
    </AppShell>
  )
}
