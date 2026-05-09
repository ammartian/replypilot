import { mutation, query, action } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { api } from './_generated/api'
import { chunkText } from '../lib/chunker'
import { generateEmbeddings } from '../lib/embeddings'

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

    const listingId = await ctx.db.insert('listings', {
      agentId: agent._id,
      fileName,
      fileType,
      storageId,
      status: 'processing',
    })

    await ctx.scheduler.runAfter(0, api.pipeline.processListing, { listingId })
    return listingId
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

export const getListingById = query({
  args: { listingId: v.id('listings') },
  handler: async (ctx, { listingId }) => {
    return ctx.db.get(listingId)
  },
})

export const getStorageUrl = action({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    const userId = await ctx.auth.getUserIdentity()
    if (!userId) throw new Error('Not authenticated')
    return ctx.storage.getUrl(storageId)
  },
})

export const processTextListing = action({
  args: {
    label: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { label, content }) => {
    const userId = await ctx.auth.getUserIdentity()
    if (!userId) throw new Error('Not authenticated')

    const agent = await ctx.runQuery(api.agents.getAgent)
    if (!agent) throw new Error('Agent not found')

    const listingId = await ctx.runMutation(api.listings.insertListing, {
      agentId: agent._id,
      fileName: label,
      fileType: 'text/plain',
    })

    try {
      const chunks = chunkText(content, 800, { overlap: true })
      const embeddings = await generateEmbeddings(chunks)

      await ctx.runMutation(api.listingChunks.deleteChunksByListing, { listingId })

      for (let i = 0; i < chunks.length; i++) {
        await ctx.runMutation(api.listingChunks.saveChunk, {
          agentId: agent._id,
          listingId,
          text: chunks[i],
          embedding: embeddings[i],
        })
      }

      await ctx.runMutation(api.listings.updateListingStatus, { listingId, status: 'ready' })
    } catch (err) {
      await ctx.runMutation(api.listings.updateListingStatus, { listingId, status: 'error' })
      throw err
    }
  },
})

export const insertListing = mutation({
  args: {
    agentId: v.id('agents'),
    fileName: v.string(),
    fileType: v.string(),
  },
  handler: async (ctx, { agentId, fileName, fileType }) => {
    return ctx.db.insert('listings', {
      agentId,
      fileName,
      fileType,
      status: 'processing',
    })
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
