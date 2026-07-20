import { describe, it, expect } from 'vitest'
import { buildUser, buildModule, buildCompletion } from '../helpers/factories'

describe('Test data factories', () => {
  describe('buildUser', () => {
    it('generates a user object with default values', () => {
      const user = buildUser()

      expect(user.email).toMatch(/^test_.+@example\.com$/)
      expect(user.username).toMatch(/^testuser_.+/)
      expect(user.password).toBe('$2a$10$dummy_hash_for_testing_purposes_only')
      expect(user.role).toBe('LEARNER')
      expect(user.isVerified).toBe(true)
      expect(user.walletAddress).toBeNull()
      expect(user.status).toBe('ACTIVE')
    })

    it('applies overrides', () => {
      const user = buildUser({
        email: 'override@test.com',
        role: 'ADMIN',
        isVerified: false,
      })

      expect(user.email).toBe('override@test.com')
      expect(user.role).toBe('ADMIN')
      expect(user.isVerified).toBe(false)
    })

    it('generates unique emails on each call', () => {
      const user1 = buildUser()
      const user2 = buildUser()
      expect(user1.email).not.toBe(user2.email)
    })
  })

  describe('buildModule', () => {
    it('generates a module object with default values', () => {
      const mod = buildModule()

      expect(mod.title).toMatch(/^Test Module .+/)
      expect(mod.description).toBe('A test module for integration testing')
      expect(mod.category).toBe('technology')
      expect(mod.difficulty).toBe('beginner')
      expect(mod.reward).toBe(10)
    })

    it('applies overrides', () => {
      const mod = buildModule({ title: 'Custom Title', reward: 50 })
      expect(mod.title).toBe('Custom Title')
      expect(mod.reward).toBe(50)
    })
  })

  describe('buildCompletion', () => {
    it('generates a completion object with the given IDs', () => {
      const completion = buildCompletion('user-1', 'module-1')

      expect(completion.userId).toBe('user-1')
      expect(completion.moduleId).toBe('module-1')
      expect(completion.score).toBe(85)
    })

    it('applies overrides', () => {
      const completion = buildCompletion('user-1', 'module-1', { score: 95 })
      expect(completion.score).toBe(95)
    })
  })
})
