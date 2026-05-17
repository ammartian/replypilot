import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate }
  },
}))

import { buildMappedConstraints, generateInstructions } from '@/lib/ai-config'
import type { WizardAnswers } from '@/lib/ai-config'

const BASE_ANSWERS: WizardAnswers = {
  industry: 'real_estate',
  businessName: 'KL Luxury Realty',
  businessDescription: 'Luxury condo agency in KL.',
  primaryLanguage: 'auto',
  allowCodeSwitching: true,
  strictMalay: false,
  tone: 'friendly_professional',
  emojiAllowed: false,
  replyLength: 'short',
  fillerPhrasesAllowed: false,
  qualificationFields: [
    { field: 'budget', required: true, order: 0 },
    { field: 'location', required: true, order: 1 },
    { field: 'timeline', required: false, order: 2 },
  ],
  handoffTrigger: 'hot_warm',
  handoffMessagePreset: 'reach_out',
}

describe('buildMappedConstraints', () => {
  it('maps tone correctly', () => {
    const c = buildMappedConstraints(BASE_ANSWERS)
    expect(c.toneInstruction).toContain('warm and professional')
  })

  it('maps emoji=false to strict no-emoji rule', () => {
    const c = buildMappedConstraints(BASE_ANSWERS)
    expect(c.emojiInstruction).toContain('Never use emoji')
  })

  it('maps emoji=true to allowed', () => {
    const c = buildMappedConstraints({ ...BASE_ANSWERS, emojiAllowed: true })
    expect(c.emojiInstruction).toContain('allowed')
  })

  it('maps replyLength=short correctly', () => {
    const c = buildMappedConstraints(BASE_ANSWERS)
    expect(c.lengthInstruction).toContain('1-2 sentences')
  })

  it('maps fillerPhrasesAllowed=false to filler rule', () => {
    const c = buildMappedConstraints(BASE_ANSWERS)
    expect(c.fillerInstruction).toContain('Sure!')
  })

  it('maps fillerPhrasesAllowed=true to empty string', () => {
    const c = buildMappedConstraints({ ...BASE_ANSWERS, fillerPhrasesAllowed: true })
    expect(c.fillerInstruction).toBe('')
  })

  it('maps primaryLanguage=auto', () => {
    const c = buildMappedConstraints(BASE_ANSWERS)
    expect(c.langInstruction).toContain("Detect language")
  })

  it('maps primaryLanguage=ms', () => {
    const c = buildMappedConstraints({ ...BASE_ANSWERS, primaryLanguage: 'ms' })
    expect(c.langInstruction).toContain('Malay')
  })

  it('adds strictMalay instruction when primaryLanguage=ms and strictMalay=true', () => {
    const c = buildMappedConstraints({ ...BASE_ANSWERS, primaryLanguage: 'ms', strictMalay: true })
    expect(c.strictMalayInstruction).toContain('Malaysian Malay')
  })

  it('no strictMalay instruction when primaryLanguage is not ms', () => {
    const c = buildMappedConstraints(BASE_ANSWERS)
    expect(c.strictMalayInstruction).toBe('')
  })

  it('maps handoffTrigger=hot_warm', () => {
    const c = buildMappedConstraints(BASE_ANSWERS)
    expect(c.handoffTrigger).toContain('hot or warm')
  })

  it('maps handoffTrigger=hot only', () => {
    const c = buildMappedConstraints({ ...BASE_ANSWERS, handoffTrigger: 'hot' })
    expect(c.handoffTrigger).toContain('hot.')
  })

  it('maps preset handoff message reach_out', () => {
    const c = buildMappedConstraints(BASE_ANSWERS)
    expect(c.handoffMessage).toContain('reach out')
  })

  it('uses custom handoff message when preset=custom', () => {
    const c = buildMappedConstraints({
      ...BASE_ANSWERS,
      handoffMessagePreset: 'custom',
      handoffMessageCustom: 'Talk to our team directly!',
    })
    expect(c.handoffMessage).toBe('Talk to our team directly!')
  })

  it('sorts qualification fields by order', () => {
    const c = buildMappedConstraints(BASE_ANSWERS)
    const lines = c.qualificationList.split('\n')
    expect(lines[0]).toContain('Budget')
    expect(lines[1]).toContain('Location')
    expect(lines[2]).toContain('Timeline')
  })

  it('marks required fields', () => {
    const c = buildMappedConstraints(BASE_ANSWERS)
    expect(c.qualificationList).toContain('Budget range (required)')
    expect(c.qualificationList).toContain('Timeline (optional)')
  })

  it('maps industry label', () => {
    const c = buildMappedConstraints(BASE_ANSWERS)
    expect(c.industry).toBe('Real Estate')
  })
})

describe('generateInstructions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls Claude and returns generated text', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'You are a professional assistant. Your tone is warm.' }],
    })
    const result = await generateInstructions(BASE_ANSWERS)
    expect(result).toBe('You are a professional assistant. Your tone is warm.')
    expect(mockCreate).toHaveBeenCalledOnce()
  })

  it('passes business description in the prompt', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Generated.' }],
    })
    await generateInstructions(BASE_ANSWERS)
    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('Luxury condo agency in KL.')
  })

  it('passes business name in the prompt', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'Generated.' }] })
    await generateInstructions(BASE_ANSWERS)
    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('KL Luxury Realty')
  })

  it('passes tone instruction in the prompt', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })
    await generateInstructions(BASE_ANSWERS)
    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('warm and professional')
  })

  it('throws if Claude returns no text block', async () => {
    mockCreate.mockResolvedValue({ content: [] })
    await expect(generateInstructions(BASE_ANSWERS)).rejects.toThrow()
  })

  it('uses haiku model', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })
    await generateInstructions(BASE_ANSWERS)
    expect(mockCreate.mock.calls[0][0].model).toMatch(/haiku/i)
  })
})
