/** Fiat FX — freeze at tab creation. Real rate only via @nimiq/utils. */

import {
  CryptoCurrency,
  FiatCurrency,
  Provider,
  getExchangeRates,
} from '@nimiq/utils'

export async function fetchUsdPerNim(): Promise<number> {
  const rates = await getExchangeRates(
    [CryptoCurrency.NIM],
    [FiatCurrency.USD],
    Provider.CoinGecko,
  )
  const price = rates?.[CryptoCurrency.NIM]?.[FiatCurrency.USD]
  if (typeof price !== 'number' || !(price > 0)) {
    throw new Error('NIM price unavailable right now. Try again in a moment.')
  }
  return price
}
