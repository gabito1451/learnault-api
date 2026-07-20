import { config } from 'dotenv'
import { validateTestDatabaseUrl } from './helpers/guard'
import { applyMigrations } from './helpers/db'

config({ path: '.env.test' })

export async function setup(): Promise<void> {
  try {
    const dbUrl = validateTestDatabaseUrl()

    console.log('[globalSetup] Applying migrations to test database...')
    applyMigrations(dbUrl)
    console.log('[globalSetup] Migrations applied successfully.')
  } catch (err) {
    console.warn(
      '[globalSetup] Could not apply migrations. ' +
        'Integration tests requiring a database will be skipped. ' +
        `Error: ${(err as Error).message}`,
    )
  }
}

export async function teardown(): Promise<void> {
  console.log('[globalSetup] Test run complete.')
}
