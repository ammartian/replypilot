import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock OpenAI embeddings so tests don't hit the API
const mockEmbeddingsCreate = vi.hoisted(() => vi.fn())
vi.mock('openai', () => ({
  default: class {
    embeddings = { create: mockEmbeddingsCreate }
  },
}))

import { chunkText } from '@/lib/chunker'
import { generateEmbeddings } from '@/lib/embeddings'

const MOCK_VECTOR = Array.from({ length: 1536 }, () => 0.1)

// processTextListing is a Convex action and can't be called directly in unit tests.
// These tests verify the two pure functions it depends on behave correctly for
// the listing text use case — chunking and embedding are the core of the flow.

describe('listing text processing pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'sk-test'
  })

  it('chunks a short listing into a single chunk', () => {
    const content = 'Residensi Parklane, KLCC. Price: RM 650,000. 2 bed 2 bath. Freehold.'
    const chunks = chunkText(content, 800)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toContain('Residensi Parklane')
  })

  it('chunks multiple listings separated by --- into multiple chunks', () => {
    const listing = 'Condo in KL, RM 600k, 2 bed. Freehold. Near LRT. Infinity pool, gym. Ready to move in. '
    // Repeat enough to force multiple chunks
    const content = Array.from({ length: 20 }, (_, i) => `${listing}Unit ${i}`).join('\n---\n')
    const chunks = chunkText(content, 800)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((c) => expect(c.trim().length).toBeGreaterThan(0))
  })

  it('generates one embedding vector per chunk', async () => {
    const chunks = ['Listing A details.', 'Listing B details.']
    mockEmbeddingsCreate.mockResolvedValue({
      data: chunks.map(() => ({ embedding: MOCK_VECTOR })),
    })
    const embeddings = await generateEmbeddings(chunks)
    expect(embeddings).toHaveLength(chunks.length)
    embeddings.forEach((v) => expect(v).toHaveLength(1536))
  })

  it('empty content produces no chunks and no embeddings', async () => {
    const chunks = chunkText('', 800)
    expect(chunks).toHaveLength(0)

    mockEmbeddingsCreate.mockResolvedValue({ data: [] })
    const embeddings = await generateEmbeddings(chunks)
    expect(embeddings).toHaveLength(0)
    expect(mockEmbeddingsCreate).not.toHaveBeenCalled()
  })

  it('whitespace-only content produces no chunks', () => {
    const chunks = chunkText('   \n\n   ', 800)
    expect(chunks).toHaveLength(0)
  })

  it('preserves key property details within a chunk', () => {
    const content =
      'Setia Alam, Shah Alam. Price: RM 750,000. Size: 1,800 sqft. 4 bed 3 bath. ' +
      'Double-storey terrace. Freehold. Gated & guarded. Near Setia City Mall.'
    const chunks = chunkText(content, 800)
    // All details should fit in one chunk at 800 char limit
    expect(chunks[0]).toContain('RM 750,000')
    expect(chunks[0]).toContain('1,800 sqft')
    expect(chunks[0]).toContain('Freehold')
  })
})
