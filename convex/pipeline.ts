import { action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'
import { chunkText } from '../lib/chunker'
import { generateEmbeddings } from '../lib/embeddings'

async function extractText(blob: Blob, fileType: string): Promise<string> {
  if (fileType === 'application/pdf' || fileType.includes('pdf')) {
    const { PDFParse } = await import('pdf-parse')
    const buffer = Buffer.from(await blob.arrayBuffer())
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    return result.text
  }

  if (
    fileType.includes('word') ||
    fileType.includes('docx') ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const { default: mammoth } = await import('mammoth')
    const buffer = Buffer.from(await blob.arrayBuffer())
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  // Plain text, CSV, or unknown — decode as UTF-8
  return blob.text()
}

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
      const blob = await ctx.storage.get(listing.storageId)
      if (!blob) throw new Error('File not found in storage')

      const text = await extractText(blob, listing.fileType)
      if (!text.trim()) {
        await ctx.runMutation(api.listings.updateListingStatus, { listingId, status: 'ready' })
        return
      }

      const chunks = chunkText(text, 800, { overlap: true })
      const embeddings = await generateEmbeddings(chunks)

      // Delete old chunks if reprocessing
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
    } catch {
      await ctx.runMutation(api.listings.updateListingStatus, { listingId, status: 'error' })
    }
  },
})
