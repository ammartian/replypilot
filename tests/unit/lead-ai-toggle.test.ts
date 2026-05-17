import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')

describe('aiEnabled flag', () => {
  it('new lead created by getOrCreateLead has aiEnabled undefined (treated as true)', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const agentId = await ctx.db.insert('agents', {
        userId: 'user_ai_1',
        name: 'Agent',
        email: 'a@test.com',
        plan: 'plus',
        status: 'active',
        whatsappStatus: 'connected',
        subscriptionStatus: 'active',
      })
      const leadId = await ctx.db.insert('leads', {
        agentId,
        buyerPhone: '60111000001',
        classification: 'new',
        status: 'new',
        handedOff: false,
      })
      const lead = await ctx.db.get(leadId)
      expect(lead?.aiEnabled).toBeUndefined()
      expect(lead?.aiEnabled !== false).toBe(true)
    })
  })

  it('updateLead can disable AI (aiEnabled: false)', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const agentId = await ctx.db.insert('agents', {
        userId: 'user_ai_2',
        name: 'Agent',
        email: 'b@test.com',
        plan: 'plus',
        status: 'active',
        whatsappStatus: 'connected',
        subscriptionStatus: 'active',
      })
      const leadId = await ctx.db.insert('leads', {
        agentId,
        buyerPhone: '60111000002',
        classification: 'new',
        status: 'new',
        handedOff: false,
      })
      await ctx.db.patch(leadId, { aiEnabled: false })
      const lead = await ctx.db.get(leadId)
      expect(lead?.aiEnabled).toBe(false)
    })
  })

  it('updateLead can re-enable AI (aiEnabled: true)', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const agentId = await ctx.db.insert('agents', {
        userId: 'user_ai_3',
        name: 'Agent',
        email: 'c@test.com',
        plan: 'plus',
        status: 'active',
        whatsappStatus: 'connected',
        subscriptionStatus: 'active',
      })
      const leadId = await ctx.db.insert('leads', {
        agentId,
        buyerPhone: '60111000003',
        classification: 'new',
        status: 'new',
        handedOff: false,
        aiEnabled: false,
      })
      await ctx.db.patch(leadId, { aiEnabled: true })
      const lead = await ctx.db.get(leadId)
      expect(lead?.aiEnabled).toBe(true)
    })
  })
})
