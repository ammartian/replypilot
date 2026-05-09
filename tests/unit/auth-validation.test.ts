import { describe, it, expect } from 'vitest'
import { validateSignupInput, validateLoginInput } from '@/lib/auth-validation'

describe('validateSignupInput', () => {
  it('accepts valid input', () => {
    const result = validateSignupInput({
      name: 'Ahmad Hakimi',
      email: 'ahmad@example.com',
      password: 'password123',
    })
    expect(result.ok).toBe(true)
  })

  it('rejects empty name', () => {
    const result = validateSignupInput({
      name: '',
      email: 'ahmad@example.com',
      password: 'password123',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.name).toBeDefined()
  })

  it('rejects invalid email', () => {
    const result = validateSignupInput({
      name: 'Ahmad',
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.email).toBeDefined()
  })

  it('rejects password shorter than 8 chars', () => {
    const result = validateSignupInput({
      name: 'Ahmad',
      email: 'ahmad@example.com',
      password: 'short',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.password).toBeDefined()
  })

  it('trims whitespace from name and email', () => {
    const result = validateSignupInput({
      name: '  Ahmad  ',
      email: '  ahmad@example.com  ',
      password: 'password123',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('Ahmad')
      expect(result.data.email).toBe('ahmad@example.com')
    }
  })
})

describe('validateLoginInput', () => {
  it('accepts valid credentials', () => {
    const result = validateLoginInput({
      email: 'ahmad@example.com',
      password: 'password123',
    })
    expect(result.ok).toBe(true)
  })

  it('rejects empty email', () => {
    const result = validateLoginInput({ email: '', password: 'password123' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.email).toBeDefined()
  })

  it('rejects empty password', () => {
    const result = validateLoginInput({ email: 'ahmad@example.com', password: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.password).toBeDefined()
  })
})
