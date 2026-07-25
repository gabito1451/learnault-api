import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient, Prisma } from '@prisma/client'
import prisma from '../config/database'
import { RegisterInput, LoginInput } from '../schemas/auth.schema'
import { UserRole } from '../types/user.types'
import { emailService } from './email.service'
import logger from '../utils/logger'
import crypto from 'crypto'
import { auditService } from './audit.service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

export class AuthenticationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'AuthenticationError'
    }
}

export class UserConflictError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'UserConflictError'
    }
}

export class AccountDisabledError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'AccountDisabledError'
    }
}

export class AccountStatusError extends Error {
    statusCode: number
    body: Record<string, unknown>

    constructor(statusCode: number, body: Record<string, unknown>) {
        super('Account status error')
        this.name = 'AccountStatusError'
        this.statusCode = statusCode
        this.body = body
    }
}

export class AuthService {
    /**
     * Normalize email: lowercased and trimmed
     */
    static normalizeEmail(email: string): string {
        return email.toLowerCase().trim()
    }

    /**
     * Normalize username: trimmed
     */
    static normalizeUsername(username: string): string {
        return username.trim()
    }

    static generateToken(userId: string, role: string): string {
        return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
    }

    static generateVerificationToken(): { rawToken: string; tokenHash: string } {
        const rawToken = crypto.randomBytes(32).toString('hex')
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
        
return { rawToken, tokenHash }
    }

    static buildVerificationEmail(rawToken: string): { subject: string; body: string } {
        const subject = 'Verify your email address'
        const body = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;padding:24px">
  <h2>Verify your email</h2>
  <p>Use the link below to verify your email address:</p>
  <p><a href="${process.env.VERIFICATION_BASE_URL || 'http://localhost:3000/verify-email'}?token=${rawToken}">
    Verify email
  </a></p>
  <p>Or enter this token manually:</p>
  <pre style="background:#f5f5f5;padding:12px;font-size:14px">${rawToken}</pre>
  <p>This link expires in 24 hours.</p>
  <p>If you did not create this account, please ignore this email.</p>
</body>
</html>`
        
return { subject, body }
    }

    static async register(input: RegisterInput, ipAddress?: string, userAgent?: string) {
        const email = this.normalizeEmail(input.email)
        const username = this.normalizeUsername(input.username)
        const role = input.role || UserRole.LEARNER

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(input.password, salt)

        try {
            const user = await prisma.user.create({
                data: {
                    email,
                    username,
                    password: hashedPassword,
                    role: role as any,
                }
            })

            const { rawToken, tokenHash } = this.generateVerificationToken()
            const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS)

            await prisma.verificationToken.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    expiresAt,
                }
            })

            const { subject, body } = this.buildVerificationEmail(rawToken)
            emailService.queueEmail(user.id, email, subject, body).catch(err =>
                logger.error('[Auth] Failed to queue verification email:', err)
            )

            await auditService.record({ userId: user.id, action: 'REGISTER', ipAddress, userAgent, metadata: {} })

            const token = this.generateToken(user.id, user.role)

            return {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role
                }
            }
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new UserConflictError('User with this email or username already exists')
                }
            }
            throw error
        }
    }

    static async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
        const email = this.normalizeEmail(input.email)

        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            throw new AuthenticationError('Invalid credentials')
        }

        const isMatch = await bcrypt.compare(input.password, user.password)
        if (!isMatch) {
            throw new AuthenticationError('Invalid credentials')
        }

        if (user.status === 'DELETED') {
            throw new AuthenticationError('Invalid credentials')
        }

        if (user.status === 'DEACTIVATED') {
            throw new AccountStatusError(403, { error: 'Account is deactivated', code: 'ACCOUNT_DEACTIVATED' })
        }

        if (user.status === 'PENDING_DELETION') {
            const deletionRequest = await prisma.accountDeletionRequest.findFirst({
                where: { userId: user.id, status: 'pending' },
                select: { scheduledFor: true },
            })
            throw new AccountStatusError(403, {
                error: 'Account is scheduled for deletion',
                code: 'ACCOUNT_PENDING_DELETION',
                scheduledFor: deletionRequest?.scheduledFor ?? null,
            })
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        })

        await auditService.record({ userId: user.id, action: 'LOGIN', ipAddress, userAgent, metadata: {} })

        const token = this.generateToken(user.id, user.role)

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            }
        }
    }
}
