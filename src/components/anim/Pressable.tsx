'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

type PressableProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode
  /** Ignored — Rive/motion removed for WebView reliability */
  rive?: boolean
}

/** Plain button. No scale / hover motion. */
export function Pressable({
  children,
  className,
  type = 'button',
  rive,
  ...rest
}: PressableProps) {
  void rive
  return (
    <button type={type} className={className} {...rest}>
      {children}
    </button>
  )
}

export function PressableSurface({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  )
}
