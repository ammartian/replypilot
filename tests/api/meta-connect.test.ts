import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/meta/connect/route'

// ── convex mocks ──────────────────────────────────────────────────────────────
const mockMutation = vi.hoisted(() => vi.fn())
const mockSetAuth = vi.hoisted(() => vi.fn())
const mockConvexAuthToken = vi.hoisted(() => vi.fn())

vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    mutation = mockMutation
    setAuth = mockSetAuth
  },
}))

vi.mock('@convex-dev/auth/nextjs/server', () => ({
  convexAuthNextjsToken: mockConvexAuthToken,
}))

// ── fetch mock ────────────────────────────────────────────────────────────────
const mockFetch = vi.hoisted(() => vi.fn())

// ── helpers ───────────────────────────────────────────────────────────────────
function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/meta/connect', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeBadJsonRequest(): NextRequest {
  return new NextRequest('http://localhost/api/meta/connect', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'not-json{{{',
  })
}

// Mock fetch calls in order: short-lived token → long-lived token → WABA → phones → webhook subscription
function setupHappyFetch() {
  mockFetch
    .mockResolvedValueOnce({
      json: () => Promise.resolve({ access_token: 'short-lived-token' }),
    })
    .mockResolvedValueOnce({
      json: () => Promise.resolve({ access_token: 'long-lived-token', expires_in: 5_183_944 }),
    })
    .mockResolvedValueOnce({
      json: () => Promise.resolve({ data: [{ id: 'waba-123' }] }),
    })
    .mockResolvedValueOnce({
      json: () => Promise.resolve({ data: [{ id: 'phone-123', display_phone_number: '+601111111111' }] }),
    })
    .mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })
}

// ── beforeEach ────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', mockFetch)

  process.env.META_APP_ID = 'test-app-id'
  process.env.META_APP_SECRET = 'test-app-secret'
  process.env.META_SYSTEM_USER_TOKEN = 'test-system-token'
  process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test.convex.cloud'

  mockConvexAuthToken.mockResolvedValue('convex-auth-token')
  mockMutation.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── validation ────────────────────────────────────────────────────────────────
describe('POST /api/meta/connect — validation', () => {
  it('returns 400 for invalid JSON body', async () => {
    const res = await POST(makeBadJsonRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid json/i)
  })

  it('returns 400 when code is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/missing code/i)
  })
})

// ── OAuth step failures ───────────────────────────────────────────────────────
describe('POST /api/meta/connect — OAuth step failures', () => {
  it('returns 400 when short-lived token exchange fails', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ error: 'bad code' }) })
    const res = await POST(makeRequest({ code: 'bad-code' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/token exchange failed/i)
  })

  it('returns 400 when long-lived token exchange fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ access_token: 'short-lived' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ error: 'exchange failed' }) })
    const res = await POST(makeRequest({ code: 'valid-code' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/long-lived token/i)
  })

  it('returns 400 when no WABA found', async () => {
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ access_token: 'short-lived' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ access_token: 'long-lived' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ data: [] }) })
    const res = await POST(makeRequest({ code: 'valid-code' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/no waba/i)
  })

  it('returns 400 when no phone number found', async () => {
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ access_token: 'short-lived' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ access_token: 'long-lived' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ data: [{ id: 'waba-123' }] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ data: [] }) })
    const res = await POST(makeRequest({ code: 'valid-code' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/no phone number/i)
  })
})

// ── happy path ────────────────────────────────────────────────────────────────
describe('POST /api/meta/connect — happy path', () => {
  it('returns 200 ok', async () => {
    setupHappyFetch()
    const res = await POST(makeRequest({ code: 'valid-code' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('calls setMetaCredentials mutation with correct credentials', async () => {
    setupHappyFetch()
    await POST(makeRequest({ code: 'valid-code' }))
    expect(mockMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metaAccessToken: 'long-lived-token',
        metaPhoneNumberId: 'phone-123',
        metaWabaId: 'waba-123',
        whatsappNumber: '+601111111111',
      })
    )
  })

  it('authenticates Convex client with auth token', async () => {
    setupHappyFetch()
    await POST(makeRequest({ code: 'valid-code' }))
    expect(mockSetAuth).toHaveBeenCalledWith('convex-auth-token')
  })

  it('makes 5 fetch calls to Graph API', async () => {
    setupHappyFetch()
    await POST(makeRequest({ code: 'valid-code' }))
    expect(mockFetch).toHaveBeenCalledTimes(5)
  })

  it('short-lived token exchange uses correct redirect_uri', async () => {
    setupHappyFetch()
    process.env.SITE_URL = 'https://myapp.com'
    await POST(makeRequest({ code: 'valid-code' }))
    const firstUrl: string = mockFetch.mock.calls[0][0]
    expect(firstUrl).toContain('redirect_uri=')
    expect(firstUrl).toContain('myapp.com')
  })
})
