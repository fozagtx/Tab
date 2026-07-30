'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  readTabHistory,
  readTabStats,
  type TabHistoryEntry,
  type TabStats,
} from '@/lib/tab-history'

function hrefFor(entry: TabHistoryEntry) {
  if (entry.status === 'cleared') return `/r/${entry.code}`
  if (entry.role === 'host' && entry.hostToken) {
    return `/t/${entry.code}?host_token=${encodeURIComponent(entry.hostToken)}`
  }
  return `/t/${entry.code}`
}

/**
 * Repeat-open surface: streak + recent tabs so people come back after dinner #1.
 */
export function TabRecents() {
  const [history, setHistory] = useState<TabHistoryEntry[]>([])
  const [stats, setStats] = useState<TabStats | null>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setHistory(readTabHistory())
      setStats(readTabStats())
    })
    return () => cancelAnimationFrame(id)
  }, [])

  if (!stats || (stats.hosted === 0 && stats.paid === 0 && history.length === 0)) {
    return null
  }

  const openOnes = history.filter((h) => h.status === 'open').slice(0, 4)
  const recent = (openOnes.length ? openOnes : history).slice(0, 4)

  return (
    <section className="tab-recents stack-section">
      <div className="tab-recents__stats" aria-label="Your Tab stats">
        <div className="tab-stat">
          <span className="tab-stat__num">{stats.streak}</span>
          <span className="tab-stat__label">day streak</span>
        </div>
        <div className="tab-stat">
          <span className="tab-stat__num">{stats.clears}</span>
          <span className="tab-stat__label">clears</span>
        </div>
        <div className="tab-stat">
          <span className="tab-stat__num">{stats.hosted + stats.paid}</span>
          <span className="tab-stat__label">tabs</span>
        </div>
      </div>

      {recent.length > 0 && (
        <>
          <p className="label mt-3">Your tabs</p>
          <ul className="tab-recents__list">
            {recent.map((h) => (
              <li key={h.code}>
                <Link href={hrefFor(h)} className="tab-recent-row">
                  <span className="tab-recent-row__code mono">{h.code}</span>
                  <span className="tab-recent-row__meta">
                    {h.settled}/{h.partySize}
                    {h.status === 'cleared' ? ' · cleared' : ' · open'}
                  </span>
                  <span className="tab-recent-row__amt mono">
                    {h.totalFiat.toFixed(2)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
