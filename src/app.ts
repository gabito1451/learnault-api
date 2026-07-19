import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import swaggerUi from 'swagger-ui-express'
import { specs } from './config/swagger'
import routes from './routes'
import { errorHandler, notFoundHandler } from './middleware/error.middleware'

const app: express.Application = express()

app.use(express.json())
app.use(cors())
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for Swagger UI to work correctly
}))
app.use(morgan('dev'))

// API routes
app.use('/api', routes)

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))

// Health check endpoint
/**
 * @openapi
 * /health:
 *   get:
 *     operationId: healthCheck
 *     summary: Service health check
 *     description: Returns HTTP 200 when the server is running. No authentication required.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404 handler - must be after all routes
app.use(notFoundHandler)

// Global error handler - must be last
app.use(errorHandler)

export default app