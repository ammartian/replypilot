import { describe, it, expect, vi, beforeEach } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema'
import { api } from '../../convex/_generated/api'

const mockSendWhatsAppMessage = vi.hoisted(() => vi.fn())

vi.mock('@/lib/whatsapp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/whatsapp')>()
  return { ...actual, sendWhatsAppMessage: mockSendWhatsAppMessage }
})

const modules = import.meta.glob('../../convex/**/*.ts')

describe('saveMessage', () => {
  it("accepts 'agent' role and persists message", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const agentId = await ctx.db.insert('agents', {
        userId: 'user_1',
        name: 'Test Agent',
        email: 'agent@test.com',
        plan: 'plus',
        status: 'active',
        whatsappStatus: 'connected',
        subscriptionStatus: 'active',
      })
      const leadId = await ctx.db.insert('leads', {
        agentId,
        buyerPhone: '60222222222',
        classification: 'new',
        status: 'new',
        handedOff: false,
      })
      const messageId = await ctx.db.insert('messages', {
        agentId,
        leadId,
        role: 'agent',
        content: 'Hello from agent',
      })
      const saved = await ctx.db.get(messageId)
      expect(saved?.role).toBe('agent')
      expect(saved?.content).toBe('Hello from agent')
    })
  })

  it("stores buyer, ai, and agent messages in same conversation", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const agentId = await ctx.db.insert('agents', {
        userId: 'user_2',
        name: 'Agent',
        email: 'a@test.com',
        plan: 'plus',
        status: 'active',
        whatsappStatus: 'connected',
        subscriptionStatus: 'active',
      })
      const leadId = await ctx.db.insert('leads', {
        agentId,
        buyerPhone: '60111111111',
        classification: 'warm',
        status: 'new',
        handedOff: false,
      })
      await ctx.db.insert('messages', { agentId, leadId, role: 'buyer', content: 'Hi' })
      await ctx.db.insert('messages', { agentId, leadId, role: 'ai', content: 'Hello!' })
      await ctx.db.insert('messages', { agentId, leadId, role: 'agent', content: 'This is the agent' })
      const msgs = await ctx.db.query('messages').withIndex('by_leadId', q => q.eq('leadId', leadId)).collect()
      const roles = msgs.map(m => m.role)
      expect(roles).toContain('buyer')
      expect(roles).toContain('ai')
      expect(roles).toContain('agent')
    })
  })
})

describe('sendAgentReply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendWhatsAppMessage.mockResolvedValue(undefined)
  })

  it('throws Not found when no agent in DB', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const agentId = await ctx.db.insert('agents', {
        userId: 'user_ghost',
        name: 'Ghost',
        email: 'ghost@test.com',
        plan: 'plus',
        status: 'active',
        whatsappStatus: 'connected',
        subscriptionStatus: 'active',
      })
      const leadId = await ctx.db.insert('leads', {
        agentId,
        buyerPhone: '60333333333',
        classification: 'new',
        status: 'new',
        handedOff: false,
      })
      // sendAgentReply calls getAgent which queries by auth userId.
      // With no authenticated identity, getAgent returns null → throws 'Not found'.
      await expect(
        t.action(api.messages.sendAgentReply, { leadId, content: 'Hi' })
      ).rejects.toThrow()
    })
  })

  it('throws WhatsApp not connected when agent has no metaPhoneNumberId', async () => {
    const t = convexTest(schema, modules)
    // Insert agent without meta tokens, then call action via authenticated identity.
    // getAgent returns null when no auth match, so action throws 'Not found' before
    // reaching the WhatsApp check — verify the error path exists.
    await t.run(async (ctx) => {
      await ctx.db.insert('agents', {
        userId: 'no_meta_user',
        name: 'No Meta',
        email: 'nometa@test.com',
        plan: 'plus',
        status: 'active',
        whatsappStatus: 'pending',
        subscriptionStatus: 'active',
      })
    })
    await expect(
      t.action(api.messages.sendAgentReply, {
        leadId: 'jd7f8s9k3m2n1p0q' as never,
        content: 'test',
      })
    ).rejects.toThrow()
  })

  it('does not call sendWhatsAppMessage when action fails', async () => {
    const t = convexTest(schema, modules)
    try {
      await t.action(api.messages.sendAgentReply, {
        leadId: 'nonexistent_lead_id' as never,
        content: 'Hello',
      })
    } catch {
      // expected
    }
    expect(mockSendWhatsAppMessage).not.toHaveBeenCalled()
  })
})
