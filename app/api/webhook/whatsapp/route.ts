import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { parseWebhookPayload, sendWhatsAppMessage } from '@/lib/whatsapp'
import { runConversation } from '@/lib/ai'
import { generateEmbedding } from '@/lib/embeddings'
import type { Id } from '@/convex/_generated/dataModel'

export const runtime = 'nodejs'

function getConvex() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = parseWebhookPayload(body)

  // Silently ack anything we don't handle
  if (!parsed) return NextResponse.json({ ok: true })

  const { agentPhone, buyerPhone, buyerName, messageText } = parsed
  const convex = getConvex()

  // Look up agent
  const agent = await convex.query(api.agents.getAgentByWhatsappNumber, {
    whatsappNumber: agentPhone,
  })

  if (!agent || agent.subscriptionStatus !== 'active') {
    return NextResponse.json({ ok: true })
  }

  // Get or create lead
  const leadId = await convex.mutation(api.leads.getOrCreateLead, {
    agentId: agent._id as Id<'agents'>,
    buyerPhone,
  })

  // Save buyer message
  await convex.mutation(api.messages.saveMessage, {
    agentId: agent._id as Id<'agents'>,
    leadId: leadId as Id<'leads'>,
    role: 'buyer',
    content: messageText,
  })

  // Fetch conversation history
  const history = await convex.query(api.messages.getMessagesForLead, {
    leadId: leadId as Id<'leads'>,
  })

  // Vector search for relevant listing chunks
  let listingChunks: { text: string }[] = []
  try {
    const embedding = await generateEmbedding(messageText)
    listingChunks = await convex.query(api.listingChunks.searchChunks, {
      agentId: agent._id as Id<'agents'>,
      embedding,
      limit: 5,
    })
  } catch {
    // Non-fatal — AI will respond without listing context
  }

  // Run AI conversation
  const result = await runConversation({
    agentName: agent.name,
    history: history.map((m) => ({ role: m.role, content: m.content })),
    newMessage: messageText,
    listingChunks,
  })

  // Save AI reply
  await convex.mutation(api.messages.saveMessage, {
    agentId: agent._id as Id<'agents'>,
    leadId: leadId as Id<'leads'>,
    role: 'ai',
    content: result.reply,
  })

  // Update lead classification and summary
  await convex.mutation(api.leads.updateLead, {
    leadId: leadId as Id<'leads'>,
    classification: result.classification,
    summary: result.summary ?? undefined,
    handedOff: result.handoff,
  })

  // Send AI reply to buyer
  await sendWhatsAppMessage({ to: buyerPhone, text: result.reply })

  // Notify agent on hot/warm handoff
  if (result.handoff && agent.whatsappNumber) {
    const level = result.classification.toUpperCase()
    const notif = `New ${level} lead from +${buyerPhone}${result.summary ? ` — ${result.summary}` : ''}. Check ReplyPilot dashboard.`
    await sendWhatsAppMessage({ to: agent.whatsappNumber, text: notif })
  }

  return NextResponse.json({ ok: true })
}
