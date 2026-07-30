/**
 * Data access.
 * Uses Supabase when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 * Otherwise uses a JSON file store under .data/ so local golden-path works.
 */

import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
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

function supabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export function usingSupabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
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

  const sb = supabase()
  if (sb) {
    const { error: e1 } = await sb.from('tabs').insert(tab)
    if (e1) throw e1
    const { error: e2 } = await sb.from('shares').insert(shares)
    if (e2) throw e2
    return { tab, shares }
  }

  const store = await loadFileStore()
  store.tabs[tab.code] = tab
  store.shares[tab.code] = shares
  await persist(store)
  return { tab, shares }
}

export async function getTab(code: string): Promise<Tab | null> {
  const sb = supabase()
  if (sb) {
    const { data, error } = await sb.from('tabs').select('*').eq('code', code).maybeSingle()
    if (error) throw error
    return data as Tab | null
  }
  const store = await loadFileStore()
  return store.tabs[code.toUpperCase()] ?? store.tabs[code] ?? null
}

export async function getShares(code: string): Promise<Share[]> {
  const sb = supabase()
  if (sb) {
    const { data, error } = await sb
      .from('shares')
      .select('*')
      .eq('tab_code', code)
      .order('index')
    if (error) throw error
    return (data as Share[]) ?? []
  }
  const store = await loadFileStore()
  return (store.shares[code.toUpperCase()] ?? store.shares[code] ?? []).slice().sort((a, b) => a.index - b.index)
}

export async function updateShare(
  code: string,
  index: number,
  patch: Partial<Pick<Share, 'label' | 'amount_luna' | 'status' | 'tx_hash' | 'paid_at'>>,
): Promise<Share | null> {
  const sb = supabase()
  if (sb) {
    const { data, error } = await sb
      .from('shares')
      .update(patch)
      .eq('tab_code', code)
      .eq('index', index)
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data as Share | null
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
  const sb = supabase()
  if (sb) {
    const { error } = await sb.from('tabs').update({ status }).eq('code', code)
    if (error) throw error
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
  const sb = supabase()
  if (sb) {
    const { error } = await sb.from('receipts').upsert(full)
    if (error) throw error
    return full
  }
  const store = await loadFileStore()
  store.receipts[receipt.tab_code] = full
  await persist(store)
  return full
}

export async function getReceipt(code: string): Promise<Receipt | null> {
  const sb = supabase()
  if (sb) {
    const { data, error } = await sb.from('receipts').select('*').eq('tab_code', code).maybeSingle()
    if (error) throw error
    return data as Receipt | null
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
  const sb = supabase()
  if (sb) {
    await sb.from('unmatched_txs').upsert(opts)
    return
  }
  const store = await loadFileStore()
  if (!store.unmatched.some((u) => u.tx_hash === opts.tx_hash)) {
    store.unmatched.push(opts)
    await persist(store)
  }
}

export async function countTabsByDevice(deviceId: string, sinceIso: string): Promise<number> {
  const sb = supabase()
  if (sb) {
    const { count, error } = await sb
      .from('tabs')
      .select('*', { count: 'exact', head: true })
      .eq('host_device_id', deviceId)
      .gte('created_at', sinceIso)
    if (error) throw error
    return count ?? 0
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
