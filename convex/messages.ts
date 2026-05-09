import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const saveMessage = mutation({
  args: {
    agentId: v.id('agents'),
    leadId: v.id('leads'),
    role: v.union(v.literal('buyer'), v.literal('ai')),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('messages', args)
  },
})

export const getMessagesForLead = query({
  args: { leadId: v.id('leads') },
  handler: async (ctx, { leadId }) => {
    return ctx.db
      .query('messages')
      .withIndex('by_leadId', (q) => q.eq('leadId', leadId))
      .order('asc')
      .collect()
  },
})
