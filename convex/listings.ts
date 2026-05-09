import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    return ctx.storage.generateUploadUrl()
  },
})

export const saveListingFile = mutation({
  args: {
    fileName: v.string(),
    fileType: v.string(),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, { fileName, fileType, storageId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const agent = await ctx.db
      .query('agents')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!agent) throw new Error('Agent not found')

    return ctx.db.insert('listings', {
      agentId: agent._id,
      fileName,
      fileType,
      storageId,
      status: 'processing',
    })
  },
})

export const getListingsForAgent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const agent = await ctx.db
      .query('agents')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!agent) return []

    return ctx.db
      .query('listings')
      .withIndex('by_agentId', (q) => q.eq('agentId', agent._id))
      .order('desc')
      .collect()
  },
})

export const hasListingsForAgent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return false

    const agent = await ctx.db
      .query('agents')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!agent) return false

    const listing = await ctx.db
      .query('listings')
      .withIndex('by_agentId', (q) => q.eq('agentId', agent._id))
      .first()
    return listing !== null
  },
})

export const updateListingStatus = mutation({
  args: {
    listingId: v.id('listings'),
    status: v.union(v.literal('processing'), v.literal('ready'), v.literal('error')),
  },
  handler: async (ctx, { listingId, status }) => {
    await ctx.db.patch(listingId, { status })
  },
})
