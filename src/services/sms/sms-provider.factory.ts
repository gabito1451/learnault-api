import { env } from '../../config/env'
import { MockSmsProvider } from './mock-sms.provider'
import { SmsProvider } from './sms-provider.interface'

let instance: SmsProvider | null = null

/**
 * Only "mock" is implemented today. Swapping in a real carrier (Twilio,
 * Termii, Africa's Talking, etc.) means adding a class that implements
 * SmsProvider and a case below — the OTP service never needs to change.
 */
export function getSmsProvider(): SmsProvider {
  if (instance) {
    return instance
  }

  switch (env.SMS_PROVIDER) {
    case 'mock':
      instance = new MockSmsProvider()
      break
    default:
      throw new Error(`Unsupported SMS_PROVIDER: ${env.SMS_PROVIDER}`)
  }

  return instance
}

export function resetSmsProviderForTests(): void {
  instance = null
}
