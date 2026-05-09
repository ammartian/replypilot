import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

function getConvex() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? '')
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const convex = getConvex()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const plan = (session.metadata?.plan ?? 'plus') as 'plus' | 'pro'
      await convex.mutation(api.agents.activateAgentSubscription, {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        plan,
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await convex.mutation(api.agents.markAgentPaymentFailed, {
        stripeCustomerId: invoice.customer as string,
      })
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await convex.mutation(api.agents.deactivateAgentSubscription, {
        stripeCustomerId: subscription.customer as string,
      })
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
