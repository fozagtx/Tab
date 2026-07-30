'use client'

type Props = {
  children?: React.ReactNode
  className?: string
  marked?: boolean
  showCheck?: boolean
  playKey?: string | number | boolean
  label?: string
}

/** Static stamp — no motion. */
export function PaidStamp({ children, className, marked, label }: Props) {
  return (
    <span className={`stamp ${marked ? 'stamp-marked' : ''} ${className ?? ''}`.trim()}>
      {children ?? label ?? 'Paid'}
    </span>
  )
}
