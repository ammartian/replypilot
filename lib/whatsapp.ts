export type MetaWebhookPayload = {
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
  phoneNumberId: string
  agentPhone: string
  buyerPhone: string
  buyerName: string
  messageText: string
  messageId: string
}

export function parseWebhookPayload(payload: MetaWebhookPayload): ParsedMessage | null {
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
    phoneNumberId: change.value.metadata.phone_number_id,
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
  phoneNumberId,
  accessToken,
}: {
  to: string
  text: string
  phoneNumberId: string
  accessToken: string
}): Promise<void> {
  await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
