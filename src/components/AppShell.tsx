'use client'

import type { ReactNode } from 'react'

export type HeroTone =
  | 'split'
  | 'onboard-pay'
  | 'done'
  | 'create'
  | 'board'
  | 'pay'
  | 'qr'
  | 'receipt'

/** One unique file per tone — nothing shared across screens. */
const HERO_SRC: Record<HeroTone, string> = {
  split: '/bg/onboard-split.jpg',
  'onboard-pay': '/bg/onboard-pay.jpg',
  done: '/bg/onboard-done.jpg',
  create: '/bg/ui-create.jpg',
  board: '/bg/ui-board.jpg',
  pay: '/bg/ui-pay.jpg',
  qr: '/bg/ui-qr.jpg',
  receipt: '/bg/ui-receipt.jpg',
}

/** In-UI hero band — optional; hide on create so the form fits a phone. */
export function UiHero({
  tone = 'create',
  compact = false,
}: {
  tone?: HeroTone
  compact?: boolean
}) {
  return (
    <div className={`ui-hero${compact ? ' ui-hero--paper' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_SRC[tone]}
        alt=""
        className="ui-hero__img"
        draggable={false}
      />
      <div className="ui-hero__fade" aria-hidden />
    </div>
  )
}

/**
 * Phone-safe shell:
 * - scrollable body
 * - CTA pinned as a real flex footer (not sticky — sticky fails in WebViews)
 */
export function AppShell({
  children,
  dock,
  tone = 'create',
  compactHero = false,
  hideHero = false,
  className = '',
}: {
  children: ReactNode
  /** Always-visible bottom actions (Connect / Split it / Pay). */
  dock?: ReactNode
  tone?: HeroTone
  compactHero?: boolean
  hideHero?: boolean
  className?: string
}) {
  return (
    <div className="receipt-shell">
      {!hideHero && <UiHero tone={tone} compact={compactHero} />}
      <div className={`receipt-scroll ${className}`.trim()}>{children}</div>
      {dock != null && <div className="fixed-cta">{dock}</div>}
    </div>
  )
}
