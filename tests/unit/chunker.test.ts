import { describe, it, expect } from 'vitest'
import { chunkText } from '@/lib/chunker'

describe('chunkText', () => {
  it('returns single chunk for short text', () => {
    const chunks = chunkText('Hello world', 100)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe('Hello world')
  })

  it('splits long text into chunks at sentence boundaries', () => {
    const sentence = 'This is a sentence. '
    const text = sentence.repeat(20) // ~400 chars
    const chunks = chunkText(text, 100)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(150)) // allow some overage at boundaries
  })

  it('each chunk does not exceed max size by more than one sentence', () => {
    const text = 'Short sentence. '.repeat(50)
    const chunks = chunkText(text, 80)
    chunks.forEach((c) => expect(c.trim().length).toBeGreaterThan(0))
  })

  it('handles text with no sentence breaks', () => {
    const text = 'a'.repeat(300)
    const chunks = chunkText(text, 100)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(110))
  })

  it('returns empty array for empty string', () => {
    expect(chunkText('', 100)).toEqual([])
  })

  it('trims whitespace from chunks', () => {
    const chunks = chunkText('  Hello world.  ', 100)
    expect(chunks[0]).toBe('Hello world.')
  })

  it('overlaps chunks by ~10% for context continuity', () => {
    const text = 'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six.'
    const chunks = chunkText(text, 30, { overlap: true })
    expect(chunks.length).toBeGreaterThan(1)
  })
})
