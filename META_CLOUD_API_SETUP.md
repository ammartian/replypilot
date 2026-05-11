# Meta WhatsApp Cloud API — Setup Guide for ReplyPilot

**Goal:** Replace 360dialog with Meta's Cloud API directly.  
**Result:** $0 platform fee. Pay only for conversations (service conversations free up to 1,000/month per WABA).  
**Docs source:** [developers.facebook.com/documentation/business-messaging/whatsapp/overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/overview)  
**API version:** v25.0 (released Feb 18, 2026 — current as of May 2026)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create Meta Developer Account & App](#2-create-meta-developer-account--app)
3. [Add WhatsApp Product to App](#3-add-whatsapp-product-to-app)
4. [Meta Business Verification](#4-meta-business-verification)
5. [Request Advanced Access Permissions](#5-request-advanced-access-permissions)
6. [Create System User & Permanent Access Token](#6-create-system-user--permanent-access-token)
7. [Set Up Webhook](#7-set-up-webhook)
8. [Test with Your Own Number (Dev Mode)](#8-test-with-your-own-number-dev-mode)
9. [Embedded Signup — Automated Multi-User Onboarding](#9-embedded-signup--automated-multi-user-onboarding)
10. [ReplyPilot Code Changes](#10-replypilot-code-changes)
11. [Pricing Summary](#11-pricing-summary)

---

## 1. Prerequisites

- A **Facebook account** (personal is fine for dev)
- A **Meta Business Portfolio** (formerly Business Manager) — create at [business.facebook.com](https://business.facebook.com)
- A **business legal name + website** for Meta Business Verification
- Your **ReplyPilot production URL** (Vercel) — needed for webhook endpoint

---

## 2. Create Meta Developer Account & App

### 2a. Register as a Developer

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **Get Started** → log in with your Facebook account
3. Complete developer registration (accept policies, verify phone)

### 2b. Create a New App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click **Create App**
3. Under **Use Cases**, select **"Other"** → click Next
4. Under **App Type**, select **"Business"** → click Next
5. Fill in:
   - **App Name**: `ReplyPilot`
   - **Contact Email**: your email
   - **Business Portfolio**: select your Meta Business Portfolio (or create one)
6. Click **Create App**

> App is now in **Development mode** — only you and app admins can use it.

---

## 3. Add WhatsApp Product to App

1. In your app dashboard, scroll to **"Add products to your app"**
2. Find **WhatsApp** → click **Set Up**
3. You'll land on the **WhatsApp > Quickstart** page
4. Meta automatically creates a **test WhatsApp Business Account (WABA)** and a **test phone number** for you
5. Note down:
   - **Phone Number ID** (e.g. `123456789012345`) — used in API calls
   - **WhatsApp Business Account ID (WABA ID)**
   - **Temporary Access Token** (expires in 24h — for testing only)

---

## 4. Meta Business Verification

This is required before you can go live or use Embedded Signup with other users.

### 4a. Start Verification

1. Go to [business.facebook.com/settings](https://business.facebook.com/settings)
2. Left sidebar → **Security Center**
3. Under **Business Verification**, click **Start Verification**

### 4b. Submit Documents

Meta accepts:
- Business registration certificate
- Tax registration document
- Utility bill in company name

**Process:**
1. Select your country
2. Search for your business by name (they check Meta's business database)
3. If not found, enter manually: business name, address, phone, website
4. Upload one of the accepted documents
5. Submit

### 4c. Approval Timeline

- **Typical:** 2–5 business days
- **Faster if:** Your business has a Wikipedia page, appears on Google Maps, or is registered in a well-indexed database
- You'll get an email notification when approved

> You can continue Steps 5–8 in parallel — testing works without verification. Verification is only required for going live with external users and Embedded Signup.

---

## 5. Request Advanced Access Permissions

Standard (development) access limits you to messaging only test numbers. Advanced Access removes this.

### 5a. Required Permissions

| Permission | Purpose |
|---|---|
| `whatsapp_business_messaging` | Send/receive messages |
| `whatsapp_business_management` | Manage WABAs, phone numbers (needed for Embedded Signup) |

### 5b. How to Request

1. App Dashboard → **App Review** → **Permissions and Features**
2. Search for `whatsapp_business_messaging` → click **Request Advanced Access**
3. Search for `whatsapp_business_management` → click **Request Advanced Access**
4. For each, fill in:
   - How your app uses this permission
   - Screencast or screenshots showing the feature
   - Test user credentials (optional)
5. Submit

### 5c. Approval Timeline

- Usually **1–7 business days**
- Meta may ask follow-up questions via email
- Business Verification must be approved first

---

## 6. Create System User & Permanent Access Token

The temporary access token on the Quickstart page expires in 24h. You need a **permanent token** for production.

### 6a. Create System User

1. Go to [business.facebook.com/settings](https://business.facebook.com/settings)
2. Left sidebar → **Users** → **System Users**
3. Click **Add** → name it `replypilot-system-user` → role: **Admin**
4. Click **Create System User**

### 6b. Assign Assets

1. Click the system user → **Assign Assets**
2. Select **Apps** → select your `ReplyPilot` app → give **Full Control**
3. Select **WhatsApp Accounts** → select your WABA → give **Full Control**

### 6c. Generate Permanent Token

1. Click **Generate New Token** on the system user
2. Select your `ReplyPilot` app
3. Check both permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Click **Generate Token**
5. **Copy and save the token immediately** — it will not be shown again

Store this in your environment:
```
META_SYSTEM_USER_TOKEN=your_token_here
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
```

> This is YOUR app's system token — used for your own test number and for making API calls. Each onboarded user will have their own token (handled via Embedded Signup in Step 9).

---

## 7. Set Up Webhook

Meta sends all incoming messages to a single webhook URL on your app. Messages are routed per-user via `phone_number_id` in the payload.

### 7a. Create the Webhook Endpoint

Your webhook must:
1. Handle `GET` requests to verify the endpoint (one-time setup)
2. Handle `POST` requests for incoming messages

Verification flow — Meta sends:
```
GET /api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_STRING
```
Your endpoint must return the `hub.challenge` value as plain text.

### 7b. Register Webhook in Meta Dashboard

1. App Dashboard → **WhatsApp** → **Configuration**
2. Under **Webhook**, click **Edit**
3. Fill in:
   - **Callback URL**: `https://your-app.vercel.app/api/webhook/whatsapp`
   - **Verify Token**: any string you choose (e.g. `replypilot_webhook_2024`) — store as `META_WEBHOOK_VERIFY_TOKEN` in env
4. Click **Verify and Save**
5. After verification succeeds, under **Webhook Fields**, click **Manage**
6. Subscribe to: **`messages`**

### 7c. Incoming Webhook Payload (text message)

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "+60123456789",
          "phone_number_id": "123456789012345"
        },
        "contacts": [{ "profile": { "name": "Buyer Name" }, "wa_id": "60123456789" }],
        "messages": [{
          "from": "60123456789",
          "id": "wamid.xxx",
          "timestamp": "1234567890",
          "type": "text",
          "text": { "body": "Hello, is the condo still available?" }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

Route by `metadata.phone_number_id` → look up agent in DB.

---

## 8. Test with Your Own Number (Dev Mode)

Before going live, test end-to-end using Meta's test number.

1. App Dashboard → **WhatsApp** → **API Setup**
2. Under **Send and receive messages**:
   - **From**: select the test phone number Meta gave you
   - **To**: enter your personal WhatsApp number (must be added as a test recipient first)
3. Click **Send Message** to verify delivery

### Test Send via API

```bash
curl -X POST \
  "https://graph.facebook.com/v25.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_TEMP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "60XXXXXXXXX",
    "type": "text",
    "text": { "body": "Test from ReplyPilot" }
  }'
```

---

## 9. Embedded Signup — Automated Multi-User Onboarding

This is the key to onboarding multiple agents without manual setup. Each agent connects their WhatsApp Business Account to ReplyPilot through a Facebook Login popup.

### 9a. Prerequisites for Embedded Signup

- Meta Business Verification approved (Step 4)
- Advanced Access for `whatsapp_business_management` approved (Step 5)
- Your app must be in **Live mode** (toggle in App Dashboard top bar)

### 9b. How the Flow Works

```
Agent clicks "Connect WhatsApp" in ReplyPilot
         ↓
Facebook Login popup opens (Meta's embedded signup)
Agent logs in with Facebook, selects/creates their WABA,
registers their phone number, verifies via OTP
         ↓
Popup closes, sends callback to your page with:
  - code (short-lived auth code)
         ↓
Your server exchanges code for a User Access Token
  POST https://graph.facebook.com/v25.0/oauth/access_token
         ↓
Exchange User Access Token for long-lived token (60 days)
         ↓
Get phone_number_id and waba_id from the token
  GET https://graph.facebook.com/v25.0/debug_token
         ↓
Store on agent record:
  - metaAccessToken
  - metaPhoneNumberId
  - metaWabaId
         ↓
Subscribe webhook for this phone number
  POST https://graph.facebook.com/v25.0/{phone_number_id}/subscribe_app
         ↓
Agent is live — incoming messages route to them automatically
```

### 9c. Add Embedded Signup to Onboarding Page

Install the Facebook JS SDK and open the signup flow:

```tsx
// app/(app)/onboarding/page.tsx — add "Connect WhatsApp" button

useEffect(() => {
  // Load Facebook JS SDK
  window.fbAsyncInit = function () {
    FB.init({
      appId: process.env.NEXT_PUBLIC_META_APP_ID!,
      autoLogAppEvents: true,
      xfbml: true,
      version: 'v25.0',
    })
  }
  const script = document.createElement('script')
  script.src = 'https://connect.facebook.net/en_US/sdk.js'
  document.body.appendChild(script)
}, [])

function launchWhatsAppSignup() {
  FB.login(
    function (response) {
      if (response.authResponse?.code) {
        // Send code to your backend to exchange for token
        fetch('/api/meta/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: response.authResponse.code }),
        })
      }
    },
    {
      config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID, // from Meta app dashboard
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: '',
        sessionInfoVersion: '3',
      },
    }
  )
}
```

> `META_CONFIG_ID` — create this in App Dashboard → **WhatsApp** → **Embedded Signup** → **Create Configuration**. Set allowed domains to your production URL.

### 9d. Backend: Exchange Code for Token

```ts
// app/api/meta/connect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  // 1. Exchange code for user access token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v25.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/connect`,
      })
  )
  const { access_token } = await tokenRes.json()

  // 2. Exchange for long-lived token (60-day expiry)
  const longLivedRes = await fetch(
    `https://graph.facebook.com/v25.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        fb_exchange_token: access_token,
      })
  )
  const { access_token: longLivedToken } = await longLivedRes.json()

  // 3. Get WABA ID and phone number details
  const wabaRes = await fetch(
    `https://graph.facebook.com/v25.0/me/businesses?access_token=${longLivedToken}`
  )
  const wabaData = await wabaRes.json()
  const wabaId = wabaData.data[0]?.id

  const phoneRes = await fetch(
    `https://graph.facebook.com/v25.0/${wabaId}/phone_numbers?access_token=${longLivedToken}`
  )
  const phoneData = await phoneRes.json()
  const phone = phoneData.data[0]
  const phoneNumberId = phone?.id
  const displayPhone = phone?.display_phone_number

  // 4. Subscribe webhook for this phone number
  await fetch(
    `https://graph.facebook.com/v25.0/${phoneNumberId}/subscribe_app`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}` },
    }
  )

  // 5. Store on agent record in Convex
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  // Note: pass auth cookie/token for the logged-in user here
  await convex.mutation(api.agents.setMetaCredentials, {
    metaAccessToken: longLivedToken,
    metaPhoneNumberId: phoneNumberId,
    metaWabaId: wabaId,
    whatsappNumber: displayPhone,
  })

  return NextResponse.json({ ok: true })
}
```

### 9e. Token Refresh (important)

Long-lived tokens expire after 60 days. Two options:
- **Option A:** Re-prompt the user to reconnect every 60 days (simplest for pilot)
- **Option B:** Generate a **System User Token** on behalf of the user's WABA using the Business Management API — these don't expire

For the pilot, Option A is fine. Add a `metaTokenExpiresAt` field to the agent and show a banner when it's within 7 days of expiry.

---

## 10. ReplyPilot Code Changes

### 10a. Schema

```ts
// convex/schema.ts — add to agents table:
metaPhoneNumberId: v.optional(v.string()),
metaWabaId: v.optional(v.string()),
metaAccessToken: v.optional(v.string()),
metaTokenExpiresAt: v.optional(v.number()), // Unix timestamp
```

### 10b. New Mutation

```ts
// convex/agents.ts
export const setMetaCredentials = mutation({
  args: {
    metaAccessToken: v.string(),
    metaPhoneNumberId: v.string(),
    metaWabaId: v.string(),
    whatsappNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const agent = await ctx.db
      .query('agents')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()
    if (!agent) throw new Error('Agent not found')

    const sixtyDays = Date.now() + 60 * 24 * 60 * 60 * 1000
    await ctx.db.patch(agent._id, {
      ...args,
      whatsappStatus: 'connected',
      metaTokenExpiresAt: sixtyDays,
    })
  },
})
```

Add index for routing:
```ts
// convex/schema.ts
.index('by_metaPhoneNumberId', ['metaPhoneNumberId'])
```

### 10c. New Agent Query

```ts
// convex/agents.ts
export const getAgentByPhoneNumberId = query({
  args: { phoneNumberId: v.string() },
  handler: async (ctx, { phoneNumberId }) => {
    return ctx.db
      .query('agents')
      .withIndex('by_metaPhoneNumberId', (q) => q.eq('metaPhoneNumberId', phoneNumberId))
      .first()
  },
})
```

### 10d. Updated `sendWhatsAppMessage`

```ts
// lib/whatsapp.ts
export async function sendWhatsAppMessage({
  to,
  text,
  phoneNumberId,
  accessToken,
}: {
  to: string
  text: string
  phoneNumberId: string
  accessToken: string
}): Promise<void> {
  await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
}
```

### 10e. Updated Webhook Handler

```ts
// app/api/webhook/whatsapp/route.ts

// GET — webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// POST — incoming messages
// Route agent by phone_number_id instead of display_phone_number:
const phoneNumberId = change.value.metadata.phone_number_id
const agent = await convex.query(api.agents.getAgentByPhoneNumberId, { phoneNumberId })

// Pass agent credentials when sending:
await sendWhatsAppMessage({
  to: buyerPhone,
  text: result.reply,
  phoneNumberId: agent.metaPhoneNumberId!,
  accessToken: agent.metaAccessToken!,
})
```

### 10f. New Environment Variables

```bash
# .env.local
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_SYSTEM_USER_TOKEN=your_permanent_system_user_token
META_WEBHOOK_VERIFY_TOKEN=replypilot_webhook_2024   # any string you choose
NEXT_PUBLIC_META_APP_ID=your_app_id                 # same as META_APP_ID (public)
NEXT_PUBLIC_META_CONFIG_ID=your_embedded_signup_config_id
```

### 10g. Remove

```bash
# Delete from .env.local:
DIALOG360_API_KEY=...
DIALOG360_BASE_URL=...
```

---

## 11. Pricing Summary

| Item | Cost |
|---|---|
| Meta Cloud API access | **$0** |
| Service conversations (user-initiated) | **Free** — first 1,000/month per WABA |
| Service conversations over 1,000 | ~$0.005–0.015 per conversation (varies by country) |
| Marketing messages | ~$0.025–0.085 per conversation |
| Embedded Signup | **$0** |
| Tech Provider program | **$0** |

**For 3 pilot agents, all inbound conversations (buyers message first):**  
= Service conversations = **free up to 1,000/month per agent**  
= Likely $0/month total until you scale significantly

> **Note:** Meta has introduced new pricing tiers since 2025, including authentication-international rates and an AI Providers tier. Verify current rates at [developers.facebook.com/docs/whatsapp/pricing](https://developers.facebook.com/docs/whatsapp/pricing) before going live.

---

## Timeline

| Step | Time |
|---|---|
| Create Meta developer account + app | 30 min |
| Add WhatsApp product, get test number | 15 min |
| Submit Meta Business Verification | 30 min (then wait 2–5 days) |
| Request Advanced Access permissions | 30 min (then wait 1–7 days) |
| Create System User + permanent token | 15 min |
| Set up webhook endpoint | 2–4 hours (code) |
| Build Embedded Signup UI + callback route | 1–2 days (code) |
| Update schema + mutations + send function | 2–4 hours (code) |
| **Total (excluding wait times)** | **~2–3 days of work** |
| **Total calendar time** | **~1–2 weeks** |

---

## Key Reference Links

- App dashboard: https://developers.facebook.com/apps
- Business settings: https://business.facebook.com/settings
- WhatsApp Business Platform docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/overview
- Cloud API docs: https://developers.facebook.com/docs/whatsapp/cloud-api
- Embedded Signup docs: https://developers.facebook.com/docs/whatsapp/embedded-signup
- Graph API changelog: https://developers.facebook.com/docs/graph-api/changelog
- API version: **v25.0** (latest as of May 2026)
- Graph API base URL: `https://graph.facebook.com/v25.0`

---

## API Version History

| Version | Released | Notes |
|---|---|---|
| **v25.0** | Feb 18, 2026 | **Current — use this** |
| v24.0 | Oct 8, 2025 | |
| v23.0 | May 29, 2025 | |
| v22.0 | Jan 21, 2025 | Do not use in new code |
| v20.0 | May 21, 2024 | Ends support Sept 24, 2026 |

> Meta deprecates Graph API versions roughly every 2 years. Always use the latest version for new code. Check [the changelog](https://developers.facebook.com/docs/graph-api/changelog) when upgrading.

---

## Platform Features Reference (v25.0)

### Message Types

| Category | Types |
|---|---|
| Basic | Text, Image, Audio, Video, Document, Sticker, Reaction, Location, Contacts |
| Interactive | Reply buttons, List buttons, URL buttons, Media carousel |
| Templates | Marketing, Utility, Authentication (one-tap, zero-tap, copy-code), Coupon code, Limited-time offer |
| Calls | Business-initiated calls, User-initiated calls (requires SIP integration) |

### Template Categories (billing impacts)
- **Marketing** — promotional content, ~$0.025–0.085/conversation
- **Utility** — transactional alerts (order updates, etc.)
- **Authentication** — OTP/login codes; "authentication-international" rates apply outside certain regions
- **Service** — replies to user-initiated messages; free up to 1,000/month per WABA

### New Since v22.0
- **Groups** — send/receive messages in WhatsApp groups (business-initiated)
- **Calling** — voice call support (requires additional permissions and SIP setup)
- **Media carousel templates** — horizontally scrollable card templates
- **Coupon code templates** — built-in copy-to-clipboard coupon UX
- **Limited-time offer templates** — countdown timer in template
- **Conversion measurement** — track downstream conversions from WhatsApp messages
- **Click event tracking** — track link clicks within messages
- **AI Providers pricing tier** — separate pricing for AI-driven messaging at scale

> ReplyPilot currently uses: text messages + service conversation routing. Groups and Calling are out of scope for the pilot.
