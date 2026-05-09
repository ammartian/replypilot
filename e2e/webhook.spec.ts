import { test, expect } from '@playwright/test'

const WEBHOOK_URL = '/api/webhook/whatsapp'

const DIALOG360_PAYLOAD = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'WABA_ID',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '601111111111', phone_number_id: 'PHONE_ID' },
            contacts: [{ profile: { name: 'Buyer' }, wa_id: '60222222222' }],
            messages: [
              {
                from: '60222222222',
                id: 'wamid.test',
                timestamp: '1700000000',
                text: { body: 'I want to buy a condo in KL, budget 500k' },
                type: 'text',
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
}

test.describe('POST /api/webhook/whatsapp', () => {
  test('returns 200 for empty body', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, { data: {} })
    expect(res.status()).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  test('returns 200 for payload with no entry', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, {
      data: { object: 'whatsapp_business_account', entry: [] },
    })
    expect(res.status()).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  test('returns 200 for non-text message type', async ({ request }) => {
    const payload = JSON.parse(JSON.stringify(DIALOG360_PAYLOAD))
    payload.entry[0].changes[0].value.messages[0].type = 'image'
    delete payload.entry[0].changes[0].value.messages[0].text

    const res = await request.post(WEBHOOK_URL, { data: payload })
    expect(res.status()).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  test('returns 200 for payload with no messages array', async ({ request }) => {
    const payload = JSON.parse(JSON.stringify(DIALOG360_PAYLOAD))
    payload.entry[0].changes[0].value.messages = []

    const res = await request.post(WEBHOOK_URL, { data: payload })
    expect(res.status()).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  test('returns 200 for valid payload when agent not found', async ({ request }) => {
    // NEXT_PUBLIC_CONVEX_URL must be set for this to hit Convex (which returns null for unknown phone)
    const res = await request.post(WEBHOOK_URL, { data: DIALOG360_PAYLOAD })
    expect(res.status()).toBe(200)
    // Either processed (agent found) or silently ignored (agent not found) — both return 200
    expect(await res.json()).toMatchObject({ ok: true })
  })
})
