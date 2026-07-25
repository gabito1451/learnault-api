import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import prisma from '../../src/config/database'
import { emailService } from '../../src/services/email.service'
import { UserRole } from '../../src/types/user.types'
import { auditService } from '../../src/services/audit.service'

vi.mock('../../src/services/email.service')

describe('Auth Integration Tests', () => {
    beforeAll(async () => {
        // setup if needed
    })

    afterAll(async () => {
        // cleanup if needed
    })

    beforeEach(async () => {
        await prisma.verificationToken.deleteMany()
        await prisma.user.deleteMany()
        vi.clearAllMocks()
    })

    describe('POST /auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({
                    email: ' Test@example.com ',
                    password: 'password123',
                    username: 'testuser',
                    role: UserRole.LEARNER
                })

            expect(res.status).toBe(201)
            expect(res.body.message).toBe('User registered successfully')
            expect(res.body).toHaveProperty('token')
            expect(res.body.user).toBeDefined()
            expect(res.body.user.email).toBe('test@example.com')
            expect(res.body.user).not.toHaveProperty('password')

            expect(emailService.queueEmail).toHaveBeenCalled()
            
            const userInDb = await prisma.user.findUnique({ where: { email: 'test@example.com' } })
            expect(userInDb).not.toBeNull()
        })

        it('should return 409 for duplicate email', async () => {
            await request(app)
                .post('/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    username: 'testuser1',
                })

            const res = await request(app)
                .post('/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    username: 'testuser2',
                })

            expect(res.status).toBe(409)
            expect(res.body.error).toBe('User with this email or username already exists')
        })
        
        it('should return 409 for duplicate username', async () => {
            await request(app)
                .post('/auth/register')
                .send({
                    email: 'test1@example.com',
                    password: 'password123',
                    username: 'testuser',
                })

            const res = await request(app)
                .post('/auth/register')
                .send({
                    email: 'test2@example.com',
                    password: 'password123',
                    username: 'testuser',
                })

            expect(res.status).toBe(409)
            expect(res.body.error).toBe('User with this email or username already exists')
        })
    })

    describe('POST /auth/login', () => {
        beforeEach(async () => {
            await request(app)
                .post('/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    username: 'testuser',
                })
        })

        it('should login successfully', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                })

            expect(res.status).toBe(200)
            expect(res.body).toHaveProperty('token')
            expect(res.body.user.email).toBe('test@example.com')
            expect(res.body.user).not.toHaveProperty('password')
        })

        it('should return 401 for invalid password', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword',
                })

            expect(res.status).toBe(401)
            expect(res.body.error).toBe('Invalid credentials')
        })

        it('should return 401 for invalid email', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({
                    email: 'wrong@example.com',
                    password: 'password123',
                })

            expect(res.status).toBe(401)
            expect(res.body.error).toBe('Invalid credentials')
        })
    })
})
