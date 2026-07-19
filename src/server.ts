import app from './app'
import { env } from './config/env'
import { accountLifecycleService } from './services/account-lifecycle.service'
import logger from './utils/logger'

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Periodic lifecycle sweep (export generation, deletion finalization, artifact
// purge). Disabled when LIFECYCLE_SWEEP_INTERVAL_MS is 0 — the sweep still runs
// lazily from account endpoints, and a dedicated worker can call sweep() directly.
if (env.LIFECYCLE_SWEEP_INTERVAL_MS > 0) {
  setInterval(() => {
    accountLifecycleService.sweep().catch(err =>
      logger.error('Scheduled lifecycle sweep error:', err)
    )
  }, env.LIFECYCLE_SWEEP_INTERVAL_MS).unref()
}
