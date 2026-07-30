'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import QRCode from 'qrcode'
import { formatNimFixed, lunaToFiat, payableLuna } from '@/lib/amounts'
import { deeplinkFor, getNimiq, sendSharePayment } from '@/lib/nimiq/provider'
import { EXPLORER_TX, type PublicTab } from '@/lib/types'
import { MotionItem } from '@/components/anim/MotionShell'
import { Pressable } from '@/components/anim/Pressable'
import { RiveCheck } from '@/components/anim/RiveCheck'
import { RiveLoader } from '@/components/anim/RiveLoader'
import { CopyFlash } from '@/components/anim/CopyFlash'
import { FxConvertLive } from '@/components/FxConvertLive'
import { NetworkBadge } from '@/components/NetworkBadge'
import { NimiqPayInvite } from '@/components/NimiqPayInvite'
import { TabLogo } from '@/components/TabLogo'
import { useNimiqWallet, WalletBar } from '@/components/WalletBar'
import { AppShell } from '@/components/AppShell'
import { PartyCard } from '@/components/PartyCard'
import { rememberGuestPaid } from '@/lib/tab-history'

function parseStub(stub: string) {
  const m = stub.toUpperCase().match(/^([2-9A-HJ-NP-Z]{6})-(\d{1,2})$/)
  if (!m) return null
  return { code: m[1], index: Number(m[2]) }
}

export function PayPanel({ stub }: { stub: string }) {
  const parsed = useMemo(() => parseStub(stub), [stub])
  const [tab, setTab] = useState<PublicTab | null>(null)
  const [inside, setInside] = useState<boolean | null>(null)
  const [walletQr, setWalletQr] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const wallet = useNimiqWallet()

  const index = parsed?.index ?? null
  const code = parsed?.code ?? null

  useEffect(() => {
    if (!parsed) return
    let cancelled = false
    ;(async () => {
      const nimiq = await getNimiq()
      if (cancelled) return
      setInside(nimiq !== null)
      const res = await fetch(`/api/tabs/${parsed.code}`)
      const data = await res.json()
      if (cancelled) return
      if (!res.ok) {
        setError(data.error || 'Tab not found')
        return
      }
      setTab(data)
    })()
    return () => {
      cancelled = true
    }
  }, [parsed])

  const share = useMemo(
    () => (tab && index != null ? tab.shares.find((s) => s.index === index) : null),
    [tab, index],
  )

  const payLuna = share ? payableLuna(share.amount_luna, share.fingerprint) : 0

  useEffect(() => {
    if (!tab || !share) return
    if (share.status !== 'paid' && !txHash) return
    const settled =
      tab.shares.filter((s) => ['paid', 'marked'].includes(s.status)).length +
      (share.status !== 'paid' && txHash ? 1 : 0)
    const settledSafe = Math.min(tab.shares.length, Math.max(settled, 1))
    rememberGuestPaid({
      code: tab.code,
      title: tab.title,
      currency: tab.currency,
      totalFiat: lunaToFiat(tab.total_luna, tab.fx_rate),
      partySize: tab.shares.length,
      settled: settledSafe,
      cleared: settledSafe >= tab.shares.length,
    })
  }, [tab, share, txHash])

  useEffect(() => {
    if (!tab || !share) return
    const text = `${tab.host_address}\n${formatNimFixed(payLuna)} NIM\n${share.memo}`
    let cancelled = false
    QRCode.toDataURL(text, {
      margin: 1,
      width: 360,
      color: { dark: '#1F2348', light: '#FBFAF7' },
    }).then((url) => {
      if (!cancelled) setWalletQr(url)
    })
    return () => {
      cancelled = true
    }
  }, [tab, share, payLuna])

  function copy(label: string, value: string) {
    navigator.clipboard.writeText(value)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  function payOneTap() {
    if (!tab || !share) return
    startTransition(async () => {
      try {
        const hash = await sendSharePayment({
          recipient: tab.host_address,
          valueLuna: payLuna,
          memo: share.memo,
        })
        setTxHash(hash)
        await fetch(`/api/tabs/${tab.code}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ share_index: share.index, tx_hash: hash }),
        })
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Payment cancelled')
      }
    })
  }

  if (!parsed) {
    return (
      <AppShell tone="pay">
        <p className="text-alert">Bad pay link.</p>
      </AppShell>
    )
  }

  if (error && !tab) {
    return (
      <AppShell tone="pay">
        <p className="text-alert">{error}</p>
      </AppShell>
    )
  }

  if (!tab || !share || index == null || !code) {
    return (
      <AppShell tone="pay" className="flex items-center justify-center gap-3">
        <RiveLoader size={48} variant="pulse" />
        <p className="text-muted">Loading share…</p>
      </AppShell>
    )
  }

  if (tab.status === 'expired') {
    return (
      <AppShell tone="pay">
        <MotionItem>
          <h1 className="text-[28px] font-semibold">Expired</h1>
          <p className="mt-2 text-muted">Ask the host for a new tab.</p>
        </MotionItem>
      </AppShell>
    )
  }

  if (share.status === 'paid' || txHash) {
    const partySize = tab.shares.length
    const settled =
      tab.shares.filter((s) => ['paid', 'marked'].includes(s.status)).length +
      (share.status !== 'paid' && !share.tx_hash && txHash ? 1 : 0)
    const settledSafe = Math.min(partySize, Math.max(settled, 1))
    return (
      <AppShell
        tone="receipt"
        dock={
          <Pressable
            type="button"
            className="cta"
            onClick={async () => {
              const url = `${window.location.origin}/t/${tab.code}`
              const text = `Just settled my share on Tab ${tab.code} · ${settledSafe}/${partySize} paid`
              try {
                if (navigator.share) await navigator.share({ title: 'Tab', text, url })
                else await navigator.clipboard.writeText(`${text}\n${url}`)
              } catch {
                /* cancelled */
              }
            }}
          >
            Flex this
          </Pressable>
        }
      >
        <MotionItem className="flex flex-col items-start gap-3">
          <TabLogo size={28} />
          <div className="flex items-center gap-3">
            <RiveCheck size={56} playKey={txHash || share.tx_hash || 'paid'} />
            <span className="party-card__xp party-card__xp--static" aria-live="polite">
              +1 settled
            </span>
          </div>
          <h1 className="title mt-1">You&apos;re clear</h1>
          <p className="body text-muted">
            Paid in <strong>NIM</strong> — feeless. Party progress updates live.
          </p>
        </MotionItem>
        <MotionItem>
          <PartyCard
            className="mt-5"
            code={tab.code}
            title={tab.title}
            currency={tab.currency}
            totalFiat={lunaToFiat(tab.total_luna, tab.fx_rate)}
            settled={settledSafe}
            partySize={partySize}
            cleared={settledSafe >= partySize}
          />
        </MotionItem>
        {(txHash || share.tx_hash) && (
          <MotionItem>
            <a
              className="mt-4 text-paid underline mono text-[13px]"
              href={EXPLORER_TX(txHash || share.tx_hash || '')}
              target="_blank"
              rel="noreferrer"
            >
              View tx
            </a>
          </MotionItem>
        )}
        {inside === false && (
          <MotionItem>
            <p className="mt-6 text-[15px]">
              Next time:{' '}
              <a className="underline" href="https://www.nimiq.com" target="_blank" rel="noreferrer">
                Nimiq Pay
              </a>
            </p>
          </MotionItem>
        )}
      </AppShell>
    )
  }

  const fiat = lunaToFiat(share.amount_luna, tab.fx_rate).toFixed(2)
  const payLabel = `Pay ${formatNimFixed(payLuna)} NIM`

  const dock = inside ? (
    <>
      {!wallet.connected && (
        <Pressable
          type="button"
          className="cta-secondary"
          disabled={wallet.busy}
          onClick={() => {
            wallet.connect().catch(() => undefined)
          }}
        >
          {wallet.busy ? 'Connecting…' : 'Connect wallet'}
        </Pressable>
      )}
      <Pressable
        type="button"
        className="cta"
        onClick={payOneTap}
        disabled={pending}
        rive={!pending}
      >
        {pending ? (
          <span className="inline-flex items-center gap-2.5">
            <RiveLoader size={28} variant="liquid" />
            Confirming…
          </span>
        ) : (
          payLabel
        )}
      </Pressable>
      {wallet.error && !wallet.needsPayApp && (
        <p className="text-center text-[13px] text-alert">{wallet.error}</p>
      )}
    </>
  ) : (
    <>
      <a
        className="cta-secondary"
        href={deeplinkFor(
          `${typeof window !== 'undefined' ? window.location.host : ''}/p/${stub}`,
        )}
      >
        Open in Nimiq Pay
      </a>
      <button
        type="button"
        className="text-center text-[14px] font-semibold underline"
        onClick={() => wallet.connect().catch(() => undefined)}
      >
        Get Nimiq Pay
      </button>
    </>
  )

  return (
    <AppShell tone="pay" compactHero hideHero={!inside} dock={dock}>
      <NimiqPayInvite open={wallet.needsPayApp} onClose={wallet.dismissPayInvite} />
      <MotionItem>
        <header className="stack-group pt-1">
          <div className="flex items-center justify-between gap-3">
            <TabLogo size={28} />
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
          <p className="eyebrow">
            Share {String(index).padStart(2, '0')} · {tab.code}
          </p>
          <h1 className="money-xl">{fiat}</h1>
          <FxConvertLive
            nim={payLuna / 100_000}
            emptyHint=""
            size="lg"
            prefix=""
            format={(n) => `${formatNimFixed(Math.round(n * 100_000))} NIM`}
          />
          {tab.title && <p className="body">{tab.title}</p>}
        </header>
      </MotionItem>

      {error && (
        <MotionItem>
          <p className="mt-4 text-[14px] text-alert">{error}</p>
        </MotionItem>
      )}

      {inside === false && (
        <MotionItem className="mt-6 flex flex-col gap-3">
          <CopyRow
            label="Address"
            value={tab.host_address}
            copied={copied === 'Address'}
            onCopy={() => copy('Address', tab.host_address)}
          />
          <CopyRow
            label="Amount"
            value={formatNimFixed(payLuna)}
            copied={copied === 'Amount'}
            onCopy={() => copy('Amount', formatNimFixed(payLuna))}
          />
          <CopyRow
            label="Memo"
            value={share.memo}
            copied={copied === 'Memo'}
            onCopy={() => copy('Memo', share.memo)}
          />
          {walletQr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={walletQr} alt="Wallet QR" className="mx-auto mt-2 h-[180px] w-[180px]" />
          )}
          <p className="text-center text-[13px] text-muted">Exact amount + memo.</p>
        </MotionItem>
      )}
    </AppShell>
  )
}

function CopyRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string
  value: string
  onCopy: () => void
  copied: boolean
}) {
  return (
    <Pressable
      type="button"
      onClick={onCopy}
      className="w-full rounded-[14px] border border-paper-edge p-3 text-left"
    >
      <div className="flex justify-between text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        <span>{label}</span>
        <CopyFlash show={copied}>
          <span className={copied ? 'text-paid' : undefined}>{copied ? 'Copied' : 'Copy'}</span>
        </CopyFlash>
      </div>
      <p className="mono mt-1 break-all text-[14px] text-ink">{value}</p>
    </Pressable>
  )
}
