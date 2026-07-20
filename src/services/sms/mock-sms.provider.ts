import logger from '../../utils/logger'
import { SmsProvider, SmsSendResult } from './sms-provider.interface'

export class MockSmsProvider implements SmsProvider {
  async send(to: string, body: string): Promise<SmsSendResult> {
    logger.info(`[MockSmsProvider] SMS to=${to} body="${body}"`)

    return { success: true, providerMessageId: `mock_${Date.now()}` }
  }
}
