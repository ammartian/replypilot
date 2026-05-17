'use client'

import { use } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id, Doc } from '@/convex/_generated/dataModel'
import Link from 'next/link'
import { classificationBadge, formatPhone, formatDateTime, toWaMePhone } from '@/lib/lead-utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, MessageCircle, Bot, User } from 'lucide-react'

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const lead = useQuery(api.leads.getLead, { leadId: id as Id<'leads'> })
  const messages = useQuery(api.messages.getMessagesForLead, {
    leadId: id as Id<'leads'>,
  })
  const agent = useQuery(api.agents.getAgent)
  const updateLead = useMutation(api.leads.updateLead)

  if (lead === undefined || messages === undefined) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-neutral-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-neutral-500">Lead not found.</p>
      </div>
    )
  }

  const badge = classificationBadge(lead.classification)
  const waHref = `https://wa.me/${toWaMePhone(lead.buyerPhone)}`

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      {/* Back nav */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Leads
      </Link>

      {/* Lead header card */}
      <div className="bg-white rounded-xl border p-5">
        {/* Top row: phone + status selector */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-neutral-900 break-all">
              {formatPhone(lead.buyerPhone)}
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              {formatDateTime(lead._creationTime)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <label className="text-[11px] text-neutral-400 uppercase tracking-wide">Status</label>
            <Select
              value={lead.status}
              onValueChange={(value) =>
                updateLead({
                  leadId: lead._id,
                  status: value as 'new' | 'contacted' | 'closed',
                })
              }
            >
              <SelectTrigger className="w-32 h-8 text-sm">
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

        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <Badge className={badge.color}>{badge.label}</Badge>
          {lead.handedOff && (
            <span className="text-xs text-neutral-400 bg-neutral-50 border px-2 py-0.5 rounded-full">
              Handed off to agent
            </span>
          )}
          {agent?.whatsappStatus === 'connected' && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50 gap-1"
              >
                <MessageCircle className="h-3 w-3" />
                Open in WhatsApp
              </Button>
            </a>
          )}
        </div>

        {/* Summary */}
        {lead.summary && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              AI Summary
            </p>
            <p className="text-sm text-neutral-700 leading-relaxed">{lead.summary}</p>
          </div>
        )}
      </div>

      {/* Conversation */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-neutral-50">
          <h2 className="text-sm font-semibold text-neutral-700">Conversation</h2>
          {messages && messages.length > 0 && (
            <p className="text-[11px] text-neutral-400 mt-0.5">{messages.length} messages</p>
          )}
        </div>

        <div className="p-4 flex flex-col gap-3">
          {!messages || messages.length === 0 ? (
            <div className="py-10 text-center text-neutral-400 text-sm">
              No messages yet.
            </div>
          ) : (
            messages.map((msg: Doc<'messages'>) => {
              const isBuyer = msg.role === 'buyer'
              return (
                <div
                  key={msg._id}
                  className={`flex gap-2 ${isBuyer ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isBuyer ? 'bg-neutral-100' : 'bg-blue-100'
                    }`}
                  >
                    {isBuyer
                      ? <User className="w-3.5 h-3.5 text-neutral-500" />
                      : <Bot className="w-3.5 h-3.5 text-blue-600" />
                    }
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] flex flex-col gap-1 ${isBuyer ? 'items-start' : 'items-end'}`}>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isBuyer
                          ? 'bg-neutral-100 text-neutral-800 rounded-tl-sm'
                          : 'bg-blue-600 text-white rounded-tr-sm'
                      }`}
                    >
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 px-1">
                      {formatDateTime(msg._creationTime)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
