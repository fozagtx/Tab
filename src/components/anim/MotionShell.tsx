'use client'

import type { HTMLAttributes, ReactNode } from 'react'

/** Static shell — motion killed for Nimiq Pay WebView reliability. */
export function MotionShell({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode; delayChildren?: number }) {
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  )
}

export function MotionItem({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode
  variant?: 'up' | 'in'
}) {
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  )
}
