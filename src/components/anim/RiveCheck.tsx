'use client'

type Props = {
  size?: number
  className?: string
  playKey?: string | number | boolean
}

/** Plain check — no Rive canvas. */
export function RiveCheck({ size = 56, className }: Props) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--paid)',
        fontSize: size * 0.55,
        fontWeight: 800,
        lineHeight: 1,
      }}
      aria-hidden
    >
      ✓
    </span>
  )
}
