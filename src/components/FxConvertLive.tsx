'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { NimiqLogo } from '@/components/NimiqLogo'

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'
const REDUCED_MQ = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MQ)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MQ).matches,
    () => false,
  )
}

/** Tick the figure when the value changes — blur masks the swap. */
function TickFigure({
  text,
  className,
  reduced,
}: {
  text: string
  className?: string
  reduced: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(text)

  useEffect(() => {
    const el = ref.current
    if (!el || prev.current === text) return
    const first = prev.current === ''
    prev.current = text
    if (reduced) return

    el.getAnimations().forEach((a) => a.cancel())
    el.animate(
      first
        ? [
            { opacity: 0, transform: 'translateY(6px)', filter: 'blur(0px)' },
            { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
          ]
        : [
            { opacity: 0.45, transform: 'translateY(3px)', filter: 'blur(2px)' },
            { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
          ],
      { duration: first ? 220 : 160, easing: EASE },
    )
  }, [text, reduced])

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  )
}

type FxConvertLiveProps = {
  nim: number | null
  error?: string | null
  emptyHint?: string
  size?: 'md' | 'lg'
  logoSize?: number
  className?: string
  /** Prefix before the figure — default "≈ " for live FX estimates. */
  prefix?: string
  /** Override formatted amount text (still animates on change). */
  format?: (nim: number) => string
}

/**
 * USD → NIM conversion with enter / update / exit motion.
 * CSS + WAAPI only — interruptible while the user types.
 */
export function FxConvertLive({
  nim,
  error = null,
  emptyHint = 'Enter a total to see NIM',
  size = 'md',
  logoSize,
  className = '',
  prefix = '≈ ',
  format,
}: FxConvertLiveProps) {
  const reduced = usePrefersReducedMotion()
  const state: 'value' | 'error' | 'empty' =
    nim != null ? 'value' : error ? 'error' : 'empty'
  const mark = logoSize ?? (size === 'lg' ? 18 : 15)
  const amount =
    nim != null
      ? format
        ? format(nim)
        : `${prefix}${nim.toLocaleString(undefined, { maximumFractionDigits: 2 })} NIM`
      : ''

  return (
    <div
      className={`fx-convert fx-convert--live ${size === 'lg' ? 'fx-convert--lg' : ''} ${className}`.trim()}
      data-state={state}
      aria-live="polite"
    >
      <div className="fx-convert__stage">
        <div
          className="fx-convert__pane"
          data-active={state === 'value' ? 'true' : 'false'}
        >
          <NimiqLogo size={mark} className="fx-convert__mark" />
          <TickFigure text={amount} className="fx-convert__amount" reduced={reduced} />
        </div>
        <div
          className="fx-convert__pane fx-convert__pane--hint"
          data-active={state === 'empty' ? 'true' : 'false'}
        >
          <span className="fx-convert__hint">{emptyHint}</span>
        </div>
        <div
          className="fx-convert__pane fx-convert__pane--hint"
          data-active={state === 'error' ? 'true' : 'false'}
        >
          <span className="mono text-[12px] text-alert">{error}</span>
        </div>
      </div>
    </div>
  )
}

type ShareNimLiveProps = {
  nim: number
  className?: string
}

/** Per-share NIM figure that ticks when the split changes. */
export function ShareNimLive({ nim, className = '' }: ShareNimLiveProps) {
  const reduced = usePrefersReducedMotion()
  const text = nim.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return (
    <span className={`share-nim share-nim--live ${className}`.trim()}>
      <NimiqLogo size={12} className="fx-convert__mark" />
      <TickFigure text={text} reduced={reduced} />
    </span>
  )
}

type FadeMountProps = {
  show: boolean
  children: ReactNode
  className?: string
}

/** Soft enter for the shares block when a total appears. */
export function FadeMount({ show, children, className = '' }: FadeMountProps) {
  const reduced = usePrefersReducedMotion()
  const [render, setRender] = useState(show)
  const [visible, setVisible] = useState(show)

  useEffect(() => {
    if (show) {
      let inner = 0
      const id = requestAnimationFrame(() => {
        setRender(true)
        inner = requestAnimationFrame(() => setVisible(true))
      })
      return () => {
        cancelAnimationFrame(id)
        cancelAnimationFrame(inner)
      }
    }
    const id = requestAnimationFrame(() => setVisible(false))
    const t = window.setTimeout(() => setRender(false), reduced ? 0 : 200)
    return () => {
      cancelAnimationFrame(id)
      window.clearTimeout(t)
    }
  }, [show, reduced])

  if (!render) return null

  return (
    <div
      className={`fade-mount ${className}`.trim()}
      data-visible={visible ? 'true' : 'false'}
      data-reduced={reduced ? 'true' : 'false'}
    >
      {children}
    </div>
  )
}
