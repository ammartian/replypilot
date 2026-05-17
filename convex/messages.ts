import { action, mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { api } from './_generated/api'
import { sendWhatsAppMessage } from '../lib/whatsapp'

export const saveMessage = mutation({
  args: {
    agentId: v.id('agents'),
    leadId: v.id('leads'),
    role: v.union(v.literal('buyer'), v.literal('ai'), v.literal('agent')),
    content: v.string(),
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('messages', args)
  },
})

// Atomically saves the buyer message only if messageId hasn't been seen before.
// Returns null when duplicate (caller should skip processing).
// Using a mutation (not query+mutation) eliminates the TOCTOU race condition —
// Convex mutations are serialized so two concurrent calls cannot both pass the check.
export const saveBuyerMessageIdempotent = mutation({
  args: {
    agentId: v.id('agents'),
    leadId: v.id('leads'),
    content: v.string(),
    messageId: v.string(),
  },
  handler: async (ctx, { agentId, leadId, content, messageId }) => {
    const existing = await ctx.db
      .query('messages')
      .withIndex('by_messageId', (q) => q.eq('messageId', messageId))
      .first()
    if (existing) return null
    return ctx.db.insert('messages', { agentId, leadId, role: 'buyer', content, messageId })
  },
})

export const sendAgentReply = action({
  args: { leadId: v.id('leads'), content: v.string() },
  handler: async (ctx, { leadId, content }) => {
    await getAuthUserId(ctx)
    const agent = await ctx.runQuery(api.agents.getAgent)
    const lead = await ctx.runQuery(api.leads.getLead, { leadId })
    if (!agent || !lead) throw new Error('Not found')
    if (!agent.metaPhoneNumberId || !agent.metaAccessToken) throw new Error('WhatsApp not connected')

    await sendWhatsAppMessage({
      to: lead.buyerPhone,
      text: content,
      phoneNumberId: agent.metaPhoneNumberId,
      accessToken: agent.metaAccessToken,
    })

    await ctx.runMutation(api.messages.saveMessage, {
      agentId: agent._id,
      leadId,
      role: 'agent',
      content,
    })

    await ctx.runMutation(api.leads.updateLead, { leadId, aiEnabled: false })
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
