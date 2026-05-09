export type AgentOnboardingState = {
  subscriptionStatus: 'active' | 'inactive' | 'past_due'
  whatsappStatus: 'pending' | 'connected'
  hasListings: boolean
}

export type OnboardingStep = 1 | 2 | 3 | 'done'

export function getOnboardingStep(state: AgentOnboardingState): OnboardingStep {
  if (state.subscriptionStatus !== 'active') return 1
  if (state.whatsappStatus !== 'connected') return 2
  if (!state.hasListings) return 3
  return 'done'
}
