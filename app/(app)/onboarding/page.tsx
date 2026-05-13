'use client'

import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getOnboardingStep } from '@/lib/onboarding'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'

declare const FB: {
  init: (opts: object) => void
  login: (cb: (res: { authResponse?: { code?: string } }) => void, opts: object) => void
}

export default function OnboardingPage() {
  const router = useRouter()
  const agent = useQuery(api.agents.getAgent)
  const ensureAgent = useMutation(api.agents.ensureAgent)

  const [connectLoading, setConnectLoading] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const hasListings = useQuery(api.listings.hasListingsForAgent) ?? false

  // agent === null means loaded but no record — signup's createAgent failed silently
  useEffect(() => {
    if (agent === null) ensureAgent().catch(() => {})
  }, [agent, ensureAgent])

  const step =
    agent === undefined || agent === null
      ? null
      : getOnboardingStep({
          subscriptionStatus: agent.subscriptionStatus ?? 'inactive',
          whatsappStatus: agent.whatsappStatus ?? 'pending',
          hasListings,
        })

  useEffect(() => {
    if (step === 'done') router.push('/dashboard')
  }, [step, router])

  // Load FB JS SDK once when step 2 becomes active
  useEffect(() => {
    if (step !== 2) return
    if (document.getElementById('fb-sdk')) return
    const script = document.createElement('script')
    script.id = 'fb-sdk'
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.onload = () => {
      FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID!,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v25.0',
      })
    }
    document.body.appendChild(script)
  }, [step])

  function launchWhatsAppSignup() {
    setConnectError('')
    setConnectLoading(true)
    FB.login(
      async (response) => {
        const code = response.authResponse?.code
        if (!code) {
          setConnectLoading(false)
          setConnectError('WhatsApp connection was cancelled or failed. Please try again.')
          return
        }
        try {
          const res = await fetch('/api/meta/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error ?? 'Connection failed')
          }
        } catch (err) {
          setConnectError(err instanceof Error ? err.message : 'Connection failed')
        } finally {
          setConnectLoading(false)
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
      }
    )
  }

  async function handleSubscribe(plan: 'plus' | 'pro') {
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (agent === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const steps = [
    { n: 1, label: 'Subscribe' },
    { n: 2, label: 'Connect WhatsApp' },
    { n: 3, label: 'Upload Listings' },
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Welcome to ReplyPilot</h1>
        <p className="mt-1 text-gray-500">Complete setup to start qualifying leads automatically</p>
      </div>

      <div className="mb-8 flex justify-center gap-6">
        {steps.map(({ n, label }) => {
          const done = step !== null && (step === 'done' || n < step)
          const active = step === n
          return (
            <div key={n} className="flex flex-col items-center gap-1">
              {done ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <Circle className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-300'}`} />
              )}
              <span className={`text-sm ${active ? 'font-medium text-blue-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose your plan</CardTitle>
            <CardDescription>Start your ReplyPilot subscription to activate AI lead qualification</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="font-semibold">Plus</p>
              <p className="text-2xl font-bold mt-1">RM 299<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                <li>500 AI conversations/month</li>
                <li>50 listing files</li>
              </ul>
              <Button
                className="mt-4 w-full"
                onClick={() => handleSubscribe('plus')}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get Plus'}
              </Button>
            </div>
            <div className="rounded-lg border border-blue-600 p-4 relative">
              <span className="absolute -top-2.5 left-3 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">Popular</span>
              <p className="font-semibold">Pro</p>
              <p className="text-2xl font-bold mt-1">RM 499<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                <li>Unlimited conversations</li>
                <li>200 listing files</li>
              </ul>
              <Button
                className="mt-4 w-full"
                onClick={() => handleSubscribe('pro')}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get Pro'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Connect WhatsApp</CardTitle>
            <CardDescription>
              Connect your WhatsApp Business Account via Facebook. You&apos;ll log in with Facebook
              and select or create a WhatsApp Business Account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={launchWhatsAppSignup} disabled={connectLoading}>
              {connectLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Connecting…</>
              ) : (
                'Connect WhatsApp Business'
              )}
            </Button>
            {connectError && <p className="text-sm text-red-600">{connectError}</p>}
            <p className="text-xs text-gray-500">
              A Facebook popup will open. Log in, select your WhatsApp Business Account, and verify
              your phone number via OTP. This takes about 2 minutes.
            </p>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Add Your Listings</CardTitle>
            <CardDescription>
              Paste your property listing details below. The AI uses this to answer buyer questions accurately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ListingsInput />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const PLACEHOLDER = `Paste your property details here. Include for each listing:
- Property name and location/area
- Price or price range (e.g. RM 650,000 or RM 500k–800k)
- Size in sqft and layout (bedrooms / bathrooms)
- Property type (condo, landed, serviced apartment, commercial)
- Status (ready to move in / under construction / completing Q3 2026)
- Tenure (freehold / leasehold)
- Key facilities and features
- Developer name (optional)

Separate multiple listings with a blank line or "---"

Example:
Residensi Parklane, KL City Centre
Price: RM 650,000 | Size: 850 sqft | 2 bed 2 bath
Type: Condo | Freehold | Ready to move in
Facilities: Infinity pool, gym, 2 covered carparks
Near Bukit Nanas LRT, 5 min to KLCC

---

Taman Setia Indah, Johor Bahru
Price: RM 420,000 | Size: 1,400 sqft | 3 bed 2 bath
Type: Double-storey terrace | Freehold | Ready
Gated & guarded, near CIQ, schools within 1km`

function ListingsInput() {
  const processTextListing = useAction(api.listings.processTextListing)
  const listings = useQuery(api.listings.getListingsForAgent)

  const [content, setContent] = useState('')
  const [label, setLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await processTextListing({
        label: label.trim() || `Listings ${new Date().toLocaleDateString('en-MY')}`,
        content: content.trim(),
      })
      setSuccess('✓ Listings saved and indexed — the AI can now answer buyer questions.')
      setContent('')
      setLabel('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save listings')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="listing-label">Label (optional)</Label>
          <Input
            id="listing-label"
            placeholder="e.g. KL Condos May 2026"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="listing-content">Listing Details</Label>
          <textarea
            id="listing-content"
            rows={14}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 resize-y font-mono"
            placeholder={PLACEHOLDER}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <Button type="submit" disabled={submitting || !content.trim()}>
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Indexing…</> : 'Save & Index Listings'}
        </Button>
      </form>

      {listings && listings.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {listings.map((l: { _id: string; fileName: string; status: string }) => (
            <li key={l._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="truncate max-w-xs">{l.fileName}</span>
              <span
                className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  l.status === 'ready'
                    ? 'bg-green-100 text-green-700'
                    : l.status === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {l.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
