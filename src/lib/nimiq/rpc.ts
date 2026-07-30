/**
 * Nimiq history client.
 * Prefers nimiq.watch REST (works on testnet + mainnet).
 * Falls back to JSON-RPC when NIMIQ_RPC_URL is set / mainnet default.
 */

import { networkConfig } from './network'

export type RpcTx = {
  hash: string
  from: string
  to: string
  value: number
  fee: number
  senderData: string
  recipientData: string
  timestamp: number
  blockNumber: number
  confirmations?: number
}

type WatchTx = {
  hash: string
  sender_address: string
  receiver_address: string
  value: number
  fee: number
  data?: string
  timestamp: number
  block_height: number
  confirmations?: number
}

function historyBase(): string {
  return networkConfig().historyApi.replace(/\/$/, '')
}

function encodeAddress(address: string): string {
  return address.trim().replace(/\s+/g, '+')
}

function fromWatch(tx: WatchTx): RpcTx {
  return {
    hash: tx.hash,
    from: tx.sender_address,
    to: tx.receiver_address,
    value: tx.value,
    fee: tx.fee ?? 0,
    senderData: '',
    recipientData: tx.data || '',
    timestamp: tx.timestamp,
    blockNumber: tx.block_height,
    confirmations: tx.confirmations,
  }
}

async function watchGet<T>(path: string): Promise<T> {
  const res = await fetch(`${historyBase()}${path}`, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`History API HTTP ${res.status}`)
  return (await res.json()) as T
}

async function rpcJson<T>(method: string, params: unknown[]): Promise<T> {
  const url = networkConfig().rpcUrl
  if (!url) throw new Error('No JSON-RPC URL configured')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)
  const body = await res.json()
  if (body.error) throw new Error(`RPC ${method}: ${body.error.message}`)
  const result = body.result
  if (result && typeof result === 'object' && 'data' in result) return result.data as T
  return result as T
}

export async function getBlockNumber(): Promise<number> {
  try {
    const latest = await watchGet<{ height: number }[]>('/latest/1')
    if (latest?.[0]?.height != null) return latest[0].height
  } catch {
    /* fall through */
  }
  return rpcJson<number>('getBlockNumber', [])
}

export async function getTransactionsByAddress(
  address: string,
  max = 50,
): Promise<RpcTx[]> {
  try {
    const rows = await watchGet<WatchTx[]>(
      `/account-transactions/${encodeAddress(address)}/${max}/0`,
    )
    if (Array.isArray(rows)) return rows.map(fromWatch)
  } catch {
    /* fall through */
  }
  return rpcJson<RpcTx[]>('getTransactionsByAddress', [address, max, null])
}

export async function getTransactionByHash(hash: string): Promise<RpcTx | null> {
  try {
    const row = await watchGet<WatchTx | null>(`/transaction/${hash}`)
    if (row && row.hash) return fromWatch(row)
  } catch {
    /* fall through */
  }
  try {
    return await rpcJson<RpcTx>('getTransactionByHash', [hash])
  } catch {
    return null
  }
}

/** Decode recipient/sender data field to UTF-8 text when hex-encoded. */
export function decodeTxData(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (/^TAB\s+/i.test(raw)) return raw
  const clean = raw.replace(/^0x/i, '')
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
    return raw
  }
  try {
    const bytes = new Uint8Array(clean.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
    }
    const text = new TextDecoder().decode(bytes)
    return text || null
  } catch {
    return raw
  }
}

export function toChainTx(tx: RpcTx) {
  return {
    hash: tx.hash,
    to: tx.to,
    value: tx.value,
    data: decodeTxData(tx.recipientData) || decodeTxData(tx.senderData),
  }
}
