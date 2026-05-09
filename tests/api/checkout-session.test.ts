import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/checkout/create-session/route'
import { NextRequest } from 'next/server'

const mockCheckoutCreate = vi.hoisted(() => vi.fn())
const mockGetAuthUserId = vi.hoisted(() => vi.fn())

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: mockCheckoutCreate,
      },
    },
  }),
}))

vi.mock('@convex-dev/auth/nextjs/server', () => ({
  convexAuthNextjsToken: vi.fn().mockResolvedValue('mock-token'),
}))

const mockConvexQuery = vi.hoisted(() => vi.fn())
const mockConvexMutation = vi.hoisted(() => vi.fn())

vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    setAuth = vi.fn()
    query = mockConvexQuery
    mutation = mockConvexMutation
  },
}))

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/checkout/create-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockAgent = {
  _id: 'agent_123',
  userId: 'user_123',
  name: 'Test Agent',
  email: 'agent@test.com',
  plan: 'plus',
  status: 'pending',
  subscriptionStatus: 'inactive',
  whatsappStatus: 'pending',
}

describe('POST /api/checkout/create-session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test.convex.cloud'
    process.env.STRIPE_PLUS_PRICE_ID = 'price_plus_test'
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro_test'
    process.env.SITE_URL = 'http://localhost:3000'
  })

  it('returns 401 when agent not found', async () => {
    mockConvexQuery.mockResolvedValue(null)
    const res = await POST(makeRequest({ plan: 'plus' }))
    expect(res.status).toBe(401)
  })

  it('creates checkout session for plus plan', async () => {
    mockConvexQuery.mockResolvedValue(mockAgent)
    mockConvexMutation.mockResolvedValue(null)
    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' })

    const res = await POST(makeRequest({ plan: 'plus' }))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.url).toBe('https://checkout.stripe.com/test')
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [expect.objectContaining({ price: 'price_plus_test' })],
        mode: 'subscription',
        metadata: expect.objectContaining({ plan: 'plus' }),
      })
    )
  })

  it('creates checkout session for pro plan', async () => {
    mockConvexQuery.mockResolvedValue(mockAgent)
    mockConvexMutation.mockResolvedValue(null)
    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test-pro' })

    const res = await POST(makeRequest({ plan: 'pro' }))
    expect(res.status).toBe(200)
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [expect.objectContaining({ price: 'price_pro_test' })],
        metadata: expect.objectContaining({ plan: 'pro' }),
      })
    )
  })

  it('returns 400 for invalid plan', async () => {
    mockConvexQuery.mockResolvedValue(mockAgent)
    const res = await POST(makeRequest({ plan: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('returns 500 when Stripe returns no url', async () => {
    mockConvexQuery.mockResolvedValue(mockAgent)
    mockConvexMutation.mockResolvedValue(null)
    mockCheckoutCreate.mockResolvedValue({ url: null })

    const res = await POST(makeRequest({ plan: 'plus' }))
    expect(res.status).toBe(500)
  })
})
