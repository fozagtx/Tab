'use client'

import { isTestnet } from '@/lib/nimiq/network'

/** Visible network chip. Only renders on testnet. */
export function NetworkBadge({ className = '' }: { className?: string }) {
  if (!isTestnet()) return null
  return (
    <span
      className={`mono inline-flex items-center rounded border border-paper-edge px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted ${className}`.trim()}
    >
      Testnet
    </span>
  )
}
