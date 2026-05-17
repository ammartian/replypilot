'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ExternalLink, Bot } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const agent = useQuery(api.agents.getAgent)

  if (agent === undefined) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-neutral-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your agent profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-neutral-500">Name</span>
              <span className="font-medium">{agent?.name}</span>
              <span className="text-neutral-500">Email</span>
              <span className="font-medium">{agent?.email}</span>
              <span className="text-neutral-500">Plan</span>
              <span className="font-medium capitalize">{agent?.plan}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp</CardTitle>
            <CardDescription>Your connected WhatsApp business number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-neutral-500">Number</span>
              <span className="font-medium font-mono">
                {agent?.whatsappNumber ? `+${agent.whatsappNumber}` : '—'}
              </span>
              <span className="text-neutral-500">Status</span>
              <span
                className={`font-medium ${
                  agent?.whatsappStatus === 'connected' ? 'text-green-600' : 'text-yellow-600'
                }`}
              >
                {agent?.whatsappStatus === 'connected' ? 'Connected' : 'Pending'}
              </span>
              {agent?.metaPhoneNumberId && (
                <>
                  <span className="text-neutral-500">Phone Number ID</span>
                  <span className="font-medium font-mono text-xs break-all">{agent.metaPhoneNumberId}</span>
                </>
              )}
            </div>
            {agent?.metaTokenExpiresAt &&
              agent.metaTokenExpiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000 && (
                <p className="text-xs text-red-500 mt-2">
                  Your WhatsApp access token expires soon. Go to onboarding to reconnect your
                  WhatsApp Business Account.
                </p>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Behavior</CardTitle>
            <CardDescription>Customize how your AI assistant communicates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-500">
                {agent?.aiConfig
                  ? `Last updated ${new Date(agent.aiConfig.lastUpdated).toLocaleDateString()}`
                  : 'Not configured — using defaults'}
              </div>
              <Button variant="outline" className="gap-2" asChild>
                <Link href="/dashboard/settings/ai">
                  <Bot className="w-4 h-4" />
                  {agent?.aiConfig ? 'Edit' : 'Set up'}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Manage your subscription and invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-3 text-sm mb-4">
              <span className="text-neutral-500">Subscription</span>
              <span
                className={`font-medium ${
                  agent?.subscriptionStatus === 'active'
                    ? 'text-green-600'
                    : agent?.subscriptionStatus === 'past_due'
                      ? 'text-red-600'
                      : 'text-neutral-500'
                }`}
              >
                {agent?.subscriptionStatus === 'active'
                  ? 'Active'
                  : agent?.subscriptionStatus === 'past_due'
                    ? 'Past due'
                    : 'Inactive'}
              </span>
            </div>
            <Separator className="my-4" />
            <Button variant="outline" className="gap-2" asChild>
              <a href="https://billing.stripe.com/p/login/test" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                Manage billing on Stripe
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
