'use client'

import { useQuery, useMutation } from 'convex/react'
import { useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getOnboardingStep } from '@/lib/onboarding'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const agent = useQuery(api.agents.getAgent)
  const setWhatsappNumber = useMutation(api.agents.setWhatsappNumber)

  const [waNumber, setWaNumber] = useState('')
  const [waSubmitting, setWaSubmitting] = useState(false)
  const [waError, setWaError] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const hasListings = useQuery(api.listings.hasListingsForAgent) ?? false

  const step =
    agent === undefined
      ? null
      : getOnboardingStep({
          subscriptionStatus: agent?.subscriptionStatus ?? 'inactive',
          whatsappStatus: agent?.whatsappStatus ?? 'pending',
          hasListings,
        })

  useEffect(() => {
    if (step === 'done') router.push('/dashboard')
  }, [step, router])

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

  async function handleWhatsappSubmit(e: React.FormEvent) {
    e.preventDefault()
    setWaError('')
    const cleaned = waNumber.replace(/\D/g, '')
    if (cleaned.length < 10) {
      setWaError('Enter a valid phone number with country code (e.g. 601XXXXXXXX)')
      return
    }
    setWaSubmitting(true)
    try {
      await setWhatsappNumber({ whatsappNumber: cleaned })
    } finally {
      setWaSubmitting(false)
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
              Enter your WhatsApp Business number. We will configure it and notify you when it is ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agent?.whatsappStatus === 'pending' && agent?.whatsappNumber ? (
              <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-4 text-yellow-800">
                <Loader2 className="h-5 w-5 animate-spin" />
                <div>
                  <p className="font-medium">Setup in progress</p>
                  <p className="text-sm">We are provisioning {agent.whatsappNumber}. This usually takes a few hours.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleWhatsappSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="wa-number">WhatsApp Business Number</Label>
                  <Input
                    id="wa-number"
                    placeholder="601XXXXXXXX"
                    value={waNumber}
                    onChange={(e) => setWaNumber(e.target.value)}
                  />
                  {waError && <p className="text-sm text-red-600">{waError}</p>}
                  <p className="text-xs text-gray-500">Include country code, no spaces or dashes</p>
                </div>
                <Button type="submit" disabled={waSubmitting}>
                  {waSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit Number
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Listings</CardTitle>
            <CardDescription>
              Upload property listing files (PDF, Word, Excel, images). The AI uses these to answer buyer questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ListingsUploader agentId={agent!._id} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ListingsUploader({ agentId }: { agentId: string }) {
  const generateUploadUrl = useMutation(api.listings.generateUploadUrl)
  const saveListingFile = useMutation(api.listings.saveListingFile)
  const listings = useQuery(api.listings.getListingsForAgent)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setError('')
    setUploading(true)
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} exceeds 10MB limit`)
          continue
        }
        const uploadUrl = await generateUploadUrl()
        const result = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'content-type': file.type },
          body: file,
        })
        const { storageId } = await result.json()
        await saveListingFile({
          fileName: file.name,
          fileType: file.type,
          storageId,
        })
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={handleFiles}
          disabled={uploading}
        />
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        ) : (
          <>
            <p className="font-medium text-gray-600">Drop files here or click to browse</p>
            <p className="text-sm text-gray-400 mt-1">PDF, Word, Excel, images — max 10MB each, up to 20 files</p>
          </>
        )}
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
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
