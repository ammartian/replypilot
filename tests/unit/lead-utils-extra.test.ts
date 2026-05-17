import { describe, it, expect } from 'vitest'
import { toWaMePhone, formatDateTime, formatTime } from '@/lib/lead-utils'

const TS = new Date('2024-06-15T09:30:00').getTime()
const TS2 = new Date('2024-07-20T14:00:00').getTime()

describe('toWaMePhone', () => {
  it('strips + prefix', () => {
    expect(toWaMePhone('+60123456789')).toBe('60123456789')
  })

  it('leaves number without + unchanged', () => {
    expect(toWaMePhone('60123456789')).toBe('60123456789')
  })

  it('strips spaces', () => {
    expect(toWaMePhone('+60 12 345 6789')).toBe('60123456789')
  })

  it('strips both + and spaces', () => {
    expect(toWaMePhone('+1 800 555 0100')).toBe('18005550100')
  })
})

describe('formatDateTime', () => {
  it('returns non-empty string', () => {
    expect(formatDateTime(TS)).toBeTruthy()
  })

  it('includes the year', () => {
    expect(formatDateTime(TS)).toContain('2024')
  })

  it('differs for different timestamps', () => {
    expect(formatDateTime(TS)).not.toBe(formatDateTime(TS2))
  })

  it('contains digits', () => {
    expect(/\d/.test(formatDateTime(TS))).toBe(true)
  })
})

describe('formatTime', () => {
  it('returns non-empty string', () => {
    expect(formatTime(TS)).toBeTruthy()
  })

  it('is shorter than formatDateTime for same timestamp', () => {
    expect(formatTime(TS).length).toBeLessThan(formatDateTime(TS).length)
  })

  it('differs for different timestamps', () => {
    const TS_LATER = new Date('2024-06-15T14:00:00').getTime()
    expect(formatTime(TS)).not.toBe(formatTime(TS_LATER))
  })

  it('contains digits', () => {
    expect(/\d/.test(formatTime(TS))).toBe(true)
  })
})
