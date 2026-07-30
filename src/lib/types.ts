/** Tab domain types */

export type TabStatus = 'open' | 'settled' | 'expired'
export type ShareStatus = 'unpaid' | 'pending' | 'paid' | 'marked' | 'mismatch'

export interface Tab {
  code: string
  host_token: string
  host_address: string
  host_device_id: string | null
  currency: string
  total_luna: number
  fx_rate: number
  title: string | null
  status: TabStatus
  created_at: string
  expires_at: string
}

export interface Share {
  id: string
  tab_code: string
  index: number
  label: string | null
  amount_luna: number
  memo: string
  fingerprint: number
  status: ShareStatus
  tx_hash: string | null
  paid_at: string | null
}

export interface Receipt {
  tab_code: string
  canonical: string
  signer: string
  public_key: string
  signature: string
  created_at: string
}

export interface PublicTab {
  code: string
  host_address: string
  currency: string
  total_luna: number
  fx_rate: number
  title: string | null
  status: TabStatus
  created_at: string
  expires_at: string
  shares: Omit<Share, 'id'>[]
  is_host?: boolean
}

import { explorerTxUrl } from './nimiq/network'

export const LUNA_PER_NIM = 100_000

/** Explorer deep-link for a transaction hash (network-aware). */
export const EXPLORER_TX = (hash: string) => explorerTxUrl(hash)
