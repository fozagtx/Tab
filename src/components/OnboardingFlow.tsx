'use client'

import { useState } from 'react'
import { NetworkBadge } from '@/components/NetworkBadge'
import { TabLogo } from '@/components/TabLogo'

const SEEN_KEY = 'tab-onboarded-v2'

type Props = {
  onDone: () => void
}

const beats = [
  {
    title: 'Split the bill.',
    line: 'Type the total. Pick how many people.',
    image: '/bg/onboard-split.jpg',
    alt: 'Friends at the table splitting a receipt',
  },
  {
    title: 'Friends pay NIM.',
    line: 'One tap in Nimiq Pay. Or any wallet.',
    image: '/bg/onboard-pay.jpg',
    alt: 'Phones and receipt ready to pay',
  },
  {
    title: 'Done at the table.',
    line: 'You get a signed receipt when everyone is clear.',
    image: '/bg/onboard-done.jpg',
    alt: 'Settled table after everyone paid',
  },
] as const

/**
 * True 3-step onboarding. Next never finishes — only the last CTA does.
 */
export function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const beat = beats[step]
  const isLast = step === beats.length - 1

  function markDone() {
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* ignore */
    }
    onDone()
  }

  function goNext(e: React.MouseEvent | React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    setStep((s) => Math.min(s + 1, beats.length - 1))
  }

  return (
    <div className="receipt-shell">
      <div className="ui-hero ui-hero--paper">
        {beats.map((b, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={b.image}
            src={b.image}
            alt={i === step ? b.alt : ''}
            className="ui-hero__img"
            style={{ opacity: i === step ? 1 : 0 }}
            draggable={false}
          />
        ))}
        <div className="ui-hero__fade" aria-hidden />
      </div>

      <div className="receipt-scroll">
        <header className="flex items-center justify-between gap-3">
          <TabLogo size={28} />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="chip-btn chip-btn--ghost"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                markDone()
              }}
            >
              Skip
            </button>
            <NetworkBadge />
          </div>
        </header>

        <div className="flex flex-col justify-center py-5" key={step}>
          <h1 className="display">{beat.title}</h1>
          <p className="body mt-3">{beat.line}</p>

          <div className="mt-6 flex gap-2" aria-hidden>
            {beats.map((_, i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  background:
                    i <= step
                      ? 'linear-gradient(90deg, var(--gold), var(--gold-hot))'
                      : 'var(--paper-edge)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="fixed-cta">
        {isLast ? (
          <button
            type="button"
            className="cta"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              markDone()
            }}
          >
            Split a bill
          </button>
        ) : (
          <button type="button" className="cta" onClick={goNext}>
            Next
          </button>
        )}
      </div>
    </div>
  )
}

export function useNeedsOnboarding() {
  const [needs, setNeeds] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      return sessionStorage.getItem(SEEN_KEY) !== '1'
    } catch {
      return true
    }
  })

  return {
    ready: true,
    needs,
    clear: () => setNeeds(false),
  }
}
