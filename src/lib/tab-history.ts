/** Client-only tab memory — drives repeat opens + clear streak. */

export type HistoryRole = 'host' | 'guest'

export type TabHistoryEntry = {
  code: string
  role: HistoryRole
  title: string | null
  currency: string
  totalFiat: number
  partySize: number
  settled: number
  status: 'open' | 'cleared' | 'expired'
  updatedAt: string
  hostToken?: string | null
}

export type TabStats = {
  clears: number
  /** Consecutive calendar days with ≥1 clear (local). */
  streak: number
  lastClearDay: string | null
  hosted: number
  paid: number
}

const HISTORY_KEY = 'tab-history-v1'
const STATS_KEY = 'tab-stats-v1'
const MAX_ENTRIES = 24

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

function yesterdayKey(from = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota / private mode */
  }
}

export function readTabHistory(): TabHistoryEntry[] {
  const list = readJson<TabHistoryEntry[]>(HISTORY_KEY, [])
  return Array.isArray(list) ? list : []
}

export function readTabStats(): TabStats {
  return readJson<TabStats>(STATS_KEY, {
    clears: 0,
    streak: 0,
    lastClearDay: null,
    hosted: 0,
    paid: 0,
  })
}

function writeStats(next: TabStats) {
  writeJson(STATS_KEY, next)
}

function noteClear() {
  const cur = readTabStats()
  const today = dayKey()
  let streak = 1
  if (cur.lastClearDay === today) {
    streak = Math.max(1, cur.streak)
  } else if (cur.lastClearDay === yesterdayKey()) {
    streak = cur.streak + 1
  }
  writeStats({
    ...cur,
    clears: cur.clears + 1,
    streak,
    lastClearDay: today,
  })
}

function noteHosted() {
  const cur = readTabStats()
  writeStats({ ...cur, hosted: cur.hosted + 1 })
}

function notePaid() {
  const cur = readTabStats()
  writeStats({ ...cur, paid: cur.paid + 1 })
}

function upsert(entry: TabHistoryEntry): TabHistoryEntry[] {
  const list = readTabHistory()
  const without = list.filter((e) => e.code !== entry.code)
  const next = [entry, ...without].slice(0, MAX_ENTRIES)
  writeJson(HISTORY_KEY, next)
  return next
}

export function rememberHostedTab(input: {
  code: string
  title?: string | null
  currency: string
  totalFiat: number
  partySize: number
  hostToken?: string | null
}) {
  const prev = readTabHistory().find((e) => e.code === input.code)
  if (!prev) noteHosted()
  return upsert({
    code: input.code,
    role: 'host',
    title: input.title ?? null,
    currency: input.currency,
    totalFiat: input.totalFiat,
    partySize: input.partySize,
    settled: prev?.settled ?? 0,
    status: prev?.status === 'cleared' ? 'cleared' : 'open',
    updatedAt: new Date().toISOString(),
    hostToken: input.hostToken ?? prev?.hostToken ?? null,
  })
}

export function rememberGuestPaid(input: {
  code: string
  title?: string | null
  currency: string
  totalFiat: number
  partySize: number
  settled: number
  cleared?: boolean
}) {
  const prev = readTabHistory().find((e) => e.code === input.code)
  const role: HistoryRole = prev?.role === 'host' ? 'host' : 'guest'
  if (role === 'guest' && !prev) notePaid()

  const status = input.cleared ? 'cleared' : 'open'
  if (status === 'cleared' && prev?.status !== 'cleared') noteClear()

  return upsert({
    code: input.code,
    role,
    title: input.title ?? null,
    currency: input.currency,
    totalFiat: input.totalFiat,
    partySize: input.partySize,
    settled: input.settled,
    status,
    updatedAt: new Date().toISOString(),
    hostToken: prev?.hostToken,
  })
}

export function rememberBoardProgress(input: {
  code: string
  title?: string | null
  currency: string
  totalFiat: number
  partySize: number
  settled: number
  status: 'open' | 'cleared' | 'expired'
  hostToken?: string | null
  isHost?: boolean
}) {
  const prev = readTabHistory().find((e) => e.code === input.code)
  if (input.status === 'cleared' && prev?.status !== 'cleared') noteClear()

  return upsert({
    code: input.code,
    role: prev?.role || (input.isHost || input.hostToken ? 'host' : 'guest'),
    title: input.title ?? null,
    currency: input.currency,
    totalFiat: input.totalFiat,
    partySize: input.partySize,
    settled: input.settled,
    status: input.status,
    updatedAt: new Date().toISOString(),
    hostToken: input.hostToken ?? prev?.hostToken,
  })
}
