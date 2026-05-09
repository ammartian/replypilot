import { describe, it, expect } from 'vitest'
import { classifyLead, type LeadQualification } from '@/convex/lib/classify'

describe('classifyLead', () => {
  it('hot: budget + specific location + timeline under 3 months', () => {
    const q: LeadQualification = {
      budget: 'RM 500k',
      location: 'Mont Kiara',
      propertyType: 'condo',
      timeline: '1 month',
    }
    expect(classifyLead(q)).toBe('hot')
  })

  it('warm: budget + preferences + timeline 3-6 months', () => {
    const q: LeadQualification = {
      budget: 'RM 600k',
      location: 'PJ',
      propertyType: 'condo',
      timeline: '4 months',
    }
    expect(classifyLead(q)).toBe('warm')
  })

  it('normal: some info but vague on key points', () => {
    const q: LeadQualification = {
      budget: 'RM 400k',
      location: null,
      propertyType: null,
      timeline: null,
    }
    expect(classifyLead(q)).toBe('normal')
  })

  it('cold: no budget, just browsing', () => {
    const q: LeadQualification = {
      budget: null,
      location: null,
      propertyType: null,
      timeline: 'just browsing',
    }
    expect(classifyLead(q)).toBe('cold')
  })

  it('new: nothing gathered yet', () => {
    const q: LeadQualification = {
      budget: null,
      location: null,
      propertyType: null,
      timeline: null,
    }
    expect(classifyLead(q)).toBe('new')
  })

  it('warm: budget clear + vague location + short timeline still warm not hot', () => {
    const q: LeadQualification = {
      budget: 'RM 700k',
      location: 'KL area',
      propertyType: null,
      timeline: '2 months',
    }
    expect(classifyLead(q)).toBe('warm')
  })

  it('hot requires specific (non-vague) location', () => {
    const q: LeadQualification = {
      budget: 'RM 500k',
      location: 'somewhere in KL',
      propertyType: 'condo',
      timeline: '1 week',
    }
    // vague location → warm not hot
    expect(classifyLead(q)).toBe('warm')
  })
})
