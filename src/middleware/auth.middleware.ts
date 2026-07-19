import { NextFunction, Request, Response } from 'express'

import jwt from 'jsonwebtoken'
import prisma from '../config/database'

export type UserRole = 'learner' | 'employer';

export interface JwtPayload {
     id: string;
     email: string;
     role: UserRole;
     iat?: number;
     exp?: number;
}

declare global {
     // eslint-disable-next-line @typescript-eslint/no-namespace
     namespace Express {
          interface Request {
               user?: JwtPayload;
          }
     }
}

const JWT_SECRET = process.env.JWT_SECRET as string

if (!JWT_SECRET) {
     throw new Error('JWT_SECRET environment variable is required')
}

/**
 * Strict authentication — rejects requests without a valid JWT.
 */
export const authenticate = (
     req: Request,
     res: Response,
     next: NextFunction
): void => {
     const authHeader = req.headers.authorization

     if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ message: 'Authorization token required' })

          return
     }

     const token = authHeader.split(' ')[1]

     try {
          const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
          req.user = decoded
          next()
     } catch (err) {
          if (err instanceof jwt.TokenExpiredError) {
               res.status(401).json({ message: 'Token has expired' })

               return
          }
          if (err instanceof jwt.JsonWebTokenError) {
               res.status(401).json({ message: 'Invalid token' })

               return
          }
          res.status(500).json({ message: 'Internal server error during authentication' })
     }
}

/**
 * Optional authentication — attaches user to req if token is present and valid,
 * but does not block requests without a token.
 */
export const optionalAuthenticate = (
     req: Request,
     res: Response,
     next: NextFunction
): void => {
     const authHeader = req.headers.authorization

     if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return next()
     }

     const token = authHeader.split(' ')[1]

     try {
          const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
          req.user = decoded
     } catch { /** */ }

     next()
}

/**
 * Account-status gate — must be used after `authenticate`.
 * JWTs are stateless, so tokens issued before deactivation or a deletion
 * request stay verifiable until expiry; this middleware checks the current
 * account status in the database and only lets ACTIVE accounts through.
 */
export const requireActiveAccount = async (
     req: Request,
     res: Response,
     next: NextFunction
): Promise<void> => {
     if (!req.user) {
          res.status(401).json({ message: 'Authentication required' })

          return
     }

     try {
          const user = await prisma.user.findUnique({
               where: { id: req.user.id },
               select: { status: true },
          })

          if (!user || user.status === 'DELETED') {
               res.status(401).json({ message: 'Account not found' })

               return
          }

          if (user.status === 'DEACTIVATED') {
               res.status(403).json({
                    message: 'Account is deactivated',
                    code: 'ACCOUNT_DEACTIVATED',
               })

               return
          }

          if (user.status === 'PENDING_DELETION') {
               res.status(403).json({
                    message: 'Account is scheduled for deletion',
                    code: 'ACCOUNT_PENDING_DELETION',
               })

               return
          }

          next()
     } catch {
          res.status(500).json({ message: 'Internal server error during account status check' })
     }
}

/**
 * Role-based authorization — must be used after `authenticate`.
 * Restricts access to users with one of the specified roles.
 */
export const authorize = (...roles: UserRole[]) => {
     return (req: Request, res: Response, next: NextFunction): void => {
          if (!req.user) {
               res.status(401).json({ message: 'Authentication required' })

               return
          }

          if (!roles.includes(req.user.role)) {
               res.status(403).json({
                    message: `Access denied. Requires one of the following roles: ${roles.join(', ')}`,
               })

               return
          }

          next()
     }
}