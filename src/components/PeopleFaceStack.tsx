import { FACE_STACK_VISIBLE, faceForIndex } from '@/lib/people-faces'

type Props = {
  count: number
  /** How many faces before +N. Default 4. */
  maxVisible?: number
  className?: string
  size?: 'sm' | 'md'
}

/**
 * Overlapping party avatars with social-media +N overflow.
 * Never renders a full wall of faces when the table is large.
 */
export function PeopleFaceStack({
  count,
  maxVisible = FACE_STACK_VISIBLE,
  className = '',
  size = 'md',
}: Props) {
  const safe = Math.max(0, Math.floor(count))
  if (safe === 0) return null

  const show = Math.min(safe, maxVisible)
  const overflow = safe - show

  return (
    <div
      className={`people-faces people-faces--${size} ${className}`.trim()}
      aria-label={`${safe} people`}
    >
      {Array.from({ length: show }, (_, i) => (
        <span
          key={i}
          className="people-face"
          style={{ zIndex: show - i, animationDelay: `${i * 28}ms` }}
          aria-hidden
        >
          {faceForIndex(i)}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="people-face people-face--more"
          style={{ zIndex: 0, animationDelay: `${show * 28}ms` }}
          aria-hidden
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}
