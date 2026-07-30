/**
 * Nimiq Pay provider adapter.
 * Verified against https://nimiq.dev/mini-apps/api-reference/nimiq-provider
 * and @nimiq/mini-app-sdk provider source:
 *   connect()     → listAccounts() (native confirm; caches addresses)
 *   disconnect()  → clears cache + emits "disconnect"
 *   connected     → accounts cached
 *
 * listAccounts / connect MUST run from a user gesture (not on page load).
 */

import {
  getHostLanguage,
  init,
  requestDeviceIdentifier,
  type ErrorResponse,
  type NimiqProvider,
} from '@nimiq/mini-app-sdk'

export type NimiqCtx = NimiqProvider

let cachedProvider: NimiqCtx | null | undefined
/** App-side mirror of the address returned by connect / listAccounts. */
let sessionAddress: string | null = null

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  for (const l of listeners) l()
}

export function subscribeWallet(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === 'object' && value !== null && 'error' in value
}

function unwrap<T>(value: T | ErrorResponse, fallbackMessage: string): T {
  if (isErrorResponse(value)) {
    throw new Error(value.error?.message || fallbackMessage)
  }
  return value
}

/** Resolves the injected provider, or null when we are NOT inside Nimiq Pay. */
export async function getNimiq(timeoutMs = 2500): Promise<NimiqCtx | null> {
  if (cachedProvider !== undefined) return cachedProvider
  try {
    const result = await Promise.race([
      init({ timeout: timeoutMs }),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ])
    cachedProvider = result
    return cachedProvider
  } catch {
    cachedProvider = null
    return null
  }
}

/** Clear cached probe so Connect can re-try init() after a cold open. */
export function resetNimiqCache(): void {
  cachedProvider = undefined
}

export async function isInsideNimiqPay(): Promise<boolean> {
  return (await getNimiq()) !== null
}

/**
 * Connect wallet via SDK.
 * Calls provider.connect() which runs listAccounts() and shows Nimiq Pay's
 * native confirmation. Must be triggered by a user gesture.
 */
export async function connectWallet(): Promise<string> {
  const nimiq = await getNimiq()
  if (!nimiq) {
    throw new Error('Open Tab inside Nimiq Pay to connect.')
  }

  // SDK connect() === listAccounts(); either is fine — use connect for intent.
  await nimiq.connect()
  const accounts = unwrap(await nimiq.listAccounts(), 'Could not list accounts')
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error('No Nimiq address in this wallet.')
  }
  const address = accounts[0]
  if (typeof address !== 'string' || !address.startsWith('NQ')) {
    throw new Error('Unexpected address from Nimiq Pay.')
  }
  sessionAddress = address
  notify()
  return address
}

/** Clear the SDK account cache and local session. */
export function disconnectWallet(): void {
  const nimiq =
    cachedProvider ?? (typeof window !== 'undefined' ? window.nimiq : undefined)
  try {
    nimiq?.disconnect()
  } catch {
    /* ignore */
  }
  sessionAddress = null
  notify()
}

export function getSessionAddress(): string | null {
  return sessionAddress
}

/**
 * If the SDK already has a connected session (accounts cached), mirror the
 * address into app state without prompting. Safe to call on mount.
 */
export async function syncSessionIfConnected(): Promise<string | null> {
  const nimiq = await getNimiq()
  if (!nimiq?.connected) return sessionAddress
  const accounts = unwrap(await nimiq.listAccounts(), 'Could not list accounts')
  if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') return null
  sessionAddress = accounts[0]
  notify()
  return sessionAddress
}

export function isWalletConnected(): boolean {
  const nimiq =
    cachedProvider ?? (typeof window !== 'undefined' ? window.nimiq : undefined)
  return Boolean(sessionAddress || nimiq?.connected)
}

/** Short display form: NQ12 … 3456 */
export function shortAddress(address: string): string {
  const compact = address.replace(/\s+/g, '')
  if (compact.length < 12) return address
  return `${compact.slice(0, 4)}…${compact.slice(-4)}`
}

/**
 * Address for host flows. Prefer session from connectWallet().
 * Does NOT prompt — returns null if not connected yet.
 */
export async function listHostAddress(): Promise<string | null> {
  if (sessionAddress) return sessionAddress
  const nimiq = await getNimiq()
  if (!nimiq?.connected) return null
  const accounts = unwrap(await nimiq.listAccounts(), 'Could not list accounts')
  if (!Array.isArray(accounts) || accounts.length === 0) return null
  const address = accounts[0] ?? null
  if (typeof address === 'string') {
    sessionAddress = address
    notify()
  }
  return sessionAddress
}

export async function sendSharePayment(opts: {
  recipient: string
  valueLuna: number
  memo: string
}): Promise<string> {
  const nimiq = await getNimiq()
  if (!nimiq) throw new Error('Nimiq Pay not available')
  return unwrap(
    await nimiq.sendBasicTransactionWithData({
      recipient: opts.recipient,
      value: opts.valueLuna,
      data: opts.memo,
    }),
    'Payment failed',
  )
}

export async function signReceiptMessage(message: string): Promise<{
  publicKey: string
  signature: string
}> {
  const nimiq = await getNimiq()
  if (!nimiq) throw new Error('Nimiq Pay not available')
  return unwrap(await nimiq.sign(message), 'Sign failed')
}

export async function getDeviceId(): Promise<string | null> {
  try {
    return await requestDeviceIdentifier({
      reason: 'So your tabs stay on this device.',
    })
  } catch {
    return null
  }
}

export function nimiqPayLanguage(): string {
  return getHostLanguage() || (typeof navigator !== 'undefined'
    ? navigator.language?.split('-')[0] || 'en'
    : 'en')
}

export function deeplinkFor(httpsUrl: string): string {
  return `nimiqpay://miniapp?url=${httpsUrl.replace(/^https?:\/\//, '')}`
}
