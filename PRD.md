# ReplyPilot — Payable MVP PRD

## Context

Core AI pipeline is built and sandbox-tested. Goal: ship the minimum product that real estate agents can pay for, onboard themselves, and get value from immediately. 3 pilot agents ready. Keep everything dead simple — no fancy features, no edge case handling beyond what's needed to collect money and deliver the core loop.

---

## What MVP Must Do

1. Agent signs up and pays
2. Agent connects their WhatsApp number
3. Agent uploads their property listings
4. Buyers message → AI qualifies → Agent gets notified
5. Agent sees their leads

---

## Out of Scope

- Multi-user teams / agencies
- Analytics / reporting dashboards
- Custom AI persona configuration
- Bulk import of leads
- CRM integrations
- Mobile app
- Admin panel (manual ops via Convex dashboard for now)
- Invoice history / billing portal (Stripe Customer Portal handles this)

---

## Users

**Primary user: Real estate agent (solo)**
- Malaysian, uses WhatsApp daily
- Not technical
- Pays RM 300–500/month
- Has 5–50 active property listings
- Gets 10–100 WhatsApp enquiries/month

---

## Core User Flows

### Flow 1 — Signup & Pay

1. Agent lands on marketing page → clicks "Get Started"
2. Enters name, email, password → account created
3. Redirected to pricing page → selects plan (RM 300 or RM 500)
4. Stripe Checkout → pays
5. Redirected to onboarding dashboard

### Flow 2 — Connect WhatsApp

1. Dashboard shows "Connect WhatsApp" step
2. Agent enters their WhatsApp business number
3. System provisions a 360dialog API key for that number (manual step for pilot, automated later)
4. Agent receives test message to confirm connection
5. Step marked complete

> **Pilot simplification**: WhatsApp connection is semi-manual. Agent submits number, we provision 360dialog manually and flip a switch in Convex. Agent sees "pending" → "connected" state.

### Flow 3 — Upload Listings

1. Dashboard shows "Upload Your Listings" step
2. Agent drags/drops files (PDF, Excel, Word, images — up to 20 files, 10MB each)
3. Files upload → backend processes → embeddings generated via OpenAI
4. Agent sees list of uploaded files with status (processing / ready)
5. Step marked complete

### Flow 4 — AI Handles Buyer

1. Buyer sends WhatsApp message to agent's number
2. 360dialog webhook fires to `/api/webhook/whatsapp`
3. AI responds in buyer's language (Malay/English/Mandarin/Manglish)
4. AI qualifies across 4–5 turns: budget, location, property type, timeline
5. AI matches against agent's listings using vector search
6. AI classifies lead: hot / warm / normal / cold / new
7. On hot/warm: AI sends graceful handoff message, notifies agent
8. Agent receives WhatsApp notification with lead summary

### Flow 5 — Agent Sees Leads

1. Agent opens dashboard → Leads tab
2. Sees list: buyer number, classification, summary, timestamp
3. Clicks lead → sees full conversation transcript
4. Can mark lead as "contacted" / "closed"

---

## Pages

| Page | Purpose |
|------|---------|
| `/` | Marketing landing page |
| `/signup` | Create account |
| `/login` | Login |
| `/onboarding` | 3-step setup wizard (pay → connect WA → upload) |
| `/dashboard` | Leads list + status overview |
| `/dashboard/leads/[id]` | Single lead detail + transcript |
| `/dashboard/settings` | Account info, billing link |
| `/api/webhook/whatsapp` | 360dialog inbound messages |
| `/api/webhook/stripe` | Stripe payment events |

---

## Data Models (Convex)

### `agents`
```
id, userId, name, email, plan, status (active/inactive/pending),
whatsappNumber, whatsappStatus (pending/connected),
stripeCustomerId, stripeSubscriptionId, subscriptionStatus,
createdAt
```

### `listings` (knowledge base files)
```
id, agentId, fileName, fileType, storageId, status (processing/ready/error),
uploadedAt
```

### `listingChunks` (for vector search)
```
id, agentId, listingId, text, embedding (1536-dim float64 vector)
```

### `leads`
```
id, agentId, buyerPhone, classification (hot/warm/normal/cold/new),
summary, status (new/contacted/closed), handedOff
```

### `messages`
```
id, agentId, leadId, role (buyer/ai), content, timestamp
```

Plus `authTables` from `@convex-dev/auth` (users, sessions, accounts, verificationCodes).

---

## Pricing

| Plan | Price | Limits |
|------|-------|--------|
| Starter | RM 300/month | 500 AI conversations/month, 50 listing files |
| Pro | RM 500/month | Unlimited conversations, 200 listing files |

Stripe products pre-created. Billing monthly. No annual plan yet.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16, TailwindCSS 4, shadcn/ui (Nova/Radix preset) |
| Backend/DB | Convex (DB + vector search + real-time) |
| Auth | `@convex-dev/auth` with Password provider |
| AI | Claude Haiku (conversation), OpenAI `text-embedding-3-small` (embeddings) |
| WhatsApp | 360dialog |
| Payments | Stripe (Checkout + webhooks) |
| File storage | Convex file storage |
| Hosting | Vercel |

---

## Critical API Integrations

### 360dialog Webhook (`/api/webhook/whatsapp`)
- Receives inbound buyer message
- Looks up agent by WhatsApp number
- Checks agent subscription is active
- Runs AI conversation pipeline
- Saves message + lead to Convex
- Sends response back via 360dialog REST API

### Stripe Webhook (`/api/webhook/stripe`)
- `checkout.session.completed` → activate agent subscription
- `invoice.payment_failed` → mark agent inactive
- `customer.subscription.deleted` → deactivate agent

---

## Onboarding Wizard (3 Steps)

**Step 1 — Pay**: If subscription not active, show Stripe Checkout button. After success, show checkmark.

**Step 2 — Connect WhatsApp**: Form to enter WhatsApp number. Submit → status = "pending". Manual: we provision 360dialog and flip `whatsappStatus` to "connected" in Convex. Agent sees status update in real-time (Convex live queries).

**Step 3 — Upload Listings**: File uploader. Show file list with processing status.

Once all 3 steps done → redirect to `/dashboard`.

---

## AI Conversation Design

**Qualification questions (in order, natural not rigid):**
1. Budget range
2. Location preference
3. Property type (condo, landed, commercial)
4. Timeline (ready to buy / 3–6 months / just browsing)
5. Any specific requirements

**Classification logic:**

| Class | Criteria |
|-------|----------|
| Hot | Budget clear + specific location + timeline < 3 months |
| Warm | Budget clear + some preferences + timeline ≤ 6 months |
| Normal | Some info, vague on key points |
| Cold | No budget, just browsing |
| New | First message, nothing gathered |

**Handoff trigger**: Hot or Warm → AI sends: *"Let me connect you with [Agent Name] who can help you further. They'll be in touch shortly!"* → AI stops responding.

**Agent notification**: WhatsApp to agent's own number: *"New [HOT/WARM] lead from +60XXXXXXX — Budget: RM X, Looking for: Y in Z. Check ReplyPilot dashboard."*

---

## Development Approach: TDD

**Red → Green → Refactor on every unit.**

| Tool | Purpose |
|------|---------|
| Vitest | Unit + integration tests |
| convex-test | Convex mutations/queries (needs `npx convex dev` first) |
| msw | HTTP mocking for API route tests |
| Playwright | E2E tests |

---

## Build Order (TDD)

Each step: write failing test → implement → pass → refactor.

1. ✅ **Test setup** — Vitest, Playwright, convex-test, shadcn/ui
2. ✅ **Convex schema** — constants, schema, lead classification logic
3. ✅ **Auth** — validation, signup/login pages, Convex Auth, `proxy.ts`
4. **Stripe** — webhook handler tests (mock events) → implement
5. **Onboarding** — subscription status checks → pay step UI
6. **File upload** — upload mutation + embedding pipeline (mock OpenAI)
7. **WhatsApp webhook** — inbound message handler (mock 360dialog)
8. **AI pipeline** — classification + vector search
9. **Leads dashboard** — Convex queries → UI
10. **E2E** — Playwright: signup → pay → upload → buyer message → lead appears

---

## Required Env Vars

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=

# Convex Auth
SITE_URL=http://localhost:3000
JWKS=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=

# OpenAI (embeddings)
OPENAI_API_KEY=

# Anthropic (Claude Haiku)
ANTHROPIC_API_KEY=

# 360dialog (WhatsApp)
DIALOG360_API_KEY=
DIALOG360_PARTNER_TOKEN=
```

---

## One-Time Setup (before running app)

```bash
# 1. Auth with Convex and create project
npx convex dev

# 2. Copy env template and fill values
cp .env.local.example .env.local

# 3. Run dev server
npm run dev
```

---

## MVP Success Criteria

1. 3 pilot agents onboarded and paying within 2 weeks of launch
2. End-to-end: buyer messages → AI qualifies → agent notified
3. Zero cross-contamination between agents
4. Agent can self-onboard without help (except WhatsApp provisioning)
5. Handles 50 concurrent conversations without breaking
