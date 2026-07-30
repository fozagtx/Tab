type Props = {
  size?: number
  showWordmark?: boolean
  className?: string
}

/** Tab brand mark — split receipts + gold coin. */
export function TabLogo({ size = 28, showWordmark = true, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`.trim()} aria-label="Tab">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-[22%]"
        draggable={false}
      />
      {showWordmark && (
        <span
          className="text-[15px] font-bold tracking-[0.18em] uppercase text-ink"
          style={{ fontFamily: 'var(--font-mulish), Mulish, Muli, sans-serif' }}
        >
          Tab
        </span>
      )}
    </span>
  )
}
