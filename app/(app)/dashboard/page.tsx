'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { classificationBadge, formatPhone, formatDateTime, toWaMePhone } from '@/lib/lead-utils'
import { getOnboardingStep } from '@/lib/onboarding'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, ChevronRight, Phone } from 'lucide-react'
import type { Doc } from '@/convex/_generated/dataModel'

function statusStyle(status: string) {
  switch (status) {
    case 'new': return 'bg-blue-50 text-blue-600'
    case 'contacted': return 'bg-green-50 text-green-700'
    default: return 'bg-neutral-100 text-neutral-500'
  }
}

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
        <div className="text-neutral-400 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        {leads && leads.length > 0 && (
          <span className="text-sm text-neutral-400">{leads.length} total</span>
        )}
      </div>

      {!leads || leads.length === 0 ? (
        <div className="text-center py-20 text-neutral-400 text-sm">
          <Phone className="w-8 h-8 mx-auto mb-3 text-neutral-200" />
          No leads yet. Share your WhatsApp number with buyers to get started.
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y overflow-hidden">
          {leads.map((lead: Doc<'leads'>) => {
            const badge = classificationBadge(lead.classification)
            const waHref = `https://wa.me/${toWaMePhone(lead.buyerPhone)}`
            return (
              <Link
                key={lead._id}
                href={`/dashboard/leads/${lead._id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-neutral-400" />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm text-neutral-900 shrink-0">
                      {formatPhone(lead.buyerPhone)}
                    </span>
                    <Badge className={`${badge.color} text-[11px] px-1.5 py-0`}>{badge.label}</Badge>
                    {lead.handedOff && (
                      <span className="text-[11px] text-neutral-400">· Handed off</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {lead.summary ? (
                      <span className="text-xs text-neutral-500 truncate max-w-[180px] sm:max-w-sm">
                        {lead.summary}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-300 italic">No summary</span>
                    )}
                    <span className="text-neutral-200 text-xs">·</span>
                    <span className="text-[11px] text-neutral-400 shrink-0">
                      {formatDateTime(lead._creationTime)}
                    </span>
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full hidden sm:inline-block ${statusStyle(lead.status)}`}>
                    {lead.status}
                  </span>
                  {agent?.whatsappStatus === 'connected' && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors"
                      title="Open in WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                  <ChevronRight className="w-4 h-4 text-neutral-300" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
