import { config } from 'dotenv'

config({ path: '.env.test' })

const PRODUCTION_KEYWORDS = [
  'production',
  'prod',
  'aws-rds',
  'azure',
  'heroku',
  'render',
  'fly',
  'railway',
]

const PRODUCTION_HOST_PATTERNS = [
  /\.compute\.amazonaws\.com$/i,
  /\.rds\.amazonaws\.com$/i,
  /\.database\.azure\.com$/i,
  /\.db\.heroku\.com$/i,
  /\.onrender\.com$/i,
  /\.fly\.dev$/i,
  /\.railway\.app$/i,
]

export class UnsafeDatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeDatabaseError'
  }
}

export function validateTestDatabaseUrl(url?: string): string {
  const dbUrl = url ?? process.env.DATABASE_URL

  if (!dbUrl) {
    throw new UnsafeDatabaseError(
      'DATABASE_URL is not set. Integration tests require a dedicated test database.',
    )
  }

  try {
    const parsed = new URL(dbUrl)

    const hostname = parsed.hostname.toLowerCase()
    const database = parsed.pathname.replace(/^\//, '').toLowerCase()

    for (const keyword of PRODUCTION_KEYWORDS) {
      if (hostname.includes(keyword) || database.includes(keyword)) {
        throw new UnsafeDatabaseError(
          `Rejected unsafe DATABASE_URL: "${dbUrl}" contains production keyword "${keyword}". ` +
            'Integration tests must target a dedicated test database.',
        )
      }
    }

    for (const pattern of PRODUCTION_HOST_PATTERNS) {
      if (pattern.test(hostname)) {
        throw new UnsafeDatabaseError(
          `Rejected unsafe DATABASE_URL: "${dbUrl}" matches production host pattern "${pattern}". ` +
            'Integration tests must target a dedicated test database.',
        )
      }
    }

    const testIndicators = ['test', 'ci', 'local']
    const hasTestIndicator = testIndicators.some(
      (indicator) =>
        hostname.includes(indicator) ||
        database.includes(indicator) ||
        parsed.port === '5433',
    )

    if (
      !hasTestIndicator &&
      (hostname === 'localhost' || hostname === '127.0.0.1') &&
      parsed.port === '5432'
    ) {
      if (!database.includes('test')) {
        console.warn(
          `Warning: DATABASE_URL "${dbUrl}" points to localhost:5432 with database "${database}". ` +
            'Consider using a database named with "_test" suffix for safety.',
        )
      }
    }

    return dbUrl
  } catch (err) {
    if (err instanceof UnsafeDatabaseError) throw err
    throw new UnsafeDatabaseError(
      `Invalid DATABASE_URL: "${dbUrl}". ${(err as Error).message}`,
    )
  }
}
