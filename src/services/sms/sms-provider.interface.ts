export interface SmsSendResult {
  success: boolean
  providerMessageId?: string
  error?: string
}

export interface SmsProvider {
  send(to: string, body: string): Promise<SmsSendResult>
}
