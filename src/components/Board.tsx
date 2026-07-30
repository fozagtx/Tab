'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { lunaToFiat } from '@/lib/amounts'
import { buildCanonical } from '@/lib/nimiq/receipt'
import { getNimiq, listHostAddress, signReceiptMessage } from '@/lib/nimiq/provider'
import { EXPLORER_TX, type PublicTab } from '@/lib/types'
import { MotionItem } from '@/components/anim/MotionShell'
import { Pressable, PressableSurface } from '@/components/anim/Pressable'
import { PaidStamp } from '@/components/anim/PaidStamp'
import { RiveLoader } from '@/components/anim/RiveLoader'
import { NetworkBadge } from '@/components/NetworkBadge'
import { TabLogo } from '@/components/TabLogo'
import { useNimiqWallet, WalletBar } from '@/components/WalletBar'
import { AppShell } from '@/components/AppShell'
import { NimiqPayInvite } from '@/components/NimiqPayInvite'
import { PartyCard } from '@/components/PartyCard'
import { faceForIndex } from '@/lib/people-faces'
import { rememberBoardProgress } from '@/lib/tab-history'

function readStoredHostToken(code: string, initial: string | null) {
  if (initial) return initial
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(`tab-host:${code}`)
}

export function Board({
  code,
  initialHostToken,
}: {
  code: string
  initialHostToken: string | null
}) {
  const [hostToken] = useState(() => readStoredHostToken(code, initialHostToken))
  const [tab, setTab] = useState<PublicTab | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [lastSync, setLastSync] = useState<string | null>(null)
  const wallet = useNimiqWallet()

  const refresh = useCallback(async () => {
    const q = hostToken ? `?host_token=${encodeURIComponent(hostToken)}` : ''
    const res = await fetch(`/api/tabs/${code}${q}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load')
    setTab(data)
  }, [code, hostToken])

  const sync = useCallback(async () => {
    await fetch(`/api/tabs/${code}/sync`, { method: 'POST' })
    setLastSync(new Date().toLocaleTimeString())
    await refresh()
  }, [code, refresh])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refresh()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      }
    })()
    const id = setInterval(() => {
      sync().catch(() => undefined)
    }, 2000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [refresh, sync])

  useEffect(() => {
    if (!tab) return
    const settledCount = tab.shares.filter((s) => ['paid', 'marked'].includes(s.status)).length
    const cleared = tab.status === 'settled' || settledCount === tab.shares.length
    rememberBoardProgress({
      code: tab.code,
      title: tab.title,
      currency: tab.currency,
      totalFiat: lunaToFiat(tab.total_luna, tab.fx_rate),
      partySize: tab.shares.length,
      settled: settledCount,
      status: tab.status === 'expired' ? 'expired' : cleared ? 'cleared' : 'open',
      hostToken,
      isHost: Boolean(tab.is_host),
    })
  }, [tab, hostToken])

  const resolved = useMemo(
    () => tab?.shares.filter((s) => ['paid', 'marked'].includes(s.status)).length ?? 0,
    [tab],
  )
  const allResolved = tab ? resolved === tab.shares.length : false

  function mark(index: number) {
    if (!hostToken) return
    startTransition(async () => {
      await fetch(`/api/tabs/${code}/shares/${index}/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_token: hostToken }),
      })
      await refresh()
    })
  }

  function resolveMismatch(index: number, action: 'accept' | 'reject') {
    if (!hostToken) return
    startTransition(async () => {
      await fetch(`/api/tabs/${code}/shares/${index}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_token: hostToken, action }),
      })
      await refresh()
    })
  }

  function signReceipt() {
    if (!hostToken || !tab) return
    startTransition(async () => {
      try {
        const nimiq = await getNimiq()
        if (!nimiq) {
          setError('Sign needs Nimiq Pay.')
          return
        }
        if (!wallet.connected) {
          await wallet.connect()
        }
        const signer = (await listHostAddress()) || tab.host_address
        const canonical = buildCanonical({
          code: tab.code,
          currency: tab.currency,
          total_luna: tab.total_luna,
          closed_at: new Date().toISOString(),
          shares: tab.shares,
        })
        const signed = await signReceiptMessage(canonical)
        const res = await fetch(`/api/tabs/${code}/receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host_token: hostToken,
            canonical,
            signer,
            public_key: signed.publicKey,
            signature: signed.signature,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not store receipt')
        window.location.href = data.url
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sign failed')
      }
    })
  }

  async function shareLink() {
    const url = `${window.location.origin}/t/${code}/qr`
    if (navigator.share) {
      await navigator.share({ title: tab?.title || 'Tab', url })
    } else {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${code}-01`)
    }
  }

  if (!tab) {
    return (
      <AppShell tone="board" className="flex items-center justify-center gap-3">
        <RiveLoader size={48} variant="pulse" />
        <p className="text-muted">{error || 'Loading tab…'}</p>
      </AppShell>
    )
  }

  const expired = tab.status === 'expired'

  return (
    <AppShell
      tone="board"
      compactHero
      dock={
        <>
          <PressableSurface>
            <Link href={`/t/${code}/qr`} className="cta">
              QR
            </Link>
          </PressableSurface>
          <Pressable type="button" className="cta-secondary" onClick={shareLink} rive>
            Share
          </Pressable>
          {allResolved && tab.is_host && tab.status !== 'settled' && (
            <Pressable
              type="button"
              className="cta"
              onClick={signReceipt}
              disabled={pending}
              rive={!pending}
            >
              {pending ? (
                <span className="inline-flex items-center gap-2.5">
                  <RiveLoader size={28} variant="liquid" />
                  Signing…
                </span>
              ) : (
                'Sign receipt'
              )}
            </Pressable>
          )}
          {tab.status === 'settled' && (
            <PressableSurface>
              <Link href={`/r/${code}`} className="cta-secondary">
                Receipt
              </Link>
            </PressableSurface>
          )}
        </>
      }
    >
      <NimiqPayInvite open={wallet.needsPayApp} onClose={wallet.dismissPayInvite} />
      <MotionItem>
        <header className="pt-2">
          <div className="flex items-center justify-between gap-3 pt-2">
            <TabLogo size={30} />
            <div className="flex items-center gap-2">
              <WalletBar
                connected={wallet.connected}
                address={wallet.address}
                short={wallet.short}
                busy={wallet.busy}
                onConnect={() => {
                  wallet.connect().catch(() => undefined)
                }}
                onDisconnect={wallet.disconnect}
              />
              <NetworkBadge />
            </div>
          </div>
          <p className="eyebrow mt-4">{tab.code}</p>
          <h1 className="title mt-2">{tab.title || tab.code}</h1>
          {lastSync ? (
            <p className="mono mt-1 text-[11px] text-muted">Synced {lastSync}</p>
          ) : null}
        </header>
      </MotionItem>

      <MotionItem>
        <PartyCard
          className="mt-4"
          code={tab.code}
          title={tab.title}
          currency={tab.currency}
          totalFiat={lunaToFiat(tab.total_luna, tab.fx_rate)}
          settled={resolved}
          partySize={tab.shares.length}
          cleared={allResolved || tab.status === 'settled'}
        />
      </MotionItem>

      {expired && (
        <MotionItem>
          <p className="mt-4 text-[14px] text-alert">Expired. Pay links are closed.</p>
        </MotionItem>
      )}
      {error && (
        <MotionItem>
          <p className="mt-4 text-[14px] text-alert">{error}</p>
        </MotionItem>
      )}

      <div className="mt-5 flex-1">
        {tab.shares.map((s) => {
          const paid = s.status === 'paid'
          const marked = s.status === 'marked'
          return (
            <MotionItem key={s.index}>
              <div
                className={`flex items-start gap-3 border-t border-dashed border-paper-edge py-4 ${paid ? 'stub-tear' : ''}`}
              >
                <span className="people-face people-face--row" aria-hidden>
                  {faceForIndex(s.index - 1 >= 0 ? s.index - 1 : s.index)}
                </span>
                <span className="share-idx pt-0.5">{String(s.index).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">
                    {s.label || `Share ${String(s.index).padStart(2, '0')}`}
                  </p>
                  <p className="money-md mt-1">
                    {lunaToFiat(s.amount_luna, tab.fx_rate).toFixed(2)}
                  </p>
                  {s.paid_at && (paid || marked) && (
                    <p className="mono mt-1 text-[11px] text-muted">
                      {new Date(s.paid_at).toLocaleTimeString()}
                    </p>
                  )}
                  {s.tx_hash && (
                    <a
                      className="mono mt-1 inline-block text-[11px] text-paid underline"
                      href={EXPLORER_TX(s.tx_hash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.tx_hash.slice(0, 8)}…
                    </a>
                  )}
                  {s.status === 'mismatch' && (
                    <div className="mt-2 space-y-2">
                      <p className="mt-1 text-[12px] text-alert">Wrong amount</p>
                      {tab.is_host && !expired && (
                        <div className="flex gap-3">
                          <Pressable
                            type="button"
                            className="text-[12px] font-semibold text-paid underline"
                            onClick={() => resolveMismatch(s.index, 'accept')}
                            disabled={pending}
                          >
                            Keep
                          </Pressable>
                          <Pressable
                            type="button"
                            className="text-[12px] font-semibold text-alert underline"
                            onClick={() => resolveMismatch(s.index, 'reject')}
                            disabled={pending}
                          >
                            Undo
                          </Pressable>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                  {paid && <PaidStamp playKey={s.tx_hash || s.index} />}
                  {marked && <PaidStamp label="Marked" marked showCheck={false} />}
                  {s.status === 'pending' && <span className="text-[12px] text-muted">Pending…</span>}
                  {s.status === 'unpaid' && tab.is_host && !expired && (
                    <Pressable
                      type="button"
                      className="text-[12px] font-semibold text-muted underline"
                      onClick={() => mark(s.index)}
                      disabled={pending}
                    >
                      Mark cash
                    </Pressable>
                  )}
                  {!paid && !marked && s.status !== 'mismatch' && (
                    <Link
                      href={`/p/${code}-${String(s.index).padStart(2, '0')}`}
                      className="text-[12px] font-semibold text-ink underline"
                    >
                      Pay link
                    </Link>
                  )}
                </div>
              </div>
            </MotionItem>
          )
        })}
        <div className="border-t border-dashed border-paper-edge" />
      </div>
    </AppShell>
  )
}
