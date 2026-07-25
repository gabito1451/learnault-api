import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService, UserConflictError, AuthenticationError, AccountStatusError } from '../../src/services/auth.service'
import prisma from '../../src/config/database'
import { UserRole } from '../../src/types/user.types'
import { emailService } from '../../src/services/email.service'
import bcrypt from 'bcryptjs'

vi.mock('../../src/services/email.service')
vi.mock('../../src/services/audit.service', () => ({
    auditService: {
        record: vi.fn()
    }
}))

describe('AuthService', () => {
    beforeEach(async () => {
        await prisma.verificationToken.deleteMany()
        await prisma.user.deleteMany()
        vi.clearAllMocks()
    })

    describe('register', () => {
        it('should successfully register a new user and queue a verification email', async () => {
            const input = {
                email: 'Test@Example.com ',
                password: 'password123',
                username: ' testuser ',
                role: UserRole.LEARNER
            }

            const result = await AuthService.register(input)
            
            expect(result).toHaveProperty('token')
            expect(result.user).toHaveProperty('id')
            expect(result.user.email).toBe('test@example.com')
            expect(result.user.username).toBe('testuser')
            expect(result.user).not.toHaveProperty('password')

            const userInDb = await prisma.user.findUnique({ where: { email: 'test@example.com' } })
            expect(userInDb).toBeDefined()
            expect(userInDb?.username).toBe('testuser')

            expect(emailService.queueEmail).toHaveBeenCalled()
        })

        it('should throw UserConflictError if email or username already exists', async () => {
            const input = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser',
            }

            await AuthService.register(input)

            await expect(AuthService.register(input)).rejects.toThrow(UserConflictError)
        })
    })

    describe('login', () => {
        it('should successfully login and return a token without password', async () => {
            const input = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser',
            }

            await AuthService.register(input)

            const result = await AuthService.login({ email: 'Test@Example.com ', password: 'password123' })
            expect(result).toHaveProperty('token')
            expect(result.user.email).toBe('test@example.com')
            expect(result.user).not.toHaveProperty('password')
        })

        it('should throw AuthenticationError for wrong email', async () => {
            await expect(AuthService.login({ email: 'wrong@example.com', password: 'password123' })).rejects.toThrow(AuthenticationError)
        })

        it('should throw AuthenticationError for wrong password', async () => {
            const input = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser',
            }
            await AuthService.register(input)

            await expect(AuthService.login({ email: 'test@example.com', password: 'wrongpassword' })).rejects.toThrow(AuthenticationError)
        })

        it('should throw AccountStatusError for deactivated account', async () => {
            const input = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser',
            }
            const { user } = await AuthService.register(input)
            await prisma.user.update({
                where: { id: user.id },
                data: { status: 'DEACTIVATED' }
            })

            await expect(AuthService.login({ email: 'test@example.com', password: 'password123' })).rejects.toThrow(AccountStatusError)
        })
    })
})
