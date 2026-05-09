import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockEmbeddingsCreate = vi.hoisted(() => vi.fn())

vi.mock('openai', () => ({
  default: class {
    embeddings = { create: mockEmbeddingsCreate }
  },
}))

import { generateEmbedding, generateEmbeddings } from '@/lib/embeddings'

const MOCK_VECTOR = Array.from({ length: 1536 }, (_, i) => i * 0.001)

describe('generateEmbedding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'sk-test'
    mockEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: MOCK_VECTOR }],
    })
  })

  it('returns 1536-dim vector', async () => {
    const result = await generateEmbedding('test text')
    expect(result).toHaveLength(1536)
  })

  it('calls OpenAI with correct model and input', async () => {
    await generateEmbedding('hello world')
    expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'hello world',
    })
  })

  it('returns numbers', async () => {
    const result = await generateEmbedding('test')
    result.forEach((v) => expect(typeof v).toBe('number'))
  })
})

describe('generateEmbeddings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'sk-test'
    mockEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: MOCK_VECTOR }, { embedding: MOCK_VECTOR }],
    })
  })

  it('returns one vector per input', async () => {
    const results = await generateEmbeddings(['chunk one', 'chunk two'])
    expect(results).toHaveLength(2)
    results.forEach((v) => expect(v).toHaveLength(1536))
  })

  it('batches all inputs in a single API call', async () => {
    await generateEmbeddings(['a', 'b'])
    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(1)
    expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: ['a', 'b'],
    })
  })

  it('returns empty array for empty input', async () => {
    mockEmbeddingsCreate.mockResolvedValue({ data: [] })
    const results = await generateEmbeddings([])
    expect(results).toEqual([])
  })
})
