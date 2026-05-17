import { describe, it, expect } from 'vitest'
import { getOnboardingStep, type AgentOnboardingState } from '@/lib/onboarding'

const base: AgentOnboardingState = {
  subscriptionStatus: 'inactive',
  whatsappStatus: 'pending',
  hasAiConfig: false,
  hasListings: false,
}

describe('getOnboardingStep', () => {
  it('returns step 1 when subscription inactive', () => {
    expect(getOnboardingStep({ ...base, subscriptionStatus: 'inactive' })).toBe(1)
  })

  it('returns step 1 when subscription past_due', () => {
    expect(getOnboardingStep({ ...base, subscriptionStatus: 'past_due' })).toBe(1)
  })

  it('returns step 2 when subscription active but WhatsApp pending', () => {
    expect(getOnboardingStep({ ...base, subscriptionStatus: 'active' })).toBe(2)
  })

  it('returns step 3 when subscription active, WhatsApp connected, but no AI config', () => {
    expect(
      getOnboardingStep({
        subscriptionStatus: 'active',
        whatsappStatus: 'connected',
        hasAiConfig: false,
        hasListings: false,
      }),
    ).toBe(3)
  })

  it('returns step 4 when subscription active, WhatsApp connected, AI config set, but no listings', () => {
    expect(
      getOnboardingStep({
        subscriptionStatus: 'active',
        whatsappStatus: 'connected',
        hasAiConfig: true,
        hasListings: false,
      }),
    ).toBe(4)
  })

  it('returns done when all steps complete', () => {
    expect(
      getOnboardingStep({
        subscriptionStatus: 'active',
        whatsappStatus: 'connected',
        hasAiConfig: true,
        hasListings: true,
      }),
    ).toBe('done')
  })

  it('returns done even if AI config missing but listings exist (legacy agents)', () => {
    expect(
      getOnboardingStep({
        subscriptionStatus: 'active',
        whatsappStatus: 'connected',
        hasAiConfig: false,
        hasListings: true,
      }),
    ).toBe('done')
  })
})
