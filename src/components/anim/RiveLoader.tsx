'use client'

type Props = {
  size?: number
  className?: string
  variant?: 'liquid' | 'pulse' | 'progress'
}

/** Simple spinner — no Rive canvas (WebView-safe). */
export function RiveLoader({ size = 40, className }: Props) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2.5px solid color-mix(in srgb, var(--ink) 18%, transparent)',
        borderTopColor: 'var(--gold-hot)',
        boxSizing: 'border-box',
      }}
      aria-hidden
    />
  )
}
