// ── Wallet status & transition guards ───

export const WalletStatus = {
  PROVISIONING: 'PROVISIONING',
  ACTIVE: 'ACTIVE',
  FAILED: 'FAILED',
  EXPORT: 'EXPORT',
  MIGRATED: 'MIGRATED',
  DISABLED: 'DISABLED',
} as const

export type WalletStatusValue = (typeof WalletStatus)[keyof typeof WalletStatus]

export const WalletNetwork = {
  TESTNET: 'TESTNET',
  MAINNET: 'MAINNET',
} as const

export type WalletNetworkValue = (typeof WalletNetwork)[keyof typeof WalletNetwork]

export const WalletCustody = {
  MANAGED: 'MANAGED',
  EXTERNAL: 'EXTERNAL',
} as const

export type WalletCustodyValue = (typeof WalletCustody)[keyof typeof WalletCustody]

/**
 * Allowed status transitions.
 * Key = current status, Value = set of statuses it may transition to.
 */
export const WalletTransitions: Readonly<Record<WalletStatusValue, ReadonlySet<WalletStatusValue>>> = {
  [WalletStatus.PROVISIONING]: new Set([WalletStatus.ACTIVE, WalletStatus.FAILED]),
  [WalletStatus.ACTIVE]:       new Set([WalletStatus.EXPORT, WalletStatus.MIGRATED, WalletStatus.DISABLED]),
  [WalletStatus.FAILED]:       new Set([WalletStatus.PROVISIONING, WalletStatus.DISABLED]),
  [WalletStatus.EXPORT]:       new Set([WalletStatus.MIGRATED, WalletStatus.DISABLED]),
  [WalletStatus.MIGRATED]:     new Set([WalletStatus.DISABLED]),
  [WalletStatus.DISABLED]:     new Set([]),
} as const

/**
 * Returns true if transitioning from `from` to `to` is allowed.
 */
export function isValidWalletTransition(from: WalletStatusValue, to: WalletStatusValue): boolean {
  return WalletTransitions[from]?.has(to) ?? false
}

// ── DTOs (no plaintext secrets) ───

export interface WalletDto {
  id: string
  userId: string
  network: WalletNetworkValue
  custody: WalletCustodyValue
  publicKey: string
  status: WalletStatusValue
  managedKeyId: string | null
  statusChangedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ManagedKeyDto {
  id: string
  provider: string
  keyId: string
  keyVersion: string | null
  /** Opaque envelope – never contains plaintext secrets */
  envelope: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Redacts sensitive fields from a wallet object before returning to API consumers.
 * Ensures managed key references never leak into ordinary responses.
 */
export function redactWallet(wallet: Record<string, unknown>): WalletDto {
  return {
    id: wallet.id as string,
    userId: wallet.userId as string,
    network: wallet.network as WalletNetworkValue,
    custody: wallet.custody as WalletCustodyValue,
    publicKey: wallet.publicKey as string,
    status: wallet.status as WalletStatusValue,
    managedKeyId: null, // never expose internal KMS reference
    statusChangedAt: wallet.statusChangedAt ? String(wallet.statusChangedAt) : null,
    createdAt: String(wallet.createdAt),
    updatedAt: String(wallet.updatedAt),
  }
}
