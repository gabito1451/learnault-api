import { describe, it, expect } from 'vitest'
import { redactWallet } from '../src/types/wallet.types'

describe('Wallet secret redaction', () => {
  const fullWallet = {
    id: 'w-1',
    userId: 'u-1',
    network: 'TESTNET',
    custody: 'MANAGED',
    publicKey: 'GABC...XYZ',
    status: 'ACTIVE',
    managedKeyId: 'secret-key-id-123',
    statusChangedAt: new Date('2026-07-21'),
    createdAt: new Date('2026-07-20'),
    updatedAt: new Date('2026-07-21'),
  }

  it('strips managedKeyId from the DTO', () => {
    const dto = redactWallet(fullWallet)
    expect(dto.managedKeyId).toBeNull()
  })

  it('preserves non-sensitive fields', () => {
    const dto = redactWallet(fullWallet)
    expect(dto.id).toBe('w-1')
    expect(dto.userId).toBe('u-1')
    expect(dto.publicKey).toBe('GABC...XYZ')
    expect(dto.network).toBe('TESTNET')
    expect(dto.custody).toBe('MANAGED')
    expect(dto.status).toBe('ACTIVE')
  })

  it('converts dates to strings', () => {
    const dto = redactWallet(fullWallet)
    expect(typeof dto.createdAt).toBe('string')
    expect(typeof dto.updatedAt).toBe('string')
    expect(typeof dto.statusChangedAt).toBe('string')
  })

  it('handles null statusChangedAt', () => {
    const dto = redactWallet({ ...fullWallet, statusChangedAt: null })
    expect(dto.statusChangedAt).toBeNull()
  })

  it('never includes raw secret-like fields', () => {
    const walletWithSecrets = {
      ...fullWallet,
      secretKey: 'SECRET_STELLAR_KEY',
      seedPhrase: 'abandon abandon ... about',
      passphrase: 'hunter2',
    }
    const dto = redactWallet(walletWithSecrets)
    const dtoJson = JSON.stringify(dto)
    expect(dtoJson).not.toContain('SECRET_STELLAR_KEY')
    expect(dtoJson).not.toContain('abandon')
    expect(dtoJson).not.toContain('hunter2')
    expect(dtoJson).not.toContain('secret-key-id-123')
  })
})
