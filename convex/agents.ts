import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

export const createAgent = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { name, email }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const existing = await ctx.db
      .query('agents')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (existing) return existing._id

    return ctx.db.insert('agents', {
      userId,
      name,
      email,
      plan: 'plus',
      status: 'pending',
      whatsappStatus: 'pending',
      subscriptionStatus: 'inactive',
    })
  },
})

// Fallback: creates agent using profile stored in auth users table.
// Called from onboarding when signup's createAgent call failed silently.
export const ensureAgent = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const existing = await ctx.db
      .query('agents')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (existing) return existing._id

    const user = await ctx.db.get(userId)
    if (!user) throw new Error('User record not found')

    return ctx.db.insert('agents', {
      userId,
      name: (user as { name?: string }).name ?? 'Agent',
      email: (user as { email?: string }).email ?? '',
      plan: 'plus',
      status: 'pending',
      whatsappStatus: 'pending',
      subscriptionStatus: 'inactive',
    })
  },
})

export const getAgent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    return ctx.db
      .query('agents')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
  },
})

export const activateAgentSubscription = mutation({
  args: {
    agentId: v.id('agents'),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    plan: v.union(v.literal('plus'), v.literal('pro')),
  },
  handler: async (ctx, { agentId, stripeCustomerId, stripeSubscriptionId, plan }) => {
    const agent = await ctx.db.get(agentId)
    if (!agent) throw new Error(`No agent found for id ${agentId}`)

    await ctx.db.patch(agent._id, {
      stripeCustomerId,
      stripeSubscriptionId,
      plan,
      status: 'active',
      subscriptionStatus: 'active',
    })
  },
})

export const markAgentPaymentFailed = mutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    const agent = await ctx.db
      .query('agents')
      .withIndex('by_stripeCustomerId', (q) => q.eq('stripeCustomerId', stripeCustomerId))
      .first()
    if (!agent) throw new Error(`No agent found for customer ${stripeCustomerId}`)

    await ctx.db.patch(agent._id, {
      subscriptionStatus: 'past_due',
      status: 'inactive',
    })
  },
})

export const deactivateAgentSubscription = mutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    const agent = await ctx.db
      .query('agents')
      .withIndex('by_stripeCustomerId', (q) => q.eq('stripeCustomerId', stripeCustomerId))
      .first()
    if (!agent) throw new Error(`No agent found for customer ${stripeCustomerId}`)

    await ctx.db.patch(agent._id, {
      subscriptionStatus: 'inactive',
      status: 'inactive',
    })
  },
})

export const setStripeCustomerId = mutation({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, { stripeCustomerId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const agent = await ctx.db
      .query('agents')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!agent) throw new Error('Agent not found')

    await ctx.db.patch(agent._id, { stripeCustomerId })
  },
})

export const setWhatsappNumber = mutation({
  args: { whatsappNumber: v.string() },
  handler: async (ctx, { whatsappNumber }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const agent = await ctx.db
      .query('agents')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!agent) throw new Error('Agent not found')

    await ctx.db.patch(agent._id, { whatsappNumber, whatsappStatus: 'pending' })
  },
})

export const getAgentByWhatsappNumber = query({
  args: { whatsappNumber: v.string() },
  handler: async (ctx, { whatsappNumber }) => {
    return ctx.db
      .query('agents')
      .withIndex('by_whatsappNumber', (q) => q.eq('whatsappNumber', whatsappNumber))
      .first()
  },
})

export const setMetaCredentials = mutation({
  args: {
    metaAccessToken: v.string(),
    metaPhoneNumberId: v.string(),
    metaWabaId: v.string(),
    whatsappNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const agent = await ctx.db
      .query('agents')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!agent) throw new Error('Agent not found')

    await ctx.db.patch(agent._id, {
      ...args,
      whatsappStatus: 'connected',
      metaTokenExpiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
    })
  },
})

export const getAgentByPhoneNumberId = query({
  args: { phoneNumberId: v.string() },
  handler: async (ctx, { phoneNumberId }) => {
    return ctx.db
      .query('agents')
      .withIndex('by_metaPhoneNumberId', (q) => q.eq('metaPhoneNumberId', phoneNumberId))
      .first()
  },
})

export const saveAiConfig = mutation({
  args: {
    industry: v.string(),
    wizardAnswers: v.any(),
    generatedInstructions: v.string(),
  },
  handler: async (ctx, { industry, wizardAnswers, generatedInstructions }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const agent = await ctx.db
      .query('agents')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!agent) throw new Error('Agent not found')

    await ctx.db.patch(agent._id, {
      industry,
      aiConfig: {
        generatedInstructions,
        wizardAnswers,
        lastUpdated: Date.now(),
      },
    })
  },
})
