import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const getOrCreateLead = mutation({
  args: {
    agentId: v.id('agents'),
    buyerPhone: v.string(),
  },
  handler: async (ctx, { agentId, buyerPhone }) => {
    const existing = await ctx.db
      .query('leads')
      .withIndex('by_agentId_and_buyerPhone', (q) =>
        q.eq('agentId', agentId).eq('buyerPhone', buyerPhone)
      )
      .first()

    if (existing) return existing._id

    return ctx.db.insert('leads', {
      agentId,
      buyerPhone,
      classification: 'new',
      status: 'new',
      handedOff: false,
    })
  },
})

export const updateLead = mutation({
  args: {
    leadId: v.id('leads'),
    classification: v.optional(
      v.union(
        v.literal('hot'),
        v.literal('warm'),
        v.literal('normal'),
        v.literal('cold'),
        v.literal('new'),
      ),
    ),
    summary: v.optional(v.string()),
    handedOff: v.optional(v.boolean()),
    status: v.optional(
      v.union(v.literal('new'), v.literal('contacted'), v.literal('closed')),
    ),
  },
  handler: async (ctx, { leadId, ...patch }) => {
    await ctx.db.patch(leadId, patch)
  },
})

export const getLeadsForAgent = query({
  args: { agentId: v.id('agents') },
  handler: async (ctx, { agentId }) => {
    return ctx.db
      .query('leads')
      .withIndex('by_agentId', (q) => q.eq('agentId', agentId))
      .order('desc')
      .collect()
  },
})

export const getLead = query({
  args: { leadId: v.id('leads') },
  handler: async (ctx, { leadId }) => {
    return ctx.db.get(leadId)
  },
})
