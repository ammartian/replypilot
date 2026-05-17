'use client'

import { use } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id, Doc } from '@/convex/_generated/dataModel'
import Link from 'next/link'
import { classificationBadge, formatPhone, formatDateTime, formatTime } from '@/lib/lead-utils'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const lead = useQuery(api.leads.getLead, { leadId: id as Id<'leads'> })
  const messages = useQuery(api.messages.getMessagesForLead, {
    leadId: id as Id<'leads'>,
  })
  const updateLead = useMutation(api.leads.updateLead)

  if (lead === undefined || messages === undefined) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-neutral-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="p-8">
        <p className="text-neutral-500">Lead not found.</p>
      </div>
    )
  }

  const badge = classificationBadge(lead.classification)

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Leads
      </Link>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold mb-1">{formatPhone(lead.buyerPhone)}</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Created {formatDateTime(lead._creationTime)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={badge.color}>{badge.label}</Badge>
              {lead.handedOff && (
                <span className="text-xs text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-full">
                  Handed off to agent
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <label className="text-xs text-neutral-500">Status</label>
            <Select
              value={lead.status}
              onValueChange={(value) =>
                updateLead({
                  leadId: lead._id,
                  status: value as 'new' | 'contacted' | 'closed',
                })
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {lead.summary && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-neutral-500 mb-1 font-medium uppercase tracking-wide">
              Summary
            </p>
            <p className="text-sm text-neutral-700">{lead.summary}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border">
        <div className="px-5 py-3 border-b">
          <h2 className="text-sm font-semibold text-neutral-700">Conversation</h2>
        </div>
        <div className="divide-y">
          {messages.length === 0 ? (
            <div className="px-5 py-8 text-center text-neutral-400 text-sm">
              No messages yet.
            </div>
          ) : (
            messages.map((msg: Doc<'messages'>) => (
              <div key={msg._id} className="px-5 py-4 flex gap-4">
                <span
                  className={`text-xs font-medium mt-0.5 w-12 shrink-0 ${
                    msg.role === 'buyer' ? 'text-neutral-500' : 'text-blue-600'
                  }`}
                >
                  {msg.role === 'buyer' ? 'Buyer' : 'AI'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-700 leading-relaxed">{msg.content}</p>
                  <p className="text-xs text-neutral-400 mt-1">{formatDateTime(msg._creationTime)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
