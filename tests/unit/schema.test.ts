import { describe, it, expect } from 'vitest'
import {
  LEAD_CLASSIFICATIONS,
  LEAD_STATUSES,
  WHATSAPP_STATUSES,
  SUBSCRIPTION_STATUSES,
  LISTING_STATUSES,
  AGENT_STATUSES,
  PLANS,
  MESSAGE_ROLES,
} from '@/convex/constants'

describe('schema constants', () => {
  it('lead classifications cover all valid states', () => {
    expect(LEAD_CLASSIFICATIONS).toEqual(['hot', 'warm', 'normal', 'cold', 'new'])
  })

  it('lead statuses cover agent workflow', () => {
    expect(LEAD_STATUSES).toEqual(['new', 'contacted', 'closed'])
  })

  it('whatsapp connection statuses', () => {
    expect(WHATSAPP_STATUSES).toEqual(['pending', 'connected'])
  })

  it('subscription statuses match stripe lifecycle', () => {
    expect(SUBSCRIPTION_STATUSES).toEqual(['active', 'inactive', 'past_due'])
  })

  it('listing processing statuses', () => {
    expect(LISTING_STATUSES).toEqual(['processing', 'ready', 'error'])
  })

  it('agent account statuses', () => {
    expect(AGENT_STATUSES).toEqual(['active', 'inactive', 'pending'])
  })

  it('pricing plans', () => {
    expect(PLANS).toEqual(['plus', 'pro'])
  })

  it('message roles include agent for human-sent replies', () => {
    expect(MESSAGE_ROLES).toContain('buyer')
    expect(MESSAGE_ROLES).toContain('ai')
    expect(MESSAGE_ROLES).toContain('agent')
  })
})
