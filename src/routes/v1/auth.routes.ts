import { Router } from 'express'
import { AuthController } from '../../controllers/auth.controller'
import { authLimiter } from '../../middleware/rate-limit.middleware'

const router: Router = Router()
const authController = new AuthController()

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', authController.register.bind(authController))

/**
 * @route POST /api/v1/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', authLimiter, authController.login.bind(authController))

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user
 * @access Public
 */
router.post('/logout', authController.logout.bind(authController))

/**
 * @route POST /api/v1/auth/verify-email
 * @desc Verify email with token
 * @access Public
 */
router.post('/verify-email', authController.verifyEmail.bind(authController))

/**
 * @route POST /api/v1/auth/resend-verification
 * @desc Resend verification email
 * @access Public
 */
router.post('/resend-verification', authLimiter, authController.resendVerification.bind(authController))

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Request password reset email
 * @access Public
 */
router.post('/forgot-password', authLimiter, authController.forgotPassword.bind(authController))

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password', authController.resetPassword.bind(authController))

export default router
