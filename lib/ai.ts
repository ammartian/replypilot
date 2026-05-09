import Anthropic from '@anthropic-ai/sdk'
import type { LeadClassification } from '@/convex/constants'

export type ConversationMessage = {
  role: 'buyer' | 'ai'
  content: string
}

export type ConversationResult = {
  reply: string
  classification: LeadClassification
  summary: string | null
  handoff: boolean
}

export type ListingChunk = {
  text: string
}

export async function runConversation({
  agentName,
  history,
  newMessage,
  listingChunks,
}: {
  agentName: string
  history: ConversationMessage[]
  newMessage: string
  listingChunks: ListingChunk[]
}): Promise<ConversationResult> {
  // Implemented in Step 8
  throw new Error('Not yet implemented — Step 8')
}
