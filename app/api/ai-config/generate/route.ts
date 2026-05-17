import { NextRequest, NextResponse } from 'next/server'
import { generateInstructions } from '@/lib/ai-config'
import type { WizardAnswers } from '@/lib/ai-config'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let answers: WizardAnswers
  try {
    answers = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const instructions = await generateInstructions(answers)
    return NextResponse.json({ instructions })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
