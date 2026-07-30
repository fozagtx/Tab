/**
 * Data access.
 * Uses Postgres (Neon) when DATABASE_URL is set.
 * Otherwise uses a JSON file store under .data/ so local golden-path works.
 */

import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { neon } from '@neondatabase/serverless'
import type { Receipt, Share, ShareStatus, Tab, TabStatus } from './types'

type Store = {
  tabs: Record<string, Tab>
  shares: Record<string, Share[]>
  receipts: Record<string, Receipt>
  unmatched: { tx_hash: string; tab_code: string; value_luna: number; memo: string | null }[]
}

const DATA_DIR = path.join(process.cwd(), '.data')
const DATA_FILE = path.join(DATA_DIR, 'store.json')

function emptyStore(): Store {
  return { tabs: {}, shares: {}, receipts: {}, unmatched: [] }
}

let memory: Store | null = null
let writeQueue: Promise<void> = Promise.resolve()

async function loadFileStore(): Promise<Store> {
  if (memory) return memory
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    memory = JSON.parse(raw) as Store
  } catch {
    memory = emptyStore()
  }
  return memory
}

function persist(store: Store) {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2))
  })
  return writeQueue
}

type Sql = ReturnType<typeof neon>
let cachedSql: Sql | null | undefined

function sql(): Sql | null {
  if (cachedSql !== undefined) return cachedSql
  const url = process.env.DATABASE_URL
  cachedSql = url ? neon(url) : null
  return cachedSql
}

export function usingDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

/* Postgres returns bigint/numeric as strings and timestamptz as Date — coerce
   at the boundary so the rest of the app keeps doing plain number math. */
type Row = Record<string, unknown>

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v))
const isoOrNull = (v: unknown): string | null => (v == null ? null : iso(v))
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v))

function rowToTab(r: Row): Tab {
  return {
    code: String(r.code),
    host_token: String(r.host_token),
    host_address: String(r.host_address),
    host_device_id: strOrNull(r.host_device_id),
    currency: String(r.currency),
    total_luna: Number(r.total_luna),
    fx_rate: Number(r.fx_rate),
    title: strOrNull(r.title),
    status: r.status as TabStatus,
    created_at: iso(r.created_at),
    expires_at: iso(r.expires_at),
  }
}

function rowToShare(r: Row): Share {
  return {
    id: String(r.id),
    tab_code: String(r.tab_code),
    index: Number(r.index),
    label: strOrNull(r.label),
    amount_luna: Number(r.amount_luna),
    memo: String(r.memo),
    fingerprint: Number(r.fingerprint),
    status: r.status as ShareStatus,
    tx_hash: strOrNull(r.tx_hash),
    paid_at: isoOrNull(r.paid_at),
  }
}

function rowToReceipt(r: Row): Receipt {
  return {
    tab_code: String(r.tab_code),
    canonical: String(r.canonical),
    signer: String(r.signer),
    public_key: String(r.public_key),
    signature: String(r.signature),
    created_at: iso(r.created_at),
  } as Receipt
}

export async function createTab(input: {
  code: string
  host_token: string
  host_address: string
  host_device_id: string | null
  currency: string
  total_luna: number
  fx_rate: number
  title: string | null
  expires_at: string
  shares: {
    index: number
    label: string | null
    amount_luna: number
    memo: string
    fingerprint: number
  }[]
}): Promise<{ tab: Tab; shares: Share[] }> {
  const now = new Date().toISOString()
  const tab: Tab = {
    code: input.code,
    host_token: input.host_token,
    host_address: input.host_address,
    host_device_id: input.host_device_id,
    currency: input.currency,
    total_luna: input.total_luna,
    fx_rate: input.fx_rate,
    title: input.title,
    status: 'open',
    created_at: now,
    expires_at: input.expires_at,
  }
  const shares: Share[] = input.shares.map((s) => ({
    id: randomUUID(),
    tab_code: input.code,
    index: s.index,
    label: s.label,
    amount_luna: s.amount_luna,
    memo: s.memo,
    fingerprint: s.fingerprint,
    status: 'unpaid',
    tx_hash: null,
    paid_at: null,
  }))

  const q = sql()
  if (q) {
    await q`
      insert into tabs (code, host_token, host_address, host_device_id, currency,
                        total_luna, fx_rate, title, status, created_at, expires_at)
      values (${tab.code}, ${tab.host_token}, ${tab.host_address}, ${tab.host_device_id},
              ${tab.currency}, ${tab.total_luna}, ${tab.fx_rate}, ${tab.title},
              ${tab.status}, ${tab.created_at}, ${tab.expires_at})`
    await Promise.all(
      shares.map(
        (s) => q`
          insert into shares (id, tab_code, "index", label, amount_luna, memo, fingerprint, status)
          values (${s.id}, ${s.tab_code}, ${s.index}, ${s.label}, ${s.amount_luna},
                  ${s.memo}, ${s.fingerprint}, ${s.status})`,
      ),
    )
    return { tab, shares }
  }

  const store = await loadFileStore()
  store.tabs[tab.code] = tab
  store.shares[tab.code] = shares
  await persist(store)
  return { tab, shares }
}

export async function getTab(code: string): Promise<Tab | null> {
  const q = sql()
  if (q) {
    const rows = (await q`select * from tabs where code = ${code.toUpperCase()}`) as Row[]
    return rows[0] ? rowToTab(rows[0]) : null
  }
  const store = await loadFileStore()
  return store.tabs[code.toUpperCase()] ?? store.tabs[code] ?? null
}

export async function getShares(code: string): Promise<Share[]> {
  const q = sql()
  if (q) {
    const rows = (await q`
      select * from shares where tab_code = ${code.toUpperCase()} order by "index"`) as Row[]
    return rows.map(rowToShare)
  }
  const store = await loadFileStore()
  return (store.shares[code.toUpperCase()] ?? store.shares[code] ?? []).slice().sort((a, b) => a.index - b.index)
}

export async function updateShare(
  code: string,
  index: number,
  patch: Partial<Pick<Share, 'label' | 'amount_luna' | 'status' | 'tx_hash' | 'paid_at'>>,
): Promise<Share | null> {
  const q = sql()
  if (q) {
    const rows = (await q`
      select * from shares where tab_code = ${code.toUpperCase()} and "index" = ${index}`) as Row[]
    if (!rows[0]) return null
    const merged: Share = { ...rowToShare(rows[0]), ...patch }
    await q`
      update shares
      set label = ${merged.label}, amount_luna = ${merged.amount_luna},
          status = ${merged.status}, tx_hash = ${merged.tx_hash}, paid_at = ${merged.paid_at}
      where tab_code = ${code.toUpperCase()} and "index" = ${index}`
    return merged
  }
  const store = await loadFileStore()
  const list = store.shares[code] ?? store.shares[code.toUpperCase()]
  if (!list) return null
  const share = list.find((s) => s.index === index)
  if (!share) return null
  Object.assign(share, patch)
  await persist(store)
  return share
}

export async function settleShareByTx(
  code: string,
  index: number,
  txHash: string,
  status: ShareStatus = 'paid',
): Promise<Share | null> {
  return updateShare(code, index, {
    status,
    tx_hash: txHash,
    paid_at: new Date().toISOString(),
  })
}

export async function setTabStatus(code: string, status: TabStatus): Promise<void> {
  const q = sql()
  if (q) {
    await q`update tabs set status = ${status} where code = ${code.toUpperCase()}`
    return
  }
  const store = await loadFileStore()
  const tab = store.tabs[code] ?? store.tabs[code.toUpperCase()]
  if (tab) {
    tab.status = status
    await persist(store)
  }
}

export async function saveReceipt(receipt: Omit<Receipt, 'created_at'>): Promise<Receipt> {
  const full: Receipt = { ...receipt, created_at: new Date().toISOString() }
  const q = sql()
  if (q) {
    await q`
      insert into receipts (tab_code, canonical, signer, public_key, signature, created_at)
      values (${full.tab_code}, ${full.canonical}, ${full.signer}, ${full.public_key},
              ${full.signature}, ${full.created_at})
      on conflict (tab_code) do update
      set canonical = excluded.canonical, signer = excluded.signer,
          public_key = excluded.public_key, signature = excluded.signature,
          created_at = excluded.created_at`
    return full
  }
  const store = await loadFileStore()
  store.receipts[receipt.tab_code] = full
  await persist(store)
  return full
}

export async function getReceipt(code: string): Promise<Receipt | null> {
  const q = sql()
  if (q) {
    const rows = (await q`select * from receipts where tab_code = ${code.toUpperCase()}`) as Row[]
    return rows[0] ? rowToReceipt(rows[0]) : null
  }
  const store = await loadFileStore()
  return store.receipts[code] ?? store.receipts[code.toUpperCase()] ?? null
}

export async function parkUnmatched(opts: {
  tx_hash: string
  tab_code: string
  value_luna: number
  memo: string | null
}): Promise<void> {
  const q = sql()
  if (q) {
    await q`
      insert into unmatched_txs (tx_hash, tab_code, value_luna, memo)
      values (${opts.tx_hash}, ${opts.tab_code}, ${opts.value_luna}, ${opts.memo})
      on conflict (tx_hash) do nothing`
    return
  }
  const store = await loadFileStore()
  if (!store.unmatched.some((u) => u.tx_hash === opts.tx_hash)) {
    store.unmatched.push(opts)
    await persist(store)
  }
}

export async function countTabsByDevice(deviceId: string, sinceIso: string): Promise<number> {
  const q = sql()
  if (q) {
    const rows = (await q`
      select count(*)::int as n from tabs
      where host_device_id = ${deviceId} and created_at >= ${sinceIso}`) as Row[]
    return rows[0] ? Number(rows[0].n) : 0
  }
  const store = await loadFileStore()
  return Object.values(store.tabs).filter(
    (t) => t.host_device_id === deviceId && t.created_at >= sinceIso,
  ).length
}

export function publicTabView(tab: Tab, shares: Share[], isHost = false) {
  return {
    code: tab.code,
    host_address: tab.host_address,
    currency: tab.currency,
    total_luna: tab.total_luna,
    fx_rate: Number(tab.fx_rate),
    title: tab.title,
    status: tab.status,
    created_at: tab.created_at,
    expires_at: tab.expires_at,
    is_host: isHost,
    shares: shares.map((share) => {
      const { id: _omit, ...publicShare } = share
      void _omit
      return publicShare
    }),
  }
}
