import { describe, it, expect } from 'vitest'
import { parseWebhookPayload, type MetaWebhookPayload } from '@/lib/whatsapp'

function makePayload(overrides: Partial<MetaWebhookPayload> = {}): MetaWebhookPayload {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WABA_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '601111111111',
                phone_number_id: 'PHONE_ID',
              },
              contacts: [{ profile: { name: 'Buyer Name' }, wa_id: '60222222222' }],
              messages: [
                {
                  from: '60222222222',
                  id: 'wamid.test',
                  timestamp: '1700000000',
                  text: { body: 'Hello, I want to buy a condo' },
                  type: 'text',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('parseWebhookPayload', () => {
  it('extracts agent phone, buyer phone, and message text', () => {
    const result = parseWebhookPayload(makePayload())
    expect(result).toEqual({
      phoneNumberId: 'PHONE_ID',
      agentPhone: '601111111111',
      buyerPhone: '60222222222',
      buyerName: 'Buyer Name',
      messageText: 'Hello, I want to buy a condo',
      messageId: 'wamid.test',
    })
  })

  it('returns null for status updates (no messages array)', () => {
    const payload = makePayload()
    payload.entry[0].changes[0].value.messages = []
    expect(parseWebhookPayload(payload)).toBeNull()
  })

  it('returns null for non-text messages', () => {
    const payload = makePayload()
    payload.entry[0].changes[0].value.messages[0].type = 'image'
    expect(parseWebhookPayload(payload)).toBeNull()
  })

  it('returns null when entry is empty', () => {
    const payload = makePayload()
    payload.entry = []
    expect(parseWebhookPayload(payload)).toBeNull()
  })

  it('returns null when changes has no messages field', () => {
    const payload = makePayload()
    payload.entry[0].changes[0].field = 'account'
    expect(parseWebhookPayload(payload)).toBeNull()
  })
})
