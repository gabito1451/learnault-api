import { describe, it, expect } from 'vitest'
import {
  WalletStatus,
  isValidWalletTransition,
  type WalletStatusValue,
} from '../src/types/wallet.types'

describe('Wallet status transitions', () => {
  const allStatuses = Object.values(WalletStatus) as WalletStatusValue[]

  describe('PROVISIONING', () => {
    it('can transition to ACTIVE', () => {
      expect(isValidWalletTransition('PROVISIONING', 'ACTIVE')).toBe(true)
    })

    it('can transition to FAILED', () => {
      expect(isValidWalletTransition('PROVISIONING', 'FAILED')).toBe(true)
    })

    it('cannot transition to DISABLED directly', () => {
      expect(isValidWalletTransition('PROVISIONING', 'DISABLED')).toBe(false)
    })

    it('cannot transition to EXPORT', () => {
      expect(isValidWalletTransition('PROVISIONING', 'EXPORT')).toBe(false)
    })

    it('cannot transition to MIGRATED', () => {
      expect(isValidWalletTransition('PROVISIONING', 'MIGRATED')).toBe(false)
    })

    it('cannot stay in PROVISIONING', () => {
      expect(isValidWalletTransition('PROVISIONING', 'PROVISIONING')).toBe(false)
    })
  })

  describe('ACTIVE', () => {
    it('can transition to EXPORT', () => {
      expect(isValidWalletTransition('ACTIVE', 'EXPORT')).toBe(true)
    })

    it('can transition to MIGRATED', () => {
      expect(isValidWalletTransition('ACTIVE', 'MIGRATED')).toBe(true)
    })

    it('can transition to DISABLED', () => {
      expect(isValidWalletTransition('ACTIVE', 'DISABLED')).toBe(true)
    })

    it('cannot transition to FAILED', () => {
      expect(isValidWalletTransition('ACTIVE', 'FAILED')).toBe(false)
    })

    it('cannot transition to PROVISIONING', () => {
      expect(isValidWalletTransition('ACTIVE', 'PROVISIONING')).toBe(false)
    })
  })

  describe('FAILED', () => {
    it('can transition to PROVISIONING (retry)', () => {
      expect(isValidWalletTransition('FAILED', 'PROVISIONING')).toBe(true)
    })

    it('can transition to DISABLED', () => {
      expect(isValidWalletTransition('FAILED', 'DISABLED')).toBe(true)
    })

    it('cannot transition to ACTIVE directly', () => {
      expect(isValidWalletTransition('FAILED', 'ACTIVE')).toBe(false)
    })
  })

  describe('EXPORT', () => {
    it('can transition to MIGRATED', () => {
      expect(isValidWalletTransition('EXPORT', 'MIGRATED')).toBe(true)
    })

    it('can transition to DISABLED', () => {
      expect(isValidWalletTransition('EXPORT', 'DISABLED')).toBe(true)
    })

    it('cannot transition to ACTIVE', () => {
      expect(isValidWalletTransition('EXPORT', 'ACTIVE')).toBe(false)
    })
  })

  describe('MIGRATED', () => {
    it('can transition to DISABLED', () => {
      expect(isValidWalletTransition('MIGRATED', 'DISABLED')).toBe(true)
    })

    it('cannot transition to ACTIVE', () => {
      expect(isValidWalletTransition('MIGRATED', 'ACTIVE')).toBe(false)
    })
  })

  describe('DISABLED (terminal)', () => {
    it('cannot transition to any status', () => {
      for (const target of allStatuses) {
        expect(isValidWalletTransition('DISABLED', target)).toBe(false)
      }
    })
  })

  describe('unknown status', () => {
    it('returns false for invalid from-status', () => {
      expect(isValidWalletTransition('UNKNOWN' as WalletStatusValue, 'ACTIVE')).toBe(false)
    })
  })
})
