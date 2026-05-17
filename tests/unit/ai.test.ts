import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate }
  },
}))

import { runConversation } from '@/lib/ai'

function makeTextBlock(text: string) {
  return { type: 'text', text }
}

function mockResponse(text: string) {
  mockCreate.mockResolvedValue({ content: [makeTextBlock(text)] })
}

const BASE_ARGS = {
  agentName: 'Ahmad',
  history: [],
  newMessage: 'I want to buy a condo in KL, budget 500k',
  listingChunks: [],
}

describe('runConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns reply, classification, summary, handoff from valid JSON response', async () => {
    mockResponse(
      JSON.stringify({
        reply: 'What is your preferred location in KL?',
        classification: 'new',
        summary: null,
        handoff: false,
      })
    )
    const result = await runConversation(BASE_ARGS)
    expect(result.reply).toBe('What is your preferred location in KL?')
    expect(result.classification).toBe('new')
    expect(result.summary).toBeNull()
    expect(result.handoff).toBe(false)
  })

  it('sends agent name in system prompt', async () => {
    mockResponse(
      JSON.stringify({ reply: 'Hi!', classification: 'new', summary: null, handoff: false })
    )
    await runConversation(BASE_ARGS)
    const systemPrompt: string = mockCreate.mock.calls[0][0].system
    expect(systemPrompt).toContain('Ahmad')
  })

  it('includes listing chunks in system prompt when provided', async () => {
    mockResponse(
      JSON.stringify({ reply: 'Here is a listing.', classification: 'new', summary: null, handoff: false })
    )
    await runConversation({
      ...BASE_ARGS,
      listingChunks: [{ text: 'Condo in KLCC, RM 600k, 900sqft' }],
    })
    const systemPrompt: string = mockCreate.mock.calls[0][0].system
    expect(systemPrompt).toContain('Condo in KLCC')
  })

  it('maps conversation history to correct Anthropic message format', async () => {
    mockResponse(
      JSON.stringify({ reply: 'Got it.', classification: 'new', summary: null, handoff: false })
    )
    await runConversation({
      ...BASE_ARGS,
      history: [
        { role: 'buyer', content: 'Hello' },
        { role: 'ai', content: 'Hi there!' },
      ],
    })
    const messages = mockCreate.mock.calls[0][0].messages
    expect(messages[0]).toEqual({ role: 'user', content: 'Hello' })
    expect(messages[1]).toEqual({ role: 'assistant', content: 'Hi there!' })
  })

  it('sets handoff=true and classification=hot for hot lead', async () => {
    mockResponse(
      JSON.stringify({
        reply: "Let me connect you with Ahmad who can help you further. They'll be in touch shortly!",
        classification: 'hot',
        summary: 'Budget: RM 500k, KL condo, ready to buy',
        handoff: true,
      })
    )
    const result = await runConversation(BASE_ARGS)
    expect(result.handoff).toBe(true)
    expect(result.classification).toBe('hot')
    expect(result.summary).toBeTruthy()
  })

  it('throws if Claude returns non-JSON', async () => {
    mockResponse('Sorry, I cannot help with that.')
    await expect(runConversation(BASE_ARGS)).rejects.toThrow()
  })

  it('handles response wrapped in markdown code fences', async () => {
    mockCreate.mockResolvedValue({
      content: [makeTextBlock('```json\n{"reply":"Hi!","classification":"new","summary":null,"handoff":false}\n```')]
    })
    const result = await runConversation(BASE_ARGS)
    expect(result.reply).toBe('Hi!')
  })

  it('uses claude-haiku model', async () => {
    mockResponse(
      JSON.stringify({ reply: 'Ok', classification: 'new', summary: null, handoff: false })
    )
    await runConversation(BASE_ARGS)
    const model: string = mockCreate.mock.calls[0][0].model
    expect(model).toMatch(/haiku/i)
  })

  it('injects customInstructions into system prompt when provided', async () => {
    mockResponse(
      JSON.stringify({ reply: 'Hi!', classification: 'new', summary: null, handoff: false })
    )
    await runConversation({
      ...BASE_ARGS,
      customInstructions: 'Always reply in formal English. Never use emoji.',
    })
    const systemPrompt: string = mockCreate.mock.calls[0][0].system
    expect(systemPrompt).toContain('Always reply in formal English. Never use emoji.')
  })

  it('uses default instructions when customInstructions is not provided', async () => {
    mockResponse(
      JSON.stringify({ reply: 'Hi!', classification: 'new', summary: null, handoff: false })
    )
    await runConversation(BASE_ARGS)
    const systemPrompt: string = mockCreate.mock.calls[0][0].system
    // Default prompt still contains core qualification guidance
    expect(systemPrompt).toContain('Budget')
  })
})
