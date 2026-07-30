import 'server-only'
import { messageHash } from './receipt'

/** Server-only verification via @nimiq/core */
export async function verifyReceipt(opts: {
  canonical: string
  publicKey: string
  signature: string
}): Promise<boolean> {
  try {
    const nimiq = await import('@nimiq/core')
    const hash = await messageHash(opts.canonical)
    const pk = nimiq.PublicKey.fromHex(opts.publicKey.replace(/^0x/i, ''))
    const sig = nimiq.Signature.fromHex(opts.signature.replace(/^0x/i, ''))
    return pk.verify(sig, hash)
  } catch {
    return false
  }
}
