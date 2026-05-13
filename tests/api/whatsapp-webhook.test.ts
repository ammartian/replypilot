import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/webhook/whatsapp/route'
import { NextRequest } from 'next/server'

const mockMutation = vi.hoisted(() => vi.fn())
const mockQuery = vi.hoisted(() => vi.fn())
const mockAction = vi.hoisted(() => vi.fn())
const mockRunConversation = vi.hoisted(() => vi.fn())
const mockSendMessage = vi.hoisted(() => vi.fn())
const mockGenerateEmbedding = vi.hoisted(() => vi.fn())

vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    query = mockQuery
    mutation = mockMutation
    action = mockAction
  },
}))

vi.mock('@/lib/ai', () => ({
  runConversation: mockRunConversation,
}))

vi.mock('@/lib/embeddings', () => ({
  generateEmbedding: mockGenerateEmbedding,
}))

vi.mock('@/lib/whatsapp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/whatsapp')>()
  return {
    ...actual,
    sendWhatsAppMessage: mockSendMessage,
  }
})

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/webhook/whatsapp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const ACTIVE_AGENT = {
  _id: 'agent_123',
  userId: 'user_123',
  name: 'Ahmad',
  email: 'ahmad@test.com',
  plan: 'plus',
  status: 'active',
  subscriptionStatus: 'active',
  whatsappNumber: '601111111111',
  whatsappStatus: 'connected',
  metaPhoneNumberId: 'PHONE_ID',
  metaAccessToken: 'meta-token',
}

const META_PAYLOAD = {
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

describe('GET /api/webhook/whatsapp', () => {
  beforeEach(() => {
    process.env.META_WEBHOOK_VERIFY_TOKEN = 'test-verify-token'
  })

  it('returns challenge when token matches', async () => {
    const req = new NextRequest(
      'http://localhost/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=abc123'
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('abc123')
  })

  it('returns 403 when token does not match', async () => {
    const req = new NextRequest(
      'http://localhost/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123'
    )
    const res = await GET(req)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/webhook/whatsapp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test.convex.cloud'
    process.env.META_WEBHOOK_VERIFY_TOKEN = 'test-verify-token'

    mockQuery.mockResolvedValue(null)
    mockAction.mockResolvedValue([])
    mockMutation.mockResolvedValue('lead_123')
    mockRunConversation.mockResolvedValue({
      reply: 'Thanks for your interest! Let me ask a few questions.',
      classification: 'new',
      summary: null,
    })
    mockSendMessage.mockResolvedValue(undefined)
    mockGenerateEmbedding.mockResolvedValue(Array(1536).fill(0))
  })

  it('returns 200 and sends AI reply for valid inbound message', async () => {
    mockQuery
      .mockResolvedValueOnce(ACTIVE_AGENT) // getAgentByPhoneNumberId
      .mockResolvedValueOnce([])            // getMessagesForLead
    const res = await POST(makeRequest(META_PAYLOAD))
    expect(res.status).toBe(200)
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '60222222222',
        text: expect.any(String),
        phoneNumberId: 'PHONE_ID',
        accessToken: 'meta-token',
      })
    )
  })

  it('returns 200 and skips processing for duplicate messageId', async () => {
    mockQuery.mockResolvedValueOnce(ACTIVE_AGENT) // getAgentByPhoneNumberId
    mockMutation
      .mockResolvedValueOnce('lead_123') // getOrCreateLead
      .mockResolvedValueOnce(null)        // saveBuyerMessageIdempotent → duplicate, returns null
    const res = await POST(makeRequest(META_PAYLOAD))
    expect(res.status).toBe(200)
    expect(mockSendMessage).not.toHaveBeenCalled()
    expect(mockRunConversation).not.toHaveBeenCalled()
  })

  it('returns 200 silently when agent not found', async () => {
    // mockQuery already returns null by default
    const res = await POST(makeRequest(META_PAYLOAD))
    expect(res.status).toBe(200)
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('returns 200 silently when agent subscription inactive', async () => {
    mockQuery.mockResolvedValue({ ...ACTIVE_AGENT, subscriptionStatus: 'inactive' })
    const res = await POST(makeRequest(META_PAYLOAD))
    expect(res.status).toBe(200)
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('returns 200 for non-text messages (ignored)', async () => {
    const payload = JSON.parse(JSON.stringify(META_PAYLOAD))
    payload.entry[0].changes[0].value.messages[0].type = 'image'
    const res = await POST(makeRequest(payload))
    expect(res.status).toBe(200)
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('saves buyer message and AI reply to DB', async () => {
    mockQuery
      .mockResolvedValueOnce(ACTIVE_AGENT)
      .mockResolvedValueOnce([])
    await POST(makeRequest(META_PAYLOAD))
    expect(mockMutation.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('notifies agent on hot/warm handoff', async () => {
    mockQuery
      .mockResolvedValueOnce(ACTIVE_AGENT)
      .mockResolvedValueOnce([])
    mockRunConversation.mockResolvedValue({
      reply: "Let me connect you with Ahmad who can help you further. They'll be in touch shortly!",
      classification: 'hot',
      summary: 'Budget: RM 500k, KL condo, ready to buy',
      handoff: true,
    })
    const res = await POST(makeRequest(META_PAYLOAD))
    expect(res.status).toBe(200)
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ to: '60222222222' })
    )
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ACTIVE_AGENT.whatsappNumber,
        phoneNumberId: 'PHONE_ID',
        accessToken: 'meta-token',
      })
    )
  })
})
