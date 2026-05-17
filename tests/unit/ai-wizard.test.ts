import { describe, it, expect } from 'vitest'
import { buildMappedConstraints } from '@/lib/ai-config'
import type { WizardAnswers } from '@/lib/ai-config'

// Wizard step count is tested via the exported STEPS constant.
// These tests validate the logic that drives step 5 (Preview) behaviour:
// the instruction generation inputs are deterministic given wizard answers.

const BASE: WizardAnswers = {
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
  ],
  handoffTrigger: 'hot_warm',
  handoffMessagePreset: 'reach_out',
}

describe('wizard step 5 — preview input determinism', () => {
  it('same answers always produce same constraints', () => {
    const a = buildMappedConstraints(BASE)
    const b = buildMappedConstraints(BASE)
    expect(a).toEqual(b)
  })

  it('changing answers changes constraints', () => {
    const a = buildMappedConstraints(BASE)
    const b = buildMappedConstraints({ ...BASE, tone: 'formal' })
    expect(a.toneInstruction).not.toBe(b.toneInstruction)
  })

  it('going back and changing handoff trigger updates constraint', () => {
    const hot = buildMappedConstraints({ ...BASE, handoffTrigger: 'hot' })
    const hotWarm = buildMappedConstraints({ ...BASE, handoffTrigger: 'hot_warm' })
    expect(hot.handoffTrigger).not.toBe(hotWarm.handoffTrigger)
  })

  it('editing answers after preview (back navigation) produces fresh constraints', () => {
    const before = buildMappedConstraints(BASE)
    const after = buildMappedConstraints({ ...BASE, emojiAllowed: true })
    expect(before.emojiInstruction).toContain('Never')
    expect(after.emojiInstruction).toContain('allowed')
  })
})
