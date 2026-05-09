import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/webhook/stripe/route'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'

const mockMutation = vi.hoisted(() => vi.fn())
const mockConstructEvent = vi.hoisted(() => vi.fn())

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }),
}))

vi.mock('@/convex/agents', () => ({
  activateAgentSubscription: vi.fn(),
  deactivateAgentSubscription: vi.fn(),
  markAgentPaymentFailed: vi.fn(),
}))

vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    mutation = mockMutation
  },
}))

function makeRequest(body: string, signature = 'test-sig'): NextRequest {
  return new NextRequest('http://localhost/api/webhook/stripe', {
    method: 'POST',
    headers: {
      'stripe-signature': signature,
      'content-type': 'application/json',
    },
    body,
  })
}

function makeEvent(type: string, data: object): Stripe.Event {
  return {
    id: 'evt_test',
    type,
    data: { object: data },
    object: 'event',
    api_version: '2025-04-30.basil',
    created: Date.now(),
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as unknown as Stripe.Event
}

describe('POST /api/webhook/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test.convex.cloud'
    mockMutation.mockResolvedValue(null)
  })

  it('returns 400 when stripe-signature header missing', async () => {
    const req = new NextRequest('http://localhost/api/webhook/stripe', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(400)
  })

  it('activates agent on checkout.session.completed', async () => {
    const session = {
      id: 'cs_test',
      customer: 'cus_123',
      subscription: 'sub_123',
      metadata: { plan: 'starter' },
      customer_details: { email: 'agent@test.com' },
    }
    mockConstructEvent.mockReturnValue(
      makeEvent('checkout.session.completed', session)
    )
    mockMutation.mockResolvedValue(null)

    const res = await POST(makeRequest(JSON.stringify(session)))
    expect(res.status).toBe(200)
    expect(mockMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        plan: 'starter',
      })
    )
  })

  it('marks agent inactive on invoice.payment_failed', async () => {
    const invoice = {
      customer: 'cus_123',
      subscription: 'sub_123',
    }
    mockConstructEvent.mockReturnValue(
      makeEvent('invoice.payment_failed', invoice)
    )
    mockMutation.mockResolvedValue(null)

    const res = await POST(makeRequest(JSON.stringify(invoice)))
    expect(res.status).toBe(200)
    expect(mockMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stripeCustomerId: 'cus_123' })
    )
  })

  it('deactivates agent on customer.subscription.deleted', async () => {
    const subscription = {
      id: 'sub_123',
      customer: 'cus_123',
    }
    mockConstructEvent.mockReturnValue(
      makeEvent('customer.subscription.deleted', subscription)
    )
    mockMutation.mockResolvedValue(null)

    const res = await POST(makeRequest(JSON.stringify(subscription)))
    expect(res.status).toBe(200)
    expect(mockMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stripeCustomerId: 'cus_123' })
    )
  })

  it('returns 200 for unhandled event types', async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent('customer.created', { id: 'cus_123' })
    )

    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(200)
  })
})
