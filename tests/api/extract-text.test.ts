import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/listings/extract-text/route'

// ── pdf2json mock ─────────────────────────────────────────────────────────────
// Must use a class (not vi.fn()) so `new PDFParser()` works correctly
const mockPdfOn = vi.hoisted(() => vi.fn())
const mockPdfParseBuffer = vi.hoisted(() => vi.fn())

vi.mock('pdf2json', () => ({
  default: class {
    on = mockPdfOn
    parseBuffer = mockPdfParseBuffer
  },
}))

// ── mammoth mock ──────────────────────────────────────────────────────────────
const mockMammothExtract = vi.hoisted(() => vi.fn())

vi.mock('mammoth', () => ({
  default: { extractRawText: mockMammothExtract },
}))

// ── fetch mock ────────────────────────────────────────────────────────────────
const mockFetch = vi.hoisted(() => vi.fn())

// ── helpers ───────────────────────────────────────────────────────────────────
function makeJsonRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/listings/extract-text', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Configures the pdf2json class mock so parseBuffer triggers pdfParser_dataReady
function setupPdfParser(pages: object[]) {
  const handlers: Record<string, (...args: unknown[]) => void> = {}
  mockPdfOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
    handlers[event] = handler
  })
  mockPdfParseBuffer.mockImplementation(() => {
    handlers['pdfParser_dataReady']?.({ Pages: pages })
  })
}

// Returns a mock fetch response that yields `blob` when .blob() is called
function mockFileResponse(content: string, type: string) {
  const blob = new Blob([content], { type })
  return { ok: true, blob: () => Promise.resolve(blob) }
}

// ── setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

// ── multipart: missing file ───────────────────────────────────────────────────
describe('POST /api/listings/extract-text — multipart', () => {
  it('returns 400 when no file field in form', async () => {
    const formData = new FormData()
    const req = new NextRequest('http://localhost/api/listings/extract-text', {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/missing file/i)
  })
})

// ── JSON fileUrl: validation ──────────────────────────────────────────────────
describe('POST /api/listings/extract-text — JSON fileUrl validation', () => {
  it('returns 400 when fileUrl is missing', async () => {
    const res = await POST(makeJsonRequest({ fileType: 'text/plain' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when fileType is missing', async () => {
    const res = await POST(makeJsonRequest({ fileUrl: 'https://example.com/file.txt' }))
    expect(res.status).toBe(400)
  })

  it('returns 502 when remote fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 })
    const res = await POST(makeJsonRequest({ fileUrl: 'https://example.com/file.txt', fileType: 'text/plain' }))
    expect(res.status).toBe(502)
  })
})

// ── JSON fileUrl: extraction ──────────────────────────────────────────────────
describe('POST /api/listings/extract-text — extraction via fileUrl', () => {
  it('returns raw text for plain text file', async () => {
    mockFetch.mockResolvedValue(mockFileResponse('Hello plain text', 'text/plain'))
    const res = await POST(makeJsonRequest({ fileUrl: 'https://example.com/notes.txt', fileType: 'text/plain' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe('Hello plain text')
    expect(body.warning).toBeUndefined()
  })

  it('extracts text from PDF', async () => {
    setupPdfParser([{ Texts: [{ R: [{ T: encodeURIComponent('PDF content here') }] }] }])
    mockFetch.mockResolvedValue(mockFileResponse('%PDF-fake', 'application/pdf'))
    const res = await POST(makeJsonRequest({ fileUrl: 'https://example.com/doc.pdf', fileType: 'application/pdf' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toContain('PDF content here')
    expect(body.warning).toBeUndefined()
  })

  it('returns warning when PDF has no text (image-only)', async () => {
    setupPdfParser([])
    mockFetch.mockResolvedValue(mockFileResponse('%PDF-fake', 'application/pdf'))
    const res = await POST(makeJsonRequest({ fileUrl: 'https://example.com/scanned.pdf', fileType: 'application/pdf' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe('')
    expect(body.warning).toMatch(/no text found/i)
  })

  it('returns warning when PDF parsing times out', async () => {
    vi.useFakeTimers()

    // parseBuffer never fires the event → parse promise stays pending
    const handlers: Record<string, (...args: unknown[]) => void> = {}
    mockPdfOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler
    })
    mockPdfParseBuffer.mockImplementation(() => {}) // intentionally silent

    mockFetch.mockResolvedValue(mockFileResponse('%PDF-fake', 'application/pdf'))
    const postPromise = POST(makeJsonRequest({ fileUrl: 'https://example.com/scanned.pdf', fileType: 'application/pdf' }))

    await vi.advanceTimersByTimeAsync(46_000)
    const res = await postPromise

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe('')
    expect(body.warning).toMatch(/timed out/i)
  })

  it('extracts text from Word (.docx)', async () => {
    mockMammothExtract.mockResolvedValue({ value: 'Word document content' })
    mockFetch.mockResolvedValue(
      mockFileResponse('fake-docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    )
    const res = await POST(
      makeJsonRequest({
        fileUrl: 'https://example.com/report.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe('Word document content')
  })
})

// ── error path ────────────────────────────────────────────────────────────────
describe('POST /api/listings/extract-text — error handling', () => {
  it('returns 500 on unexpected extraction error', async () => {
    mockMammothExtract.mockRejectedValue(new Error('mammoth exploded'))
    mockFetch.mockResolvedValue(
      mockFileResponse('fake', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    )
    const res = await POST(
      makeJsonRequest({
        fileUrl: 'https://example.com/doc.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
    )
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/mammoth exploded/)
  })
})
