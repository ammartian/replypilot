import type { LeadClassification, LeadStatus } from '@/convex/constants'

export function classificationBadge(classification: LeadClassification): {
  label: string
  color: string
} {
  switch (classification) {
    case 'hot':
      return { label: 'Hot', color: 'bg-red-100 text-red-700' }
    case 'warm':
      return { label: 'Warm', color: 'bg-orange-100 text-orange-700' }
    case 'normal':
      return { label: 'Normal', color: 'bg-blue-100 text-blue-700' }
    case 'cold':
      return { label: 'Cold', color: 'bg-gray-100 text-gray-600' }
    case 'new':
      return { label: 'New', color: 'bg-purple-100 text-purple-700' }
  }
}

export function statusLabel(status: LeadStatus): string {
  switch (status) {
    case 'new':
      return 'New'
    case 'contacted':
      return 'Contacted'
    case 'closed':
      return 'Closed'
  }
}

export function formatPhone(phone: string): string {
  return phone.startsWith('+') ? phone : `+${phone}`
}
