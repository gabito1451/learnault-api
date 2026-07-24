import { describe, it, expect, beforeEach } from 'vitest'
import { FakeKMS } from '../src/services/kms'

describe('FakeKMS', () => {
  let kms: FakeKMS

  beforeEach(() => {
    kms = new FakeKMS()
  })

  describe('createKey', () => {
    it('returns a handle with provider "fake"', async () => {
      const result = await kms.createKey()
      expect(result.provider).toBe('fake')
      expect(result.handle.keyId).toMatch(/^fake-/)
      expect(result.handle.keyVersion).toBe('1')
    })

    it('stores a label in the envelope when provided', async () => {
      const result = await kms.createKey('test-wallet')
      expect(result.handle.envelope).toBe(JSON.stringify({ label: 'test-wallet' }))
    })

    it('leaves envelope null when no label is given', async () => {
      const result = await kms.createKey()
      expect(result.handle.envelope).toBeNull()
    })

    it('increments internal key count', async () => {
      await kms.createKey()
      await kms.createKey()
      expect(kms.size).toBe(2)
    })
  })

  describe('getKeyHandle', () => {
    it('returns the handle for an existing key', async () => {
      const { handle } = await kms.createKey()
      const retrieved = await kms.getKeyHandle(handle.keyId)
      expect(retrieved).toEqual(handle)
    })

    it('returns null for a non-existent key', async () => {
      const result = await kms.getKeyHandle('nonexistent')
      expect(result).toBeNull()
    })

    it('returns null for a destroyed key', async () => {
      const { handle } = await kms.createKey()
      await kms.scheduleDestruction(handle.keyId)
      const result = await kms.getKeyHandle(handle.keyId)
      expect(result).toBeNull()
    })
  })

  describe('rotateKey', () => {
    it('increments the version', async () => {
      const { handle } = await kms.createKey()
      const rotated = await kms.rotateKey(handle.keyId)
      expect(rotated.keyVersion).toBe('2')
      expect(rotated.keyId).toBe(handle.keyId)
    })

    it('throws for non-existent key', async () => {
      await expect(kms.rotateKey('nonexistent')).rejects.toThrow('not found')
    })

    it('throws for destroyed key', async () => {
      const { handle } = await kms.createKey()
      await kms.scheduleDestruction(handle.keyId)
      await expect(kms.rotateKey(handle.keyId)).rejects.toThrow('not found')
    })
  })

  describe('scheduleDestruction', () => {
    it('marks key as destroyed', async () => {
      const { handle } = await kms.createKey()
      await kms.scheduleDestruction(handle.keyId)
      expect(kms.isDestroyed(handle.keyId)).toBe(true)
    })

    it('throws for non-existent key', async () => {
      await expect(kms.scheduleDestruction('nonexistent')).rejects.toThrow('not found')
    })
  })

  describe('never exposes plaintext secrets', () => {
    it('handle contains only opaque fields', async () => {
      const { handle } = await kms.createKey('secret-label')
      const keys = Object.keys(handle)
      expect(keys).toEqual(expect.arrayContaining(['keyId', 'keyVersion', 'envelope']))
      // No secretKey, passphrase, seed, etc.
      expect(keys).not.toContain('secretKey')
      expect(keys).not.toContain('passphrase')
      expect(keys).not.toContain('seed')
      expect(keys).not.toContain('privateKey')
    })
  })
})
