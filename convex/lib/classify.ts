import type { LeadClassification } from '../constants'

export type LeadQualification = {
  budget: string | null
  location: string | null
  propertyType: string | null
  timeline: string | null
}

const VAGUE_LOCATION_PATTERNS = [
  /\barea\b/i,
  /\bsomewhere\b/i,
  /\banywhere\b/i,
  /\baround\b/i,
  /\bkl\s*area\b/i,
]

const SHORT_TIMELINE_MONTHS_THRESHOLD = 3

function isVagueLocation(location: string): boolean {
  return VAGUE_LOCATION_PATTERNS.some((p) => p.test(location))
}

function extractMonths(timeline: string): number | null {
  const weekMatch = timeline.match(/(\d+)\s*week/i)
  if (weekMatch) return Math.ceil(parseInt(weekMatch[1]) / 4)

  const monthMatch = timeline.match(/(\d+)\s*month/i)
  if (monthMatch) return parseInt(monthMatch[1])

  if (/\b1\s*month\b|next\s*month/i.test(timeline)) return 1

  return null
}

function isJustBrowsing(timeline: string): boolean {
  return /just\s*brows|no\s*rush|not\s*sure|exploring/i.test(timeline)
}

export function classifyLead(q: LeadQualification): LeadClassification {
  const { budget, location, propertyType, timeline } = q

  const hasAnyInfo = budget || location || propertyType || timeline
  if (!hasAnyInfo) return 'new'

  if (!budget) {
    if (timeline && isJustBrowsing(timeline)) return 'cold'
    if (!location && !propertyType) return 'cold'
    return 'normal'
  }

  // Has budget — check timeline
  if (timeline) {
    const months = extractMonths(timeline)

    const hasSpecificLocation = location && !isVagueLocation(location)

    if (months !== null && months <= SHORT_TIMELINE_MONTHS_THRESHOLD && hasSpecificLocation) {
      return 'hot'
    }

    if (
      months !== null &&
      (months <= SHORT_TIMELINE_MONTHS_THRESHOLD || months <= 6)
    ) {
      return 'warm'
    }

    if (isJustBrowsing(timeline)) return 'cold'
  }

  // Budget present but incomplete info
  if (location || propertyType) return 'warm'

  return 'normal'
}
