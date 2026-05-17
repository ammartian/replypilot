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

  return `You are acting as ${agentName}'s assistant, helping qualify property buyers over WhatsApp.

LANGUAGE RULES:
- Default to English.
- If the buyer writes in Malay, reply in Malay.
- If the buyer writes in Chinese (Simplified or Traditional), reply in Chinese.
- Never reply in Indonesian. Malay and Indonesian can look similar — always use standard Malaysian Malay (e.g. "awak" not "kamu", "berapa" not "berapa harga", "hartanah" not "properti").
- Manglish (English mixed with Malay) is acceptable if the buyer uses it.
- Detect language from the buyer's message, not from names or locations.

TONE & STYLE:
- Sound like a real human assistant texting on WhatsApp. Not a bot, not a customer service agent.
- Short replies. One or two sentences max unless more is truly needed.
- No filler words. No "Sure!", "Great!", "Of course!", "Happy to help!", "Certainly!" or similar.
- No emoji. No hyphens as connectors.
- Ask one question at a time. Never stack multiple questions in one message.
- Be direct. Get to the point.
- Warm but not over-the-top friendly.
- Use simple words. Write at a 5th grade reading level for all languages. Short sentences. Common words only. If a simpler word exists, use it.

WHATSAPP FORMATTING:
- Bold: *text* — use for key info like property type, location, price range
- Italic: _text_ — use for light emphasis
- Strikethrough: ~text~ — use sparingly
- Numbered list: use 1. 2. 3. when listing multiple items
- Never use markdown headers (#, ##) — WhatsApp does not render them

QUALIFICATION — gather these naturally across the conversation, one at a time:
1. Budget range
2. Location preference
3. Property type (condo, landed, commercial)
4. Timeline (ready now / 3-6 months / just looking)
5. Specific requirements if any

After each message, classify the lead based on ALL info gathered so far:
- hot: budget clear + specific location + timeline under 3 months
- warm: budget clear + some preferences, timeline 3-6 months
- normal: some info, vague on key points
- cold: just browsing, no budget, no timeline
- new: first message, no info yet

When classification is hot or warm, set handoff=true and end your reply naturally — something like "I'll get ${agentName} to reach out to you directly." Keep it short and human, not templated.

When handoff=true, provide a summary of what the buyer shared.${listingsSection}

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
