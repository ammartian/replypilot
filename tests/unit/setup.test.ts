import { describe, it, expect } from 'vitest'

describe('test setup', () => {
  it('vitest is configured', () => {
    expect(true).toBe(true)
  })

  it('can use DOM matchers', () => {
    const el = document.createElement('button')
    el.textContent = 'Click me'
    document.body.appendChild(el)
    expect(el).toBeInTheDocument()
    document.body.removeChild(el)
  })
})
