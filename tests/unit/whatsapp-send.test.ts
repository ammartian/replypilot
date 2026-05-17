import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

describe('sendWhatsAppMessage', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends POST to correct Graph API URL', async () => {
    await sendWhatsAppMessage({ to: '60123456789', text: 'Hello', phoneNumberId: 'PHONE_ID', accessToken: 'TOKEN' })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/PHONE_ID/messages',
      expect.any(Object)
    )
  })

  it('sets Authorization Bearer header', async () => {
    await sendWhatsAppMessage({ to: '60123456789', text: 'Hello', phoneNumberId: 'PHONE_ID', accessToken: 'my-token' })
    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer my-token')
  })

  it('sets Content-Type application/json header', async () => {
    await sendWhatsAppMessage({ to: '60123456789', text: 'Hello', phoneNumberId: 'PHONE_ID', accessToken: 'TOKEN' })
    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('body includes to, type text, and message text', async () => {
    await sendWhatsAppMessage({ to: '60123456789', text: 'Hello World', phoneNumberId: 'PHONE_ID', accessToken: 'TOKEN' })
    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.to).toBe('60123456789')
    expect(body.type).toBe('text')
    expect(body.text.body).toBe('Hello World')
    expect(body.messaging_product).toBe('whatsapp')
  })

  it('does not throw on non-2xx response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400 })
    await expect(
      sendWhatsAppMessage({ to: '60123456789', text: 'Hello', phoneNumberId: 'PHONE_ID', accessToken: 'TOKEN' })
    ).resolves.toBeUndefined()
  })
})
