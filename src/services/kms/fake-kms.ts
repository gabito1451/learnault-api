import type { KMS, KmsKeyHandle, CreateKeyResult } from './kms.interface'

function fakeUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * In-memory fake KMS for development / testing.
 *
 * NEVER stores real secrets – only opaque UUIDs and version strings.
 */
export class FakeKMS implements KMS {
  private keys = new Map<string, { version: number; envelope: string | null; destroyed: boolean }>()

  async createKey(label?: string): Promise<CreateKeyResult> {
    const keyId = `fake-${fakeUuid()}`
    const version = '1'
    const envelope = label ? JSON.stringify({ label }) : null

    this.keys.set(keyId, { version: 1, envelope, destroyed: false })

    return {
      handle: { keyId, keyVersion: version, envelope },
      provider: 'fake',
    }
  }

  async getKeyHandle(keyId: string): Promise<KmsKeyHandle | null> {
    const entry = this.keys.get(keyId)
    if (!entry || entry.destroyed) return null

    return {
      keyId,
      keyVersion: String(entry.version),
      envelope: entry.envelope,
    }
  }

  async rotateKey(keyId: string): Promise<KmsKeyHandle> {
    const entry = this.keys.get(keyId)
    if (!entry || entry.destroyed) {
      throw new Error(`Key ${keyId} not found`)
    }

    entry.version += 1

    return {
      keyId,
      keyVersion: String(entry.version),
      envelope: entry.envelope,
    }
  }

  async scheduleDestruction(keyId: string, _pendingWindowDays?: number): Promise<void> {
    const entry = this.keys.get(keyId)
    if (!entry) {
      throw new Error(`Key ${keyId} not found`)
    }
    entry.destroyed = true
  }

  // ── Test helpers ──────────────────────────────────────

  /** Returns number of keys currently stored (including destroyed). */
  get size(): number {
    return this.keys.size
  }

  /** Check whether a key has been marked destroyed. */
  isDestroyed(keyId: string): boolean {
    return this.keys.get(keyId)?.destroyed ?? false
  }
}
