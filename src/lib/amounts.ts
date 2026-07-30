import { LUNA_PER_NIM } from './types'

export function nimToLuna(nim: number): number {
  return Math.round(nim * LUNA_PER_NIM)
}

export function lunaToNim(luna: number): number {
  return luna / LUNA_PER_NIM
}

export function formatNim(luna: number, digits = 5): string {
  return lunaToNim(luna).toFixed(digits).replace(/\.?0+$/, (m) => (m.includes('.') ? '' : m))
}

export function formatNimFixed(luna: number): string {
  return lunaToNim(luna).toFixed(5)
}

/** Fiat cents → luna using frozen fx_rate (fiat per NIM). */
export function fiatToLuna(fiat: number, fxRate: number): number {
  if (fxRate <= 0) throw new Error('Invalid fx rate')
  return Math.round((fiat / fxRate) * LUNA_PER_NIM)
}

export function lunaToFiat(luna: number, fxRate: number): number {
  return (luna / LUNA_PER_NIM) * fxRate
}

export function formatFiat(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Even split in fiat cents. Remainder cents assigned to host (index 1).
 * Then convert each fiat share to luna + fingerprint.
 */
export function evenFiatShares(
  totalFiat: number,
  people: number,
): number[] {
  const cents = Math.round(totalFiat * 100)
  const base = Math.floor(cents / people)
  const rem = cents - base * people
  return Array.from({ length: people }, (_, i) => {
    // host (index 0 in array / share index 1) gets remainder
    const shareCents = i === 0 ? base + rem : base
    return shareCents / 100
  })
}

export function payableLuna(amountLuna: number, fingerprint: number): number {
  return amountLuna + fingerprint
}
