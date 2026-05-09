import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { ConvexHttpClient } from 'convex/browser'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '@/convex/_generated/api'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { plan } = await req.json()

  if (!['starter', 'pro'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const PRICE_IDS: Record<string, string> = {
    starter: process.env.STRIPE_STARTER_PRICE_ID!,
    pro: process.env.STRIPE_PRO_PRICE_ID!,
  }

  const token = await convexAuthNextjsToken()
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  if (token) convex.setAuth(token)

  const agent = await convex.query(api.agents.getAgent, {})
  if (!agent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: agent.stripeCustomerId,
    customer_email: agent.stripeCustomerId ? undefined : agent.email,
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    mode: 'subscription',
    success_url: `${siteUrl}/onboarding?payment=success`,
    cancel_url: `${siteUrl}/onboarding`,
    metadata: { agentId: agent._id, plan },
  })

  if (!session.url) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }

  if (!agent.stripeCustomerId && session.customer) {
    await convex.mutation(api.agents.setStripeCustomerId, {
      stripeCustomerId: session.customer as string,
    })
  }

  return NextResponse.json({ url: session.url })
}
