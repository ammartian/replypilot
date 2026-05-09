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

function buildSystemPrompt(agentName: string, listingChunks: ListingChunk[]): string {
  const listingsSection =
    listingChunks.length > 0
      ? `\n\nAGENT'S PROPERTY LISTINGS (use this to answer questions about available properties):\n${listingChunks.map((c) => c.text).join('\n---\n')}`
      : ''

  return `You are an AI assistant representing real estate agent ${agentName}. Your job is to qualify property buyers via WhatsApp conversation.

Qualify buyers naturally across 4-5 turns by gathering:
1. Budget range
2. Location preference
3. Property type (condo, landed, commercial)
4. Timeline (ready to buy / 3-6 months / just browsing)
5. Any specific requirements

Respond in the buyer's language (Malay/English/Mandarin/Manglish). Be friendly and conversational.

After each message, classify the lead based on ALL information gathered so far:
- hot: budget clear + specific location + timeline < 3 months
- warm: budget clear + some preferences, timeline 3-6 months
- normal: some info, vague on key points
- cold: just browsing, no budget, very early
- new: first message, no info yet

When classification is hot or warm, set handoff=true and end your reply with: "Let me connect you with ${agentName} who can help you further. They'll be in touch shortly!"

When handoff=true, provide a summary of the lead's details.${listingsSection}

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "reply": "your message to the buyer",
  "classification": "hot|warm|normal|cold|new",
  "summary": "brief lead summary or null",
  "handoff": true|false
}`
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
  const client = new Anthropic()

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: (m.role === 'buyer' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: newMessage },
  ]

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: buildSystemPrompt(agentName, listingChunks),
    // Prefill assistant turn with "{" to force raw JSON output, no markdown fences
    messages: [...messages, { role: 'assistant', content: '{' }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Strip markdown fences, then restore the prefilled "{" if Claude omitted it
  let raw = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  if (!raw.startsWith('{')) raw = '{' + raw

  const parsed = JSON.parse(raw) as ConversationResult
  return parsed
}
