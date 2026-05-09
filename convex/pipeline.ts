import { action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'
import { chunkText } from '../lib/chunker'
import { generateEmbeddings } from '../lib/embeddings'

export const processListing = action({
  args: { listingId: v.id('listings') },
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.runQuery(api.listings.getListingById, { listingId })
    if (!listing) throw new Error(`Listing ${listingId} not found`)

    if (!listing.storageId) {
      await ctx.runMutation(api.listings.updateListingStatus, { listingId, status: 'error' })
      return
    }

    try {
      const fileUrl = await ctx.storage.getUrl(listing.storageId)
      if (!fileUrl) throw new Error('File URL not found in storage')

      const siteUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '.vercel.app') ?? 'http://localhost:3000'
      const extractRes = await fetch(`${siteUrl}/api/listings/extract-text`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileUrl, fileType: listing.fileType }),
      })

      if (!extractRes.ok) {
        const body = await extractRes.json().catch(() => ({}))
        throw new Error(`Text extraction failed: ${extractRes.status} — ${body.error ?? 'unknown'}`)
      }
      const { text } = await extractRes.json()

      if (!text?.trim()) {
        await ctx.runMutation(api.listings.updateListingStatus, { listingId, status: 'ready' })
        return
      }

      const chunks = chunkText(text, 800, { overlap: true })
      const embeddings = await generateEmbeddings(chunks)

      await ctx.runMutation(api.listingChunks.deleteChunksByListing, { listingId })

      for (let i = 0; i < chunks.length; i++) {
        await ctx.runMutation(api.listingChunks.saveChunk, {
          agentId: listing.agentId,
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
