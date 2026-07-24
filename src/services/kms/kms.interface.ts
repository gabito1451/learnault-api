/**
 * KMS (Key Management Service) interface.
 *
 * Implementations wrap a specific provider (AWS KMS, GCP KMS, etc.)
 * and never expose plaintext secrets to the application layer.
 */

export interface KmsKeyHandle {
  /** Opaque provider-side key identifier */
  keyId: string
  /** Key material version (for rotation tracking) */
  keyVersion: string | null
  /** Opaque encrypted envelope – never plaintext */
  envelope: string | null
}

export interface CreateKeyResult {
  handle: KmsKeyHandle
  provider: string
}

export interface KMS {
  /**
   * Create a new managed key.
   * Returns only opaque references – never plaintext secrets.
   */
  createKey(label?: string): Promise<CreateKeyResult>

  /**
   * Retrieve the opaque handle for an existing key.
   */
  getKeyHandle(keyId: string): Promise<KmsKeyHandle | null>

  /**
   * Rotate key material. Returns updated handle.
   */
  rotateKey(keyId: string): Promise<KmsKeyHandle>

  /**
   * Schedule key for destruction (soft-delete).
   */
  scheduleDestruction(keyId: string, pendingWindowDays?: number): Promise<void>
}
