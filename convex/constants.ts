export const LEAD_CLASSIFICATIONS = ['hot', 'warm', 'normal', 'cold', 'new'] as const
export type LeadClassification = typeof LEAD_CLASSIFICATIONS[number]

export const LEAD_STATUSES = ['new', 'contacted', 'closed'] as const
export type LeadStatus = typeof LEAD_STATUSES[number]

export const WHATSAPP_STATUSES = ['pending', 'connected'] as const
export type WhatsAppStatus = typeof WHATSAPP_STATUSES[number]

export const SUBSCRIPTION_STATUSES = ['active', 'inactive', 'past_due'] as const
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number]

export const LISTING_STATUSES = ['processing', 'ready', 'error'] as const
export type ListingStatus = typeof LISTING_STATUSES[number]

export const AGENT_STATUSES = ['active', 'inactive', 'pending'] as const
export type AgentStatus = typeof AGENT_STATUSES[number]

export const PLANS = ['plus', 'pro'] as const
export type Plan = typeof PLANS[number]

export const MESSAGE_ROLES = ['buyer', 'ai', 'agent'] as const
export type MessageRole = typeof MESSAGE_ROLES[number]
