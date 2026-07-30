'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pressable } from '@/components/anim/Pressable'
import { TabLogo } from '@/components/TabLogo'
import { AppShell } from '@/components/AppShell'

const ONE_LINER =
  'Tab splits a restaurant bill into feeless NIM requests — settled before you leave the table.'

const WHO =
  'Groups of 3–8 friends (20–35) who eat out and have at least one crypto-curious person at the table. The host opens Tab in Nimiq Pay; guests pay from any phone.'

const DEMO_60S = [
  '0:00 — Host opens Tab in Nimiq Pay, types $84, picks 6 people.',
  '0:15 — Share QR / links. Guests open pay links.',
  '0:30 — One-tap NIM pay. Host board ticks 1/6 → 6/6 live.',
  '0:45 — Party card shows CLEARED. Host signs receipt.',
  '0:55 — Screenshot the clear. “Tab cleared · 6 people · $84.”',
]

const SHARE_LINES = [
  'Just cleared a 6-person tab in NIM before we left the table — feeless.',
  'Splitwise records the debt. Tab clears it. gettab.vercel.app',
  'Tab cleared · 6 people · $84.00 USD — party progress you can screenshot.',
]

const SHOTS = [
  'Create: total + face stack with +N overflow',
  'Board: party card mid-progress (3/6) with +1 settled flash',
  'Pay success: You’re clear + Flex this',
  'Receipt: CLEARED party card + verified stamp',
]

/**
 * Marketing & distribution pack — app-store-ready copy for the competition submission.
 */
export function PressPack() {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 1400)
    } catch {
      /* ignore */
    }
  }

  return (
    <AppShell
      tone="receipt"
      hideHero
      dock={
        <Pressable
          type="button"
          className="cta"
          onClick={() =>
            copy(
              'pack',
              [
                ONE_LINER,
                '',
                `Who: ${WHO}`,
                '',
                'Live: https://gettab.vercel.app',
                '',
                'Demo (60s):',
                ...DEMO_60S,
                '',
                'Share lines:',
                ...SHARE_LINES.map((s) => `• ${s}`),
              ].join('\n'),
            )
          }
        >
          {copied === 'pack' ? 'Copied pack' : 'Copy full pack'}
        </Pressable>
      }
    >
      <header className="flex items-center justify-between gap-3">
        <TabLogo size={28} />
        <Link href="/" className="chip-btn chip-btn--ghost">
          Open Tab
        </Link>
      </header>

      <p className="eyebrow mt-5">Submission kit</p>
      <h1 className="title mt-2">Press &amp; demo pack</h1>
      <p className="body mt-2 text-muted">
        Built for Marketing &amp; distribution (25 pts) — copy, story, shots.
      </p>

      <section className="press-block">
        <div className="flex items-center justify-between gap-3">
          <h2 className="press-h">One-liner</h2>
          <button type="button" className="press-copy" onClick={() => copy('one', ONE_LINER)}>
            {copied === 'one' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="press-body">{ONE_LINER}</p>
      </section>

      <section className="press-block">
        <h2 className="press-h">Who it&apos;s for</h2>
        <p className="press-body">{WHO}</p>
      </section>

      <section className="press-block">
        <h2 className="press-h">60-second demo</h2>
        <ol className="press-list">
          {DEMO_60S.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>

      <section className="press-block">
        <h2 className="press-h">Screenshot checklist</h2>
        <ul className="press-list press-list--bullets">
          {SHOTS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="press-block">
        <h2 className="press-h">Share lines</h2>
        <ul className="press-shares">
          {SHARE_LINES.map((line) => (
            <li key={line}>
              <p className="press-body">{line}</p>
              <button type="button" className="press-copy" onClick={() => copy(line, line)}>
                {copied === line ? 'Copied' : 'Copy'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="press-block">
        <h2 className="press-h">NIM incentive</h2>
        <p className="press-body">
          Tab is NIM-first: feeless settlement on small shares. That&apos;s the only reason
          &quot;cleared before you leave&quot; is true — card rails eat a $7 split.
        </p>
      </section>

      <section className="press-block">
        <h2 className="press-h">Links</h2>
        <p className="press-body mono text-[13px]">
          Live · https://gettab.vercel.app
          <br />
          Kit · https://gettab.vercel.app/press
        </p>
      </section>
    </AppShell>
  )
}
