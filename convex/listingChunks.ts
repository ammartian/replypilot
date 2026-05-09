import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

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

export const searchChunks = query({
  args: {
    agentId: v.id('agents'),
    embedding: v.array(v.float64()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { agentId, embedding, limit }) => {
    const results = await ctx.db
      .query('listingChunks')
      .withVectorIndex('by_embedding', (q) =>
        q.vector(embedding).filter((q) => q.eq(q.field('agentId'), agentId))
      )
      .take(limit ?? 5)
    return results
  },
})
