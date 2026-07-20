import express, { Router } from 'express'
import { UserController } from '../../controllers/user.controller'
import { PreferenceController } from '../../controllers/preference.controller'
import { authenticate } from '../../middleware/auth.middleware'
import { validateProfileUpdate, validatePasswordChange, validateWalletAddress } from '../../middleware/validation.middleware'

const router: express.Router = Router()
const userController = new UserController()
const preferenceController = new PreferenceController()

router.get('/me', authenticate, userController.getCurrentUser.bind(userController))

router.patch('/me', authenticate, validateProfileUpdate, userController.updateProfile.bind(userController))

router.get('/me/preferences', authenticate, preferenceController.getPreferences.bind(preferenceController))

router.patch('/me/preferences', authenticate, preferenceController.updatePreferences.bind(preferenceController))

router.get('/:id', userController.getUserById.bind(userController))

router.patch('/password', authenticate, validatePasswordChange, userController.changePassword.bind(userController))

router.patch('/wallet', authenticate, validateWalletAddress, userController.updateWalletAddress.bind(userController))

export default router
