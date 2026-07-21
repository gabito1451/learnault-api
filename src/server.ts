import { Server } from 'http'
import app from './app'
import { env } from './config/env'
import { accountLifecycleService } from './services/account-lifecycle.service'
import logger from './utils/logger'
import prisma from './config/database'

const PORT = process.env.PORT || 5000
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '30000', 10)

const server: Server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})

let isShuttingDown = false
let lifecycleSweepInterval: NodeJS.Timeout | null = null

// Periodic lifecycle sweep (export generation, deletion finalization, artifact
// purge). Disabled when LIFECYCLE_SWEEP_INTERVAL_MS is 0 — the sweep still runs
// lazily from account endpoints, and a dedicated worker can call sweep() directly.
if (env.LIFECYCLE_SWEEP_INTERVAL_MS > 0) {
  lifecycleSweepInterval = setInterval(() => {
    accountLifecycleService.sweep().catch(err =>
      logger.error('Scheduled lifecycle sweep error:', err)
    )
  }, env.LIFECYCLE_SWEEP_INTERVAL_MS)
  lifecycleSweepInterval.unref()
}

/**
 * Graceful shutdown handler
 * Drains HTTP connections, stops background jobs, and closes database connections
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring additional signal')

    return
  }

  isShuttingDown = true
  logger.info(`Received ${signal}, starting graceful shutdown...`)

  // Set a hard deadline for shutdown
  const shutdownTimer = setTimeout(() => {
    logger.error(`Shutdown timeout (${SHUTDOWN_TIMEOUT_MS}ms) exceeded, forcing exit`)
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)

  try {
    // 1. Stop accepting new connections
    logger.info('Closing HTTP server...')
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          logger.error('Error closing HTTP server:', err)
          reject(err)
        } else {
          logger.info('HTTP server closed')
          resolve()
        }
      })
    })

    // 2. Stop background jobs
    if (lifecycleSweepInterval) {
      logger.info('Stopping lifecycle sweep interval...')
      clearInterval(lifecycleSweepInterval)
      lifecycleSweepInterval = null
    }

    // 3. Close database connections
    logger.info('Closing database connections...')
    await prisma.$disconnect()
    logger.info('Database connections closed')

    // 4. Perform any final cleanup
    logger.info('Graceful shutdown completed successfully')

    // Clear the shutdown timer and exit cleanly
    clearTimeout(shutdownTimer)
    process.exit(0)
  } catch (error) {
    logger.error('Error during graceful shutdown:', error)
    clearTimeout(shutdownTimer)
    process.exit(1)
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection:', reason)
  gracefulShutdown('unhandledRejection')
})
