'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { evenFiatShares } from '@/lib/amounts'
import { getDeviceId } from '@/lib/nimiq/provider'
import { Pressable } from '@/components/anim/Pressable'
import { FxConvertLive, ShareNimLive } from '@/components/FxConvertLive'
import { NetworkBadge } from '@/components/NetworkBadge'
import { TabLogo } from '@/components/TabLogo'
import { useNimiqWallet, WalletBar } from '@/components/WalletBar'
import { AppShell } from '@/components/AppShell'
import { NimiqPayInvite } from '@/components/NimiqPayInvite'
import { PeopleFaceStack } from '@/components/PeopleFaceStack'
import { TabRecents } from '@/components/TabRecents'
import { faceForIndex } from '@/lib/people-faces'
import { rememberHostedTab } from '@/lib/tab-history'
import Link from 'next/link'

/**
 * Zero-instruction create flow — phone-first.
 * Order: total → people → pay-to → shares → pinned CTA.
 */
export function CreateForm() {
  const router = useRouter()
  const wallet = useNimiqWallet()
  const [total, setTotal] = useState('')
  const [people, setPeople] = useState(4)
  const [manualAddress, setManualAddress] = useState('')
  const [fxHint, setFxHint] = useState<number | null>(null)
  const [fxError, setFxError] = useState<string | null>(null)
  const [uneven, setUneven] = useState<number[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/fx')
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error || 'Rate unavailable')
        setFxHint(data.usd_per_nim)
        setFxError(null)
      } catch (e) {
        if (!cancelled) {
          setFxHint(null)
          setFxError(e instanceof Error ? e.message : 'Rate unavailable')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const hostAddress = wallet.address || manualAddress.trim()

  const totalNum = Number(total)
  const shares = useMemo(() => {
    if (!Number.isFinite(totalNum) || totalNum <= 0) return []
    return uneven ?? evenFiatShares(totalNum, people)
  }, [totalNum, people, uneven])

  const remainder = useMemo(() => {
    if (!uneven) return 0
    return Math.round((totalNum - uneven.reduce((a, b) => a + b, 0)) * 100) / 100
  }, [uneven, totalNum])

  const nimEstimate = useMemo(() => {
    if (!fxHint || !Number.isFinite(totalNum) || totalNum <= 0) return null
    return totalNum / fxHint
  }, [fxHint, totalNum])

  function bumpPeople(delta: number) {
    setPeople((p) => Math.min(12, Math.max(2, p + delta)))
    setUneven(null)
  }

  function editShare(i: number, value: string) {
    const n = Number(value)
    const base = uneven ?? evenFiatShares(totalNum, people)
    const next = base.slice()
    next[i] = Number.isFinite(n) ? n : 0
    setUneven(next)
  }

  function create() {
    setError(null)
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      setError('Enter the total.')
      return
    }
    if (!hostAddress) {
      setError(wallet.inside ? 'Connect your wallet.' : 'Paste your NQ address.')
      return
    }
    if (uneven && Math.abs(remainder) > 0.001) {
      setError(`Still ${remainder.toFixed(2)} unassigned.`)
      return
    }

    startTransition(async () => {
      try {
        const deviceId = wallet.inside ? await getDeviceId() : null
        const res = await fetch('/api/tabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host_address: hostAddress,
            host_device_id: deviceId,
            currency: 'USD',
            total_fiat: totalNum,
            people,
            title: null,
            share_fiats: uneven ?? undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not create tab')
        sessionStorage.setItem(`tab-host:${data.code}`, data.host_token)
        rememberHostedTab({
          code: data.code,
          currency: 'USD',
          totalFiat: totalNum,
          partySize: people,
          hostToken: data.host_token,
        })
        router.push(`/t/${data.code}?host_token=${data.host_token}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not create tab')
      }
    })
  }

  const needsWallet = !wallet.connected
  const showManualPayTo = !wallet.connected
  const canCreate =
    Number.isFinite(totalNum) &&
    totalNum > 0 &&
    hostAddress.length > 10 &&
    fxHint != null &&
    !(uneven && Math.abs(remainder) > 0.001) &&
    !pending

  const previewShares = shares.slice(0, 2)
  const moreCount = Math.max(0, shares.length - previewShares.length)

  function onConnectClick() {
    wallet.connect().catch(() => undefined)
  }

  const dock = (
    <>
      {needsWallet && !manualAddress.trim() ? (
        <button
          type="button"
          className="cta"
          disabled={wallet.busy || wallet.checking}
          onClick={onConnectClick}
        >
          {wallet.busy ? 'Connecting…' : 'Connect'}
        </button>
      ) : (
        <button type="button" className="cta" disabled={!canCreate} onClick={create}>
          {pending
            ? 'Creating…'
            : uneven && Math.abs(remainder) > 0.001
              ? `Still ${Math.abs(remainder).toFixed(2)} left`
              : 'Split it'}
        </button>
      )}
    </>
  )

  return (
    <AppShell tone="create" hideHero dock={dock}>
      <NimiqPayInvite open={wallet.needsPayApp} onClose={wallet.dismissPayInvite} />
      <header className="flex items-center justify-between gap-3">
        <TabLogo size={28} />
        <div className="flex items-center gap-2">
          {wallet.connected && wallet.address && wallet.short && (
            <WalletBar
              connected
              address={wallet.address}
              short={wallet.short}
              onConnect={onConnectClick}
              onDisconnect={wallet.disconnect}
            />
          )}
          <NetworkBadge />
        </div>
      </header>

      <TabRecents />

      <p className="nim-rail" role="note">
        Settles in <strong>NIM</strong> · feeless · ~1s
      </p>

      <section className="stack-section stack-group">
        <div className="flex items-center justify-between gap-4">
          <label className="label" htmlFor="bill-total">
            Total
          </label>
          <span id="bill-currency" className="label">
            USD
          </span>
        </div>
        <div className="money-entry">
          <input
            id="bill-total"
            className="field field--compact"
            inputMode="decimal"
            placeholder="0.00"
            value={total}
            onChange={(e) => {
              setTotal(e.target.value.replace(/[^0-9.]/g, ''))
              setUneven(null)
            }}
            autoFocus
            autoComplete="off"
            aria-describedby="bill-currency"
          />
        </div>
        <FxConvertLive nim={nimEstimate} error={fxError} />
      </section>

      <section className="stack-section">
        <div className="flex items-center justify-between gap-4">
          <label className="label" htmlFor="people-count">
            People
          </label>
          <div className="flex items-center gap-3">
            <Pressable
              type="button"
              className="stepper-btn"
              onClick={() => bumpPeople(-1)}
              aria-label="Fewer people"
            >
              −
            </Pressable>
            <span id="people-count" className="people-count">
              {people}
            </span>
            <Pressable
              type="button"
              className="stepper-btn"
              onClick={() => bumpPeople(1)}
              aria-label="More people"
            >
              +
            </Pressable>
          </div>
        </div>
        <PeopleFaceStack count={people} maxVisible={4} />
      </section>

      {/* Address BEFORE shares — must stay on-screen while splitting */}
      {showManualPayTo && (
        <section className="stack-section stack-group">
          <label className="label" htmlFor="pay-to">
            Pay to
          </label>
          <input
            id="pay-to"
            className="input-line mono"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="NQ…"
            autoComplete="off"
            spellCheck={false}
          />
        </section>
      )}

      {shares.length > 0 && (
        <section className="stack-section">
          <div className="mb-1 flex items-center justify-between">
            <span className="label">Shares</span>
            {uneven && (
              <span
                className={`mono text-[12px] ${Math.abs(remainder) > 0.001 ? 'text-alert' : 'text-paid'}`}
              >
                Left {remainder.toFixed(2)}
              </span>
            )}
          </div>
          {(uneven ? shares : previewShares).map((s, i) => (
            <div key={i} className="share-row share-row--tight">
              <span className="people-face people-face--row" aria-hidden>
                {faceForIndex(i)}
              </span>
              <span className="share-idx">{String(i + 1).padStart(2, '0')}</span>
              <input
                className="money-md flex-1 border-0 bg-transparent outline-none"
                inputMode="decimal"
                value={s.toFixed(2)}
                onChange={(e) => editShare(i, e.target.value)}
                aria-label={`Share ${i + 1}`}
              />
              {fxHint ? <ShareNimLive nim={s / fxHint} /> : null}
            </div>
          ))}
          {!uneven && moreCount > 0 && (
            <div className="perf flex items-center justify-center py-2">
              <span className="text-[13px] text-muted">+ {moreCount} more</span>
            </div>
          )}
        </section>
      )}

      {error && (
        <p className="stack-section text-[14px] font-semibold text-alert">{error}</p>
      )}

      <p className="stack-section pb-2 text-center text-[12px] text-muted">
        <Link href="/press" className="underline underline-offset-2">
          Press kit
        </Link>
      </p>
    </AppShell>
  )
}
