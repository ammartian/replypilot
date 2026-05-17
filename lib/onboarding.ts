export type AgentOnboardingState = {
  subscriptionStatus: 'active' | 'inactive' | 'past_due'
  whatsappStatus: 'pending' | 'connected'
  hasAiConfig: boolean
  hasListings: boolean
}

export type OnboardingStep = 1 | 2 | 3 | 4 | 'done'

export function getOnboardingStep(state: AgentOnboardingState): OnboardingStep {
  if (state.subscriptionStatus !== 'active') return 1
  if (state.whatsappStatus !== 'connected') return 2
  if (state.hasListings) return 'done'
  if (!state.hasAiConfig) return 3
  return 4
}
