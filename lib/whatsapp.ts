export type Dialog360Payload = {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts: Array<{ profile: { name: string }; wa_id: string }>
        messages: Array<{
          from: string
          id: string
          timestamp: string
          text?: { body: string }
          type: string
        }>
      }
      field: string
    }>
  }>
}

export type ParsedMessage = {
  agentPhone: string
  buyerPhone: string
  buyerName: string
  messageText: string
  messageId: string
}

export function parseWebhookPayload(payload: Dialog360Payload): ParsedMessage | null {
  const entry = payload.entry?.[0]
  if (!entry) return null

  const change = entry.changes.find((c) => c.field === 'messages')
  if (!change) return null

  const messages = change.value.messages
  if (!messages?.length) return null

  const msg = messages[0]
  if (msg.type !== 'text' || !msg.text?.body) return null

  const contact = change.value.contacts?.[0]

  return {
    agentPhone: change.value.metadata.display_phone_number,
    buyerPhone: msg.from,
    buyerName: contact?.profile?.name ?? msg.from,
    messageText: msg.text.body,
    messageId: msg.id,
  }
}

export async function sendWhatsAppMessage({
  to,
  text,
  agentPhone,
}: {
  to: string
  text: string
  agentPhone?: string
}): Promise<void> {
  const apiKey = process.env.DIALOG360_API_KEY
  const base = process.env.DIALOG360_BASE_URL ?? 'https://waba.360dialog.io'
  const url = `${base}/v1/messages`

  await fetch(url, {
    method: 'POST',
    headers: {
      'D360-API-KEY': apiKey!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
}
