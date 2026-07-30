'use client'

import { useEffect, useRef, useState } from 'react'
import { PeopleFaceStack } from '@/components/PeopleFaceStack'
import { Pressable } from '@/components/anim/Pressable'

type Props = {
  code: string
  title?: string | null
  currency: string
  totalFiat: number
  settled: number
  partySize: number
  /** Settled / all paid — unlocks the shareable clear state. */
  cleared?: boolean
  shareUrl?: string
  className?: string
}

/**
 * Screenshot bait: visible numbers (party progress) on a thermal stub.
 * Maps RPG “character sheet” psychology to a bill split without purple game chrome.
 */
export function PartyCard({
  code,
  title,
  currency,
  totalFiat,
  settled,
  partySize,
  cleared = false,
  shareUrl,
  className = '',
}: Props) {
  const [copied, setCopied] = useState(false)
  const [pulse, setPulse] = useState(false)
  const prevSettled = useRef(settled)

  useEffect(() => {
    if (settled > prevSettled.current) {
      setPulse(true)
      const t = window.setTimeout(() => setPulse(false), 900)
      prevSettled.current = settled
      return () => window.clearTimeout(t)
    }
    prevSettled.current = settled
  }, [settled])

  const pct = partySize > 0 ? Math.min(100, Math.round((settled / partySize) * 100)) : 0
  const label = cleared ? 'CLEARED' : settled === 0 ? 'OPEN' : 'IN PLAY'

  async function share() {
    const url =
      shareUrl ||
      (typeof window !== 'undefined'
        ? cleared
          ? window.location.href
          : `${window.location.origin}/t/${code}`
        : '')
    const text = cleared
      ? `Tab cleared · ${partySize} people · ${totalFiat.toFixed(2)} ${currency} · ${code}`
      : `Splitting ${totalFiat.toFixed(2)} ${currency} · ${settled}/${partySize} paid · ${code}`
    try {
      if (navigator.share) {
        await navigator.share({ title: title || `Tab ${code}`, text, url })
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }
    } catch {
      /* user cancelled share */
    }
  }

  return (
    <section className={`party-card ${cleared ? 'party-card--cleared' : ''} ${className}`.trim()}>
      <div className="party-card__top">
        <span className={`party-card__stamp ${cleared ? 'party-card__stamp--gold' : ''}`}>
          {label}
        </span>
        {pulse && !cleared && (
          <span className="party-card__xp" aria-live="polite">
            +1 settled
          </span>
        )}
      </div>

      <p className="party-card__eyebrow">{title || code}</p>

      <div className="party-card__score" aria-label={`${settled} of ${partySize} paid`}>
        <span className="party-card__fraction">
          <span className="party-card__num">{settled}</span>
          <span className="party-card__slash">/</span>
          <span className="party-card__den">{partySize}</span>
        </span>
        <span className="party-card__score-meta">settled</span>
      </div>

      <div className="party-bar" role="progressbar" aria-valuenow={settled} aria-valuemin={0} aria-valuemax={partySize}>
        <div className="party-bar__fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="party-card__row">
        <PeopleFaceStack count={partySize} maxVisible={4} size="sm" />
        <div className="party-card__money">
          <span className="mono party-card__total">{totalFiat.toFixed(2)}</span>
          <span className="party-card__cur">{currency}</span>
        </div>
      </div>

      {(cleared || settled > 0) && (
        <Pressable type="button" className="party-card__share" onClick={share}>
          {copied ? 'Copied' : cleared ? 'Share the clear' : 'Share progress'}
        </Pressable>
      )}
      <p className="party-card__nim">Feeless NIM · settled at the table</p>
    </section>
  )
}
