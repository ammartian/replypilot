'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { classificationBadge, formatPhone, formatDateTime } from '@/lib/lead-utils'
import { getOnboardingStep } from '@/lib/onboarding'
import { Badge } from '@/components/ui/badge'
import type { Doc } from '@/convex/_generated/dataModel'

export default function DashboardPage() {
  const router = useRouter()
  const agent = useQuery(api.agents.getAgent)
  const leads = useQuery(
    api.leads.getLeadsForAgent,
    agent?._id ? { agentId: agent._id } : 'skip'
  )
  const hasListings = useQuery(api.listings.hasListingsForAgent)

  useEffect(() => {
    if (agent === null) {
      router.push('/login')
      return
    }
    if (agent !== undefined && hasListings !== undefined) {
      const step = getOnboardingStep({
        subscriptionStatus: agent.subscriptionStatus ?? 'inactive',
        whatsappStatus: agent.whatsappStatus ?? 'pending',
        hasListings,
      })
      if (step !== 'done') router.push('/onboarding')
    }
  }, [agent, hasListings, router])

  if (agent === undefined || leads === undefined || hasListings === undefined) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-neutral-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Leads</h1>

      {leads.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          No leads yet. Share your WhatsApp number with buyers to get started.
        </div>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {leads.map((lead: Doc<'leads'>) => {
            const badge = classificationBadge(lead.classification)
            return (
              <Link
                key={lead._id}
                href={`/dashboard/leads/${lead._id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-neutral-700">
                    {formatPhone(lead.buyerPhone)}
                  </span>
                  <Badge className={badge.color}>{badge.label}</Badge>
                  {lead.handedOff && (
                    <span className="text-xs text-neutral-400">Handed off</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {lead.summary && (
                    <span className="text-sm text-neutral-500 max-w-xs truncate">
                      {lead.summary}
                    </span>
                  )}
                  <span className="text-xs text-neutral-400">
                    {formatDateTime(lead._creationTime)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      lead.status === 'new'
                        ? 'bg-blue-50 text-blue-600'
                        : lead.status === 'contacted'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {lead.status}
                  </span>
                  <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
