import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  ...authTables,
  agents: defineTable({
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    plan: v.union(v.literal('plus'), v.literal('pro')),
    status: v.union(v.literal('active'), v.literal('inactive'), v.literal('pending')),
    whatsappNumber: v.optional(v.string()),
    whatsappStatus: v.union(v.literal('pending'), v.literal('connected')),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.union(
      v.literal('active'),
      v.literal('inactive'),
      v.literal('past_due'),
    ),
    metaPhoneNumberId: v.optional(v.string()),
    metaWabaId: v.optional(v.string()),
    metaAccessToken: v.optional(v.string()),
    metaTokenExpiresAt: v.optional(v.number()),
  })
    .index('by_userId', ['userId'])
    .index('by_whatsappNumber', ['whatsappNumber'])
    .index('by_stripeCustomerId', ['stripeCustomerId'])
    .index('by_metaPhoneNumberId', ['metaPhoneNumberId']),

  listings: defineTable({
    agentId: v.id('agents'),
    fileName: v.string(),
    fileType: v.string(),
    storageId: v.optional(v.id('_storage')),
    status: v.union(v.literal('processing'), v.literal('ready'), v.literal('error')),
    content: v.optional(v.string()),
  }).index('by_agentId', ['agentId']),

  listingChunks: defineTable({
    agentId: v.id('agents'),
    listingId: v.id('listings'),
    text: v.string(),
    embedding: v.array(v.float64()),
  })
    .index('by_agentId', ['agentId'])
    .index('by_listingId', ['listingId'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['agentId'],
    }),

  leads: defineTable({
    agentId: v.id('agents'),
    buyerPhone: v.string(),
    classification: v.union(
      v.literal('hot'),
      v.literal('warm'),
      v.literal('normal'),
      v.literal('cold'),
      v.literal('new'),
    ),
    summary: v.optional(v.string()),
    status: v.union(v.literal('new'), v.literal('contacted'), v.literal('closed')),
    handedOff: v.boolean(),
  })
    .index('by_agentId', ['agentId'])
    .index('by_agentId_and_buyerPhone', ['agentId', 'buyerPhone']),

  messages: defineTable({
    agentId: v.id('agents'),
    leadId: v.id('leads'),
    role: v.union(v.literal('buyer'), v.literal('ai')),
    content: v.string(),
    messageId: v.optional(v.string()),
  })
    .index('by_leadId', ['leadId'])
    .index('by_agentId', ['agentId'])
    .index('by_messageId', ['messageId']),
})
