/**
 * Network selection. Default: testnet.
 * Set NEXT_PUBLIC_NIMIQ_NETWORK=mainnet for production.
 */

export type NimiqNetwork = 'testnet' | 'mainnet'

export function getNetwork(): NimiqNetwork {
  const raw = (process.env.NEXT_PUBLIC_NIMIQ_NETWORK || 'testnet').toLowerCase()
  return raw === 'mainnet' ? 'mainnet' : 'testnet'
}

export function isTestnet(): boolean {
  return getNetwork() === 'testnet'
}

const CONFIG = {
  testnet: {
    label: 'Testnet',
    historyApi: 'https://v2.test.nimiqwatch.com/api/v1',
    /** Optional JSON-RPC override; testnet public RPC is unreliable, history API is default. */
    rpcUrl: process.env.NIMIQ_RPC_URL || '',
    explorerTx: (hash: string) => `https://test.nimiq.watch/#${hash}`,
    explorerBase: 'https://test.nimiq.watch',
  },
  mainnet: {
    label: 'Mainnet',
    historyApi: 'https://v2.nimiqwatch.com/api/v1',
    rpcUrl: process.env.NIMIQ_RPC_URL || 'https://rpc.nimiqwatch.com',
    explorerTx: (hash: string) => `https://nimiq.watch/#${hash}`,
    explorerBase: 'https://nimiq.watch',
  },
} as const

export function networkConfig() {
  return CONFIG[getNetwork()]
}

export function explorerTxUrl(hash: string): string {
  return networkConfig().explorerTx(hash)
}
