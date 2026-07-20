export const stellarConfig = {
  network: (process.env.STELLAR_NETWORK as 'testnet' | 'mainnet') ?? 'testnet',
  funding: {
    amount: process.env.STELLAR_FUNDING_AMOUNT ?? '10',
    minBalance: process.env.STELLAR_FUNDING_MIN_BALANCE ?? '1',
    maxRetries: parseInt(process.env.STELLAR_FUNDING_MAX_RETRIES ?? '5', 10),
    backoffBaseMinutes: 5,
  },
}
