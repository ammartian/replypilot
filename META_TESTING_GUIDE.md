# Meta WhatsApp API — Testing Guide

**Goal:** Send and receive real WhatsApp messages using the Meta Cloud API.  
**Time to first test message:** ~45 minutes (no approvals needed for dev mode)

---

## Phase 1: Minimum to Send a Test Message (Dev Mode)

These steps unlock sending messages from Meta's test number to your personal WhatsApp.  
No business verification required. No approvals. Works today.

### Step 1 — Create Meta Developer App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click **Create App**
3. Use case → **Other** → Next
4. App type → **Business** → Next
5. App name: `ReplyPilot` | Contact email: yours | Business portfolio: create one if prompted
6. Click **Create App**

### Step 2 — Add WhatsApp Product

1. In your new app dashboard → scroll to **"Add products to your app"**
2. Find **WhatsApp** → click **Set Up**
3. You land on **WhatsApp > Quickstart**
4. Note down (you'll need these for `.env.local`):
   - **Phone Number ID** — shown on the Quickstart page
   - **WhatsApp Business Account ID (WABA ID)**
   - **Temporary Access Token** (24h only — for testing)

### Step 3 — Add Yourself as Test Recipient

1. On the Quickstart page → **"To"** field → click **Manage phone number list**
2. Add your personal WhatsApp number (include country code, e.g. `601XXXXXXXX`)
3. WhatsApp will send you a verification code → enter it

### Step 4 — Set Environment Variables

Fill in `.env.local`:

```bash
# Meta WhatsApp Cloud API
META_APP_ID=<from app dashboard — top of page>
META_APP_SECRET=<App Settings > Basic > App Secret>
META_SYSTEM_USER_TOKEN=<use the Temporary Access Token for now>
META_WEBHOOK_VERIFY_TOKEN=replypilot_test_2026   # any string you choose
NEXT_PUBLIC_META_APP_ID=<same as META_APP_ID>
NEXT_PUBLIC_META_CONFIG_ID=<leave blank for now — needed for Embedded Signup>
```

> **Where to find App ID and App Secret:**  
> App Dashboard → Left sidebar → **App Settings** → **Basic**

### Step 5 — Send a Test Message (API call)

```bash
curl -X POST \
  "https://graph.facebook.com/v25.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_TEMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "601XXXXXXXX",
    "type": "text",
    "text": { "body": "Test from ReplyPilot" }
  }'
```

Expected response: `{"messaging_product":"whatsapp","contacts":[...],"messages":[{"id":"wamid..."}]}`

**If this works, your credentials are correct.**

---

## Phase 2: Receive Incoming Messages (Webhook)

Meta needs to verify your webhook endpoint before it will deliver messages.

### Option A — Local dev with ngrok (fastest)

```bash
# Install ngrok if not already: brew install ngrok
ngrok http 3000
# Copy the https URL, e.g. https://abc123.ngrok-free.app
```

### Option B — Vercel preview URL

Push your branch to Vercel and use the preview deployment URL.

### Register Webhook in Meta Dashboard

1. App Dashboard → **WhatsApp** → **Configuration**
2. Under **Webhook** → click **Edit**
3. Fill in:
   - **Callback URL**: `https://YOUR_URL/api/webhook/whatsapp`
   - **Verify Token**: the same value you set as `META_WEBHOOK_VERIFY_TOKEN` in `.env.local`
4. Click **Verify and Save**
   - Meta sends a GET request — your app responds with the challenge string
   - Status turns green ✓
5. Under **Webhook Fields** → click **Manage** → enable **`messages`**

### Test End-to-End

1. Send a WhatsApp message **from your personal number** to the test phone number Meta gave you
2. Check server logs — you should see `[webhook/whatsapp]` processing
3. The AI reply should arrive in your WhatsApp chat within a few seconds

---

## Phase 3: Permanent Token (Before Going Live)

The Temporary Access Token expires in 24 hours. Replace it with a permanent one.

1. Go to [business.facebook.com/settings](https://business.facebook.com/settings)
2. Left sidebar → **Users** → **System Users**
3. Click **Add** → name: `replypilot-system-user` → role: **Admin**
4. Click the system user → **Assign Assets**:
   - **Apps** → select `ReplyPilot` → Full Control
   - **WhatsApp Accounts** → select your WABA → Full Control
5. Click **Generate New Token** → select your app → check both:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. **Copy the token immediately** (shown once only)
7. Update `META_SYSTEM_USER_TOKEN` in `.env.local` with this permanent token

---

## Phase 4: Embedded Signup (Multi-Agent Onboarding)

Required so other agents can connect their own WhatsApp Business Accounts.  
**Blocked on Meta Business Verification — takes 2–5 business days.**

### Prerequisites (in order)

| Requirement | Where | Typical Wait |
|---|---|---|
| Meta Business Verification | [business.facebook.com/settings](https://business.facebook.com/settings) → Security Center | 2–5 business days |
| Advanced Access: `whatsapp_business_messaging` | App Dashboard → App Review → Permissions | 1–7 business days (after verification) |
| Advanced Access: `whatsapp_business_management` | Same | 1–7 business days |
| App in **Live mode** | App Dashboard → top toggle | Instant (after verification) |

### Once Approved

1. App Dashboard → **WhatsApp** → **Embedded Signup** → **Create Configuration**
2. Set allowed domain to your production URL
3. Copy the **Config ID** → set as `NEXT_PUBLIC_META_CONFIG_ID` in env
4. The "Connect WhatsApp Business" button in `/onboarding` will now work for other agents

---

## Checklist Summary

### Dev Mode Testing (today)
- [ ] Meta Developer App created
- [ ] WhatsApp product added, Phone Number ID and WABA ID noted
- [ ] Personal number added as test recipient
- [ ] `.env.local` filled with App ID, App Secret, Temporary Token, Verify Token
- [ ] Test curl sends successfully
- [ ] ngrok/Vercel URL registered as webhook in Meta dashboard
- [ ] Webhook verified (green checkmark) + `messages` field subscribed
- [ ] Send yourself a message → AI reply received

### Production Readiness
- [ ] Permanent System User token generated and set in env
- [ ] Meta Business Verification submitted (start this early — blocks Embedded Signup)
- [ ] Advanced access permissions requested for both scopes
- [ ] Embedded Signup config created and `NEXT_PUBLIC_META_CONFIG_ID` set
- [ ] App switched to Live mode

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| Curl returns 401 | Wrong or expired token | Use fresh Temporary Token or permanent System User Token |
| Curl returns 100 (param error) | Wrong Phone Number ID | Copy exact ID from Quickstart page |
| Webhook verify fails | Token mismatch | `META_WEBHOOK_VERIFY_TOKEN` in `.env.local` must match what you entered in Meta dashboard |
| No incoming webhook received | `messages` field not subscribed | Webhook → Manage → enable `messages` |
| Message not delivered | Recipient not in test list | Add their number in Quickstart → Manage phone number list |
| Embedded Signup popup blocked | App not in Live mode or verification pending | Complete Phase 4 prerequisites first |

---

## Key Numbers / IDs to Keep

Fill this in once you have them:

| Item | Value |
|---|---|
| App ID | |
| WABA ID | |
| Phone Number ID (test) | |
| System User Token | (permanent, store in `.env.local` only) |
| Webhook Verify Token | |
| Embedded Signup Config ID | (after Phase 4) |
