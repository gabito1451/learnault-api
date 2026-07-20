import { ChangePasswordData, PublicUserInfo, UpdateUserData, User } from '../types/user.types'
import { Request, Response } from 'express'

export class UserController {
  /**
   * @openapi
   * /users/me:
   *   get:
   *     operationId: usersGetMe
   *     summary: Get the authenticated user's profile
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */

  async getCurrentUser (req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })

        return
      }
      const user = await this.findUserById(userId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })

        return
      }
      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        avatar: user.avatar,
        walletAddress: user.walletAddress,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
    } catch {
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * @openapi
   * /users/me:
   *   patch:
   *     operationId: usersUpdateProfile
   *     summary: Update the authenticated user's profile
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateUserInput'
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */

  async updateProfile (req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })

        return
      }
      const data = req.body as UpdateUserData
      const user = await this.updateUserProfile(userId, data)
      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        avatar: user.avatar,
        walletAddress: user.walletAddress,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
    } catch {
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * @openapi
   * /users/{id}:
   *   get:
   *     operationId: usersGetById
   *     summary: Get a user's public profile by ID
   *     tags: [Users]
   *     security: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Public user info
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PublicUser'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  async getUserById (req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const user = await this.findUserById(id)
      if (!user) {
        res.status(404).json({ error: 'User not found' })

        return
      }

      const publicInfo: PublicUserInfo = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
      }

      res.json(publicInfo)
    } catch (error) {
      console.error('Error getting user by ID:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * @openapi
   * /users/password:
   *   patch:
   *     operationId: usersChangePassword
   *     summary: Change the authenticated user's password
   *     description: >
   *       ⚠️ **Preview** — the underlying service method is not yet fully implemented.
   *       Calling this endpoint will return a 500 error until the service is completed.
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ChangePasswordInput'
   *     responses:
   *       200:
   *         description: Password changed successfully.
   *       400:
   *         description: Current password is incorrect or validation failed.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Not yet implemented.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  async changePassword (req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id
      const { currentPassword, newPassword }: ChangePasswordData = req.body

      const user = await this.findUserById(userId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })


        return
      }

      const isCurrentPasswordValid = await this.validatePassword(user, currentPassword)
      if (!isCurrentPasswordValid) {
        res.status(400).json({ error: 'Current password is incorrect' })


        return
      }

      await this.updateUserPassword(userId, newPassword)

      res.json({ message: 'Password updated successfully' })
    } catch (error: unknown) {
      console.error('Error changing password:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * @openapi
   * /users/wallet:
   *   patch:
   *     operationId: usersUpdateWallet
   *     summary: Update the authenticated user's Stellar wallet address
   *     description: >
   *       ⚠️ **Preview** — the underlying service method is not yet fully implemented.
   *       The wallet update is accepted but may not persist to the database until the
   *       service layer is completed.
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateWalletInput'
   *     responses:
   *       200:
   *         description: Wallet address updated successfully.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       400:
   *         description: Invalid Stellar wallet address format.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */

  async updateWalletAddress (req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })

        return
      }
      const { walletAddress } = req.body as { walletAddress: string }
      if (!this.isValidStellarAddress(walletAddress)) {
        res.status(400).json({ error: 'Invalid Stellar wallet address' })

        return
      }
      const user = await this.updateUserWallet(userId, walletAddress)
      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        bio: (user as any).bio,
        avatar: (user as any).avatar,
        walletAddress: user.walletAddress,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
    } catch {
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  private async findUserById (id: string): Promise<User | null> {
    const mockUser: User = {
      id,
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      bio: 'Test bio',
      avatar: 'https://example.com/avatar.jpg',
      walletAddress: 'GABC123456789012345678901234567890123456789012345678901234567890',
      isActive: true,
      role: 'LEARNER' as any,
      status: 'active' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return mockUser
  }

  private async updateUserProfile (id: string, data: UpdateUserData): Promise<User> {
    const mockUser: User = {
      id,
      email: 'test@example.com',
      username: data.username || 'testuser',
      firstName: data.firstName,
      lastName: data.lastName,
      bio: data.bio,
      avatar: data.avatar,
      walletAddress: 'GABC123456789012345678901234567890123456789012345678901234567890',
      isActive: true,
      role: 'LEARNER' as any,
      status: 'active' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return mockUser
  }

  private async validatePassword (_user: User, _password: string): Promise<boolean> {
    return false
  }

  private async updateUserPassword (_id: string, _newPassword: string): Promise<void> {
    throw new Error('Not implemented')
  }

  private async updateUserWallet (id: string, walletAddress: string): Promise<User> {
    const mockUser: User = {
      id,
      email: 'test@example.com',
      username: 'testuser',
      walletAddress,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never

    return mockUser
  }

  private isValidStellarAddress (address: string): boolean {
    return /^G[A-Z0-9]{50,55}$/.test(address)
  }
}
