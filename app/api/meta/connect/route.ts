import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '@/convex/_generated/api'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let code: string
  try {
    ;({ code } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.SITE_URL ?? 'http://localhost:3000'

  // 1. Exchange code for short-lived user access token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v25.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        code,
        redirect_uri: `${siteUrl}/api/meta/connect`,
      })
  )
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    return NextResponse.json({ error: 'Token exchange failed', detail: tokenData }, { status: 400 })
  }

  // 2. Exchange for long-lived token (60-day expiry)
  const longLivedRes = await fetch(
    `https://graph.facebook.com/v25.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: tokenData.access_token,
      })
  )
  const longLivedData = await longLivedRes.json()
  if (!longLivedData.access_token) {
    return NextResponse.json({ error: 'Long-lived token exchange failed', detail: longLivedData }, { status: 400 })
  }
  const longLivedToken: string = longLivedData.access_token

  // 3. Get WABA ID
  const wabaRes = await fetch(
    `https://graph.facebook.com/v25.0/me/businesses?access_token=${longLivedToken}`
  )
  const wabaData = await wabaRes.json()
  const wabaId: string = wabaData.data?.[0]?.id
  if (!wabaId) {
    return NextResponse.json({ error: 'No WABA found', detail: wabaData }, { status: 400 })
  }

  // 4. Get phone number details
  const phoneRes = await fetch(
    `https://graph.facebook.com/v25.0/${wabaId}/phone_numbers?access_token=${longLivedToken}`
  )
  const phoneData = await phoneRes.json()
  const phone = phoneData.data?.[0]
  if (!phone) {
    return NextResponse.json({ error: 'No phone number found', detail: phoneData }, { status: 400 })
  }
  const phoneNumberId: string = phone.id
  const displayPhone: string = phone.display_phone_number

  // 5. Subscribe webhook for this phone number
  await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/subscribe_app`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}` },
  })

  // 6. Store credentials on the agent record
  const token = await convexAuthNextjsToken()
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  if (token) convex.setAuth(token)

  await convex.mutation(api.agents.setMetaCredentials, {
    metaAccessToken: longLivedToken,
    metaPhoneNumberId: phoneNumberId,
    metaWabaId: wabaId,
    whatsappNumber: displayPhone,
  })

  return NextResponse.json({ ok: true })
}
