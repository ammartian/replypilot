import { action, internalQuery, mutation } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'

export const saveChunk = mutation({
  args: {
    agentId: v.id('agents'),
    listingId: v.id('listings'),
    text: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('listingChunks', args)
  },
})

export const deleteChunksByListing = mutation({
  args: { listingId: v.id('listings') },
  handler: async (ctx, { listingId }) => {
    const chunks = await ctx.db
      .query('listingChunks')
      .withIndex('by_listingId', (q) => q.eq('listingId', listingId))
      .collect()
    await Promise.all(chunks.map((c) => ctx.db.delete(c._id)))
  },
})

export const getChunkById = internalQuery({
  args: { id: v.id('listingChunks') },
  handler: async (ctx, { id }): Promise<Doc<'listingChunks'> | null> => ctx.db.get(id),
})

export const searchChunks = action({
  args: {
    agentId: v.id('agents'),
    embedding: v.array(v.float64()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { agentId, embedding, limit }): Promise<Doc<'listingChunks'>[]> => {
    const results = await ctx.vectorSearch('listingChunks', 'by_embedding', {
      vector: embedding,
      filter: (q) => q.eq('agentId', agentId),
      limit: limit ?? 5,
    })
    const chunks: Array<Doc<'listingChunks'> | null> = await Promise.all(
      results.map((r) =>
        ctx.runQuery(internal.listingChunks.getChunkById, { id: r._id as Id<'listingChunks'> })
      )
    )
    return chunks.filter((c): c is Doc<'listingChunks'> => c !== null)
  },
})
