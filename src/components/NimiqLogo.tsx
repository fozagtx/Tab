type Props = {
  size?: number
  className?: string
  title?: string
  /** Default gold brand fill so it never inherits muted text. */
  color?: string
}

/**
 * Official Nimiq hexagon (nq-hexagon from @nimiq/style).
 * Use next to NIM amount conversions.
 */
export function NimiqLogo({
  size = 14,
  className = '',
  title = 'NIM',
  color = '#E9B213',
}: Props) {
  const h = Math.round(size * (24 / 27))
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 27 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 align-[-0.1em] ${className}`.trim()}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M26.6991 10.875L21.0741 1.125C20.6691 0.4275 19.9266 0 19.1241 0H7.87414C7.07164 0 6.32914 0.4275 5.92789 1.125L0.302891 10.875C-0.0983594 11.5725 -0.0983594 12.4275 0.302891 13.125L5.92789 22.875C6.32914 23.5725 7.07164 24 7.87414 24H19.1241C19.9266 24 20.6691 23.5725 21.0704 22.875L26.6954 13.125C27.1004 12.4275 27.1004 11.5725 26.6991 10.875Z"
        fill={color}
      />
    </svg>
  )
}
