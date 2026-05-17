# WhatsApp Embedded Signup — Implementation Guide

**API version:** v25.0  
**Status as of May 2026:** Backend route, schema, and frontend all implemented. Outstanding: Meta dashboard config and app Live mode.

---

## What Embedded Signup Does

Lets any agent connect their own WhatsApp Business Account (WABA) to ReplyPilot without you touching the Meta dashboard. Agent clicks a button → Facebook popup → OTP → done. You get their `phone_number_id`, `waba_id`, and a 60-day access token stored on their agent record.

---

## Current Implementation Status

| Component | File | Status |
|---|---|---|
| DB schema fields | `convex/schema.ts:22–25,30` | ✅ Done |
| `setMetaCredentials` mutation | `convex/agents.ts:170` | ✅ Done |
| `getAgentByPhoneNumberId` query | `convex/agents.ts:195` | ✅ Done |
| Backend token exchange route | `app/api/meta/connect/route.ts` | ✅ Done |
| Frontend FB SDK + `launchWhatsAppSignup` | `app/(app)/onboarding/page.tsx:49–100` | ✅ Done |
| Token expiry warning banner | — | ❌ Not built |
| Reconnect / disconnect flow | — | ❌ Not built |
| Meta App: Business Verification | Meta dashboard | ⏳ Needs doing |
| Meta App: Advanced Access | Meta dashboard | ⏳ Needs doing |
| Meta App: Config ID created | Meta dashboard | ⏳ Needs doing |
| Meta App: Live mode toggled | Meta dashboard | ⏳ Needs doing |
| Env vars set in Vercel | Vercel dashboard | ⏳ Needs doing |

---

## Part 1 — Meta Dashboard Steps (Manual, One-Time)

### 1.1 Business Verification

Required before Embedded Signup works for external users.

1. Go to [business.facebook.com/settings](https://business.facebook.com/settings)
2. Left sidebar → **Security Center** → **Business Verification** → **Start Verification**
3. Upload one of: business registration cert, tax doc, or utility bill in company name
4. Wait 2–5 business days for approval

> Cannot skip. Embedded Signup popup will error with `permission_denied` for non-verified businesses.

### 1.2 Request Advanced Access Permissions

1. App Dashboard → **App Review** → **Permissions and Features**
2. Search `whatsapp_business_messaging` → **Request Advanced Access**
3. Search `whatsapp_business_management` → **Request Advanced Access**
4. For each: describe how the app uses it, attach screenshots of the signup UI
5. Wait 1–7 business days

Without `whatsapp_business_management` Advanced Access, the token exchange returns a token that cannot read the user's WABA.

### 1.3 Create the Embedded Signup Configuration ID

This generates the `NEXT_PUBLIC_META_CONFIG_ID` value.

1. App Dashboard → **WhatsApp** → **Embedded Signup**  
   (If not visible: **Products** → **WhatsApp** → then look for **Embedded Signup** in left nav)
2. Click **Create Configuration**
3. Fill in:
   - **Configuration Name**: `ReplyPilot Production`
   - **Allowed Domains**: `https://your-app.vercel.app` (exact, no trailing slash)
   - **Permissions to request**: `whatsapp_business_messaging`, `whatsapp_business_management`
   - **Phone number**: allow user to register new number
4. Click **Save**
5. Copy the **Configuration ID** — looks like `1234567890123456`
6. Add to env: `NEXT_PUBLIC_META_CONFIG_ID=1234567890123456`

### 1.4 Toggle App to Live Mode

1. App Dashboard → top bar shows **Development** toggle
2. Switch to **Live**
3. Confirm the dialog

> In Development mode only app admins can complete the signup. External agents (your customers) are blocked.

### 1.5 Verify Webhook is Subscribed

1. App Dashboard → **WhatsApp** → **Configuration**
2. **Webhook** section → confirm URL shows your production URL
3. Under **Webhook Fields** → confirm `messages` is subscribed
4. If not: click **Manage** → enable `messages`

---

## Part 2 — Environment Variables

### Required (all must be set in Vercel + `.env.local`)

```bash
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_SYSTEM_USER_TOKEN=your_permanent_system_user_token   # non-expiring
META_WEBHOOK_VERIFY_TOKEN=replypilot_webhook_2024

NEXT_PUBLIC_META_APP_ID=your_app_id                      # same as META_APP_ID
NEXT_PUBLIC_META_CONFIG_ID=your_config_id                # from Step 1.3
```

### Where to Find Each Value

| Var | Location |
|---|---|
| `META_APP_ID` | App Dashboard → Settings → Basic → App ID |
| `META_APP_SECRET` | App Dashboard → Settings → Basic → App Secret (click Show) |
| `META_SYSTEM_USER_TOKEN` | business.facebook.com → System Users → your user → Generate Token |
| `NEXT_PUBLIC_META_CONFIG_ID` | WhatsApp → Embedded Signup → your config → Configuration ID |

---

## Part 3 — Full Flow Walkthrough

### What Happens When Agent Clicks "Connect WhatsApp Business"

```
onboarding/page.tsx:launchWhatsAppSignup()
  │
  ├─ FB.login() opens popup
  │    Agent: logs in with Facebook
  │    Agent: selects or creates WABA
  │    Agent: registers phone number
  │    Agent: receives + enters OTP
  │    Popup closes
  │
  ├─ callback fires with response.authResponse.code
  │
  └─ POST /api/meta/connect { code }
       │
       ├─ Exchange code → short-lived user access token
       │    POST /oauth/access_token?client_id&client_secret&code&redirect_uri
       │
       ├─ Exchange short-lived → long-lived token (60 days)
       │    POST /oauth/access_token?grant_type=fb_exchange_token
       │
       ├─ GET /me/businesses → wabaId
       │
       ├─ GET /{wabaId}/phone_numbers → phoneNumberId, displayPhone
       │
       ├─ POST /{phoneNumberId}/subscribe_app   ← uses META_SYSTEM_USER_TOKEN
       │    Registers webhook for this agent's number
       │
       └─ convex: setMetaCredentials mutation
            Stores: metaAccessToken, metaPhoneNumberId, metaWabaId
            Sets: whatsappStatus = 'connected'
            Sets: metaTokenExpiresAt = now + 60 days
```

### How Incoming Messages Route

```
Buyer sends WhatsApp → Meta → POST /api/webhook/whatsapp
  │
  ├─ Extract metadata.phone_number_id from payload
  │
  ├─ getAgentByPhoneNumberId(phoneNumberId)  ← O(1) via index
  │
  └─ sendWhatsAppMessage({
       to: buyerPhone,
       text: aiReply,
       phoneNumberId: agent.metaPhoneNumberId,
       accessToken: agent.metaAccessToken
     })
```

---

## Part 4 — Code Reference

### Schema (`convex/schema.ts`)

```ts
// agents table — relevant fields:
metaPhoneNumberId: v.optional(v.string()),
metaWabaId:        v.optional(v.string()),
metaAccessToken:   v.optional(v.string()),
metaTokenExpiresAt: v.optional(v.number()),  // Unix ms

// Index for O(1) webhook routing:
.index('by_metaPhoneNumberId', ['metaPhoneNumberId'])
```

### Backend Token Exchange (`app/api/meta/connect/route.ts`)

Full implementation already exists. Key steps:
1. Parse `code` from request body
2. Exchange code → `access_token` via `/oauth/access_token`
3. Exchange → long-lived token via `grant_type=fb_exchange_token`
4. `GET /me/businesses` → `wabaId`
5. `GET /{wabaId}/phone_numbers` → `phoneNumberId`
6. `POST /{phoneNumberId}/subscribe_app` with `META_SYSTEM_USER_TOKEN`
7. `convex.mutation(api.agents.setMetaCredentials, {...})`

### Frontend (`app/(app)/onboarding/page.tsx`)

```ts
// SDK load (step 2 only, once):
FB.init({ appId: NEXT_PUBLIC_META_APP_ID, version: 'v25.0', ... })

// Trigger signup:
FB.login(callback, {
  config_id: NEXT_PUBLIC_META_CONFIG_ID,
  response_type: 'code',           // must be 'code', not 'token'
  override_default_response_type: true,
  extras: { setup: {}, featureType: '', sessionInfoVersion: '3' }
})
```

---

## Part 5 — Token Expiry Handling

Tokens expire after **60 days**. Currently `metaTokenExpiresAt` is stored but no warning is shown.

### What Needs Building

**Warning banner** — show when token expires within 7 days:

```ts
// convex/agents.ts — add helper query
export const getTokenExpiryWarning = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const agent = await ctx.db
      .query('agents')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first()
    if (!agent?.metaTokenExpiresAt) return null
    const daysLeft = Math.floor((agent.metaTokenExpiresAt - Date.now()) / 86_400_000)
    return daysLeft <= 7 ? daysLeft : null
  }
})
```

Show in dashboard layout if `daysLeft !== null`:

```tsx
{daysLeft !== null && (
  <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800">
    WhatsApp token expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.{' '}
    <a href="/onboarding" className="underline font-medium">Reconnect now</a>
  </div>
)}
```

**Reconnect** — when token expires, `whatsappStatus` should auto-flip to `'pending'`. Add a Convex cron or check in the webhook handler: if `metaTokenExpiresAt < Date.now()`, set `whatsappStatus = 'pending'`.

---

## Part 6 — Testing the Flow

### Before Going Live (Dev Mode Testing)

Only app admins can test in dev mode. Add test users:

1. App Dashboard → **Roles** → **Test Users** → Add yourself + any co-founders
2. These users can complete the full signup popup in dev mode

### Local Testing

Facebook popup requires HTTPS. Use `ngrok` to test locally:

```bash
ngrok http 3000
# Update NEXT_PUBLIC_APP_URL and your allowed domains in Config ID to the ngrok URL
```

### Checklist

- [ ] Config ID created and `NEXT_PUBLIC_META_CONFIG_ID` set in env
- [ ] App in Live mode (or you're testing as an admin in dev mode)
- [ ] Business Verification approved
- [ ] Advanced Access for both permissions approved
- [ ] Webhook verified and subscribed to `messages`
- [ ] `META_SYSTEM_USER_TOKEN` is a non-expiring system user token (not a temp token)
- [ ] All env vars set in Vercel (not just `.env.local`)
- [ ] Click "Connect WhatsApp Business" → popup opens
- [ ] Complete OTP verification → popup closes
- [ ] Agent record shows `whatsappStatus: 'connected'` in Convex dashboard
- [ ] Send a WhatsApp message to the connected number → appears in ReplyPilot chat

---

## Part 7 — Common Errors

| Error | Cause | Fix |
|---|---|---|
| Popup doesn't open / immediately closes | `config_id` missing or wrong | Verify `NEXT_PUBLIC_META_CONFIG_ID` is set |
| `token exchange failed` | Wrong `redirect_uri` | Must exactly match what's in Meta app OAuth settings |
| `No WABA found` | User didn't complete WABA creation step | Tell agent to complete all popup steps, not skip |
| `subscribe_app` 403 | `META_SYSTEM_USER_TOKEN` expired or wrong scope | Regenerate system user token with both permissions |
| Webhook not receiving messages | Phone number not subscribed | Re-run `POST /{phoneNumberId}/subscribe_app` manually |
| Popup blocked by browser | Browser blocking popups | Tell agent to allow popups for your domain |
| `permission_denied` in popup | Business not verified OR app in dev mode and user not an admin | Complete verification or add user as test user |

### Manual Webhook Subscribe (Debug)

```bash
curl -X POST \
  "https://graph.facebook.com/v25.0/PHONE_NUMBER_ID/subscribe_app" \
  -H "Authorization: Bearer YOUR_META_SYSTEM_USER_TOKEN"
# Expected: {"success": true}
```

### Debug Token

```bash
curl "https://graph.facebook.com/v25.0/debug_token?input_token=USER_TOKEN&access_token=APP_ID|APP_SECRET"
# Check: scopes, expires_at, is_valid
```

---

## Part 8 — Security Notes

- **Never** expose `META_APP_SECRET` or `META_SYSTEM_USER_TOKEN` to the client. Both are server-only.
- `NEXT_PUBLIC_META_APP_ID` and `NEXT_PUBLIC_META_CONFIG_ID` are safe to expose — they're used by the FB JS SDK in the browser.
- `metaAccessToken` stored in Convex is a user-scoped token (60-day). Treat as a secret — do not return it to the frontend.
- The `META_SYSTEM_USER_TOKEN` is permanent and has full access to your WABA. Rotate it if leaked.

---

## Part 9 — Future: Non-Expiring Tokens (Option B)

The current implementation stores a 60-day user access token. For production at scale, replace with a system user token that doesn't expire:

1. After getting `wabaId` from the user's token, use `META_SYSTEM_USER_TOKEN` to share the WABA with your system user
2. Generate a system user token scoped to that WABA
3. Store the system user token instead of the user access token

This requires additional Business Management API calls and is out of scope for the pilot. Re-prompt every 60 days (Option A) is fine until you have 20+ agents.

---

## Quick Reference

```
Popup trigger:      FB.login() with config_id + response_type:'code'
Code exchange:      POST /oauth/access_token (server-side only)
Long-lived token:   grant_type=fb_exchange_token, expires ~60 days
WABA lookup:        GET /me/businesses
Phone lookup:       GET /{wabaId}/phone_numbers
Webhook subscribe:  POST /{phoneNumberId}/subscribe_app (system token)
Route messages by:  metadata.phone_number_id (NOT display_phone_number)
DB index:           by_metaPhoneNumberId
Token warning:      show banner 7 days before metaTokenExpiresAt
```
