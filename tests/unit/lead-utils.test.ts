import { describe, it, expect } from 'vitest'
import {
  classificationBadge,
  statusLabel,
  formatPhone,
} from '@/lib/lead-utils'

describe('classificationBadge', () => {
  it('hot → red label', () => {
    const { label, color } = classificationBadge('hot')
    expect(label).toBe('Hot')
    expect(color).toContain('red')
  })

  it('warm → orange label', () => {
    const { label, color } = classificationBadge('warm')
    expect(label).toBe('Warm')
    expect(color).toContain('orange')
  })

  it('normal → blue label', () => {
    const { label, color } = classificationBadge('normal')
    expect(label).toBe('Normal')
    expect(color).toContain('blue')
  })

  it('cold → gray label', () => {
    const { label, color } = classificationBadge('cold')
    expect(label).toBe('Cold')
    expect(color).toContain('gray')
  })

  it('new → purple label', () => {
    const { label, color } = classificationBadge('new')
    expect(label).toBe('New')
    expect(color).toContain('purple')
  })
})

describe('statusLabel', () => {
  it('new → New', () => expect(statusLabel('new')).toBe('New'))
  it('contacted → Contacted', () => expect(statusLabel('contacted')).toBe('Contacted'))
  it('closed → Closed', () => expect(statusLabel('closed')).toBe('Closed'))
})

describe('formatPhone', () => {
  it('formats Malaysian mobile', () => {
    expect(formatPhone('60111111111')).toBe('+60111111111')
  })

  it('already has + prefix → unchanged', () => {
    expect(formatPhone('+60111111111')).toBe('+60111111111')
  })
})
