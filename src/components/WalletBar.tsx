'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  connectWallet,
  disconnectWallet,
  getNimiq,
  getSessionAddress,
  resetNimiqCache,
  shortAddress,
  subscribeWallet,
  syncSessionIfConnected,
} from '@/lib/nimiq/provider'

type Probe = 'checking' | 'inside' | 'outside'

function useSessionAddress() {
  return useSyncExternalStore(
    subscribeWallet,
    () => getSessionAddress(),
    () => null,
  )
}

/**
 * Connect / disconnect Nimiq Pay wallet via @nimiq/mini-app-sdk.
 * Connect runs provider.connect() → listAccounts from a user gesture.
 */
export function useNimiqWallet() {
  const [probe, setProbe] = useState<Probe>('checking')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsPayApp, setNeedsPayApp] = useState(false)
  const address = useSessionAddress()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const nimiq = await getNimiq(4000)
      if (cancelled) return
      setProbe(nimiq ? 'inside' : 'outside')
      await syncSessionIfConnected().catch(() => undefined)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const connect = useCallback(async () => {
    setError(null)
    setNeedsPayApp(false)
    setBusy(true)
    try {
      resetNimiqCache()
      const nimiq = await getNimiq(6000)
      if (!nimiq) {
        setProbe('outside')
        setNeedsPayApp(true)
        return null
      }
      setProbe('inside')
      return await connectWallet()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not connect'
      // Outside-Pay path is handled by needsPayApp — never surface as red alert copy
      if (/Nimiq Pay/i.test(msg) && /inside|open|available/i.test(msg)) {
        setNeedsPayApp(true)
        return null
      }
      setError(msg)
      throw e
    } finally {
      setBusy(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setError(null)
    setNeedsPayApp(false)
    disconnectWallet()
  }, [])

  const dismissPayInvite = useCallback(() => {
    setNeedsPayApp(false)
  }, [])

  return {
    probe,
    inside: probe === 'inside',
    outside: probe === 'outside',
    checking: probe === 'checking',
    connected: Boolean(address),
    address,
    short: address ? shortAddress(address) : null,
    busy,
    error,
    needsPayApp,
    dismissPayInvite,
    connect,
    disconnect,
  }
}

type WalletBarProps = {
  connected: boolean
  address?: string | null
  short?: string | null
  busy?: boolean
  onConnect: () => void
  onDisconnect: () => void
  className?: string
}

/** Always-visible wallet control: Connect | address + Disconnect */
export function WalletBar({
  connected,
  address,
  short,
  busy,
  onConnect,
  onDisconnect,
  className = '',
}: WalletBarProps) {
  if (connected && address && short) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`.trim()}>
        <span className="wallet-chip" title={address}>
          {short}
        </span>
        <button type="button" className="chip-btn chip-btn--ghost" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`chip-btn ${className}`.trim()}
      onClick={onConnect}
      disabled={busy}
    >
      {busy ? '…' : 'Connect'}
    </button>
  )
}

export { shortAddress }
