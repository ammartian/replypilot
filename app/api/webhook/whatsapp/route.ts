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
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let parsed: ReturnType<typeof parseWebhookPayload>
  try {
    parsed = parseWebhookPayload(body as Parameters<typeof parseWebhookPayload>[0])
  } catch (err) {
    return NextResponse.json({ error: 'Parse error', detail: String(err) }, { status: 400 })
  }

  if (!parsed) return NextResponse.json({ ok: true })

  try {
  const { agentPhone, buyerPhone, buyerName, messageText, messageId } = parsed
  console.log('[webhook] received messageId:', messageId, '| text:', messageText.slice(0, 40))
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

  // Atomically save buyer message — returns null if messageId already exists (duplicate webhook).
  // A single mutation eliminates the race condition a query+mutation pair would have.
  const savedId = await convex.mutation(api.messages.saveBuyerMessageIdempotent, {
    agentId: agent._id as Id<'agents'>,
    leadId: leadId as Id<'leads'>,
    content: messageText,
    messageId,
  })
  console.log('[webhook] saveBuyerMessageIdempotent result:', savedId, '| messageId:', messageId)
  if (savedId === null) {
    console.log('[webhook] duplicate — skipping processing for messageId:', messageId)
    return NextResponse.json({ ok: true })
  }

  // Fetch conversation history
  const history = await convex.query(api.messages.getMessagesForLead, {
    leadId: leadId as Id<'leads'>,
  })

  // Vector search for relevant listing chunks
  let listingChunks: { text: string }[] = []
  try {
    const embedding = await generateEmbedding(messageText)
    listingChunks = await convex.action(api.listingChunks.searchChunks, {
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
    history: history.map((m: { role: 'buyer' | 'ai'; content: string }) => ({ role: m.role, content: m.content })),
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[webhook/whatsapp]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
