import Anthropic from '@anthropic-ai/sdk'

export type Industry =
  | 'real_estate'
  | 'hospitality'
  | 'legal'
  | 'automotive'
  | 'ecommerce'
  | 'other'

export type QualificationField =
  | 'budget'
  | 'location'
  | 'product_type'
  | 'timeline'
  | 'requirements'
  | 'contact_name'
  | 'company_name'

export type WizardAnswers = {
  industry: Industry
  businessName: string
  businessDescription: string
  primaryLanguage: 'auto' | 'en' | 'ms' | 'zh' | 'manglish'
  allowCodeSwitching: boolean
  strictMalay: boolean
  tone: 'casual' | 'neutral' | 'formal' | 'friendly_professional'
  emojiAllowed: boolean
  replyLength: 'short' | 'medium'
  fillerPhrasesAllowed: boolean
  qualificationFields: {
    field: QualificationField
    required: boolean
    order: number
  }[]
  handoffTrigger: 'hot' | 'hot_warm'
  handoffMessagePreset: 'reach_out' | 'connect' | 'follow_up' | 'custom'
  handoffMessageCustom?: string
}

export type AiConfig = {
  generatedInstructions: string
  wizardAnswers: WizardAnswers
  lastUpdated: number
}

const TONE_MAP: Record<WizardAnswers['tone'], string> = {
  casual: 'Use a casual, conversational tone.',
  neutral: 'Use a neutral, balanced tone.',
  formal: 'Use a formal, professional tone.',
  friendly_professional: 'Sound warm and professional — like a knowledgeable friend.',
}

const LANG_MAP: Record<WizardAnswers['primaryLanguage'], string> = {
  auto: "Detect language from the buyer's message. Match their language exactly.",
  en: 'Always reply in English, regardless of what language the buyer uses.',
  ms: 'Always reply in Malay.',
  zh: 'Always reply in Chinese.',
  manglish: "Reply in Manglish (English mixed naturally with Malay) — match the buyer's style.",
}

const LENGTH_MAP: Record<WizardAnswers['replyLength'], string> = {
  short: 'Keep replies to 1-2 sentences. Cut ruthlessly.',
  medium: 'Replies can be 3-4 sentences when the buyer needs more context.',
}

const HANDOFF_TRIGGER_MAP: Record<WizardAnswers['handoffTrigger'], string> = {
  hot: 'Only initiate handoff when classification is hot.',
  hot_warm: 'Initiate handoff when classification is hot or warm.',
}

const HANDOFF_MSG_MAP: Record<Exclude<WizardAnswers['handoffMessagePreset'], 'custom'>, string> = {
  reach_out: "I'll get {agentName} to reach out to you directly.",
  connect: "Let me connect you with {agentName} right away.",
  follow_up: "I'll have {agentName} follow up with you shortly.",
}

const QUALIFICATION_LABEL: Record<QualificationField, string> = {
  budget: 'Budget range',
  location: 'Location preference',
  product_type: 'Product/property type',
  timeline: 'Timeline',
  requirements: 'Specific requirements',
  contact_name: 'Contact name',
  company_name: 'Company name (B2B)',
}

const INDUSTRY_LABEL: Record<Industry, string> = {
  real_estate: 'Real Estate',
  hospitality: 'Hospitality',
  legal: 'Legal',
  automotive: 'Automotive',
  ecommerce: 'E-commerce',
  other: 'Other',
}

export type MappedConstraints = {
  toneInstruction: string
  emojiInstruction: string
  lengthInstruction: string
  fillerInstruction: string
  langInstruction: string
  codeSwitchInstruction: string
  strictMalayInstruction: string
  handoffTrigger: string
  handoffMessage: string
  qualificationList: string
  industry: string
}

export function buildMappedConstraints(answers: WizardAnswers): MappedConstraints {
  const handoffMessage =
    answers.handoffMessagePreset === 'custom' && answers.handoffMessageCustom
      ? answers.handoffMessageCustom
      : HANDOFF_MSG_MAP[answers.handoffMessagePreset as Exclude<WizardAnswers['handoffMessagePreset'], 'custom'>]

  const sortedFields = [...answers.qualificationFields].sort((a, b) => a.order - b.order)
  const qualificationList = sortedFields
    .map(
      (f, i) =>
        `  ${i + 1}. ${QUALIFICATION_LABEL[f.field]}${f.required ? ' (required)' : ' (optional)'}`,
    )
    .join('\n')

  return {
    toneInstruction: TONE_MAP[answers.tone],
    emojiInstruction: answers.emojiAllowed
      ? 'Emoji are allowed when appropriate.'
      : 'Never use emoji under any circumstances.',
    lengthInstruction: LENGTH_MAP[answers.replyLength],
    fillerInstruction: answers.fillerPhrasesAllowed
      ? ''
      : 'Never use filler openers like "Sure!", "Great!", "Of course!", or "Happy to help!".',
    langInstruction: LANG_MAP[answers.primaryLanguage],
    codeSwitchInstruction: answers.allowCodeSwitching
      ? "Code-switching is allowed — follow the buyer's lead."
      : 'Do not mix languages in a single reply.',
    strictMalayInstruction:
      answers.primaryLanguage === 'ms' && answers.strictMalay
        ? 'Use standard Malaysian Malay only (e.g. "awak" not "kamu", "hartanah" not "properti"). Never use Indonesian variants.'
        : '',
    handoffTrigger: HANDOFF_TRIGGER_MAP[answers.handoffTrigger],
    handoffMessage,
    qualificationList,
    industry: INDUSTRY_LABEL[answers.industry],
  }
}

export async function generateInstructions(answers: WizardAnswers): Promise<string> {
  const c = buildMappedConstraints(answers)

  const prompt = `You are writing one section of a system prompt for a WhatsApp AI assistant.

CONTEXT ABOUT THIS BUSINESS:
Business name: ${answers.businessName || '(not provided)'}
${answers.businessDescription}

RULES THE ASSISTANT MUST FOLLOW (do not change these — only synthesize them into clear prose):
- Tone: ${c.toneInstruction}
- Emoji: ${c.emojiInstruction}
- Reply length: ${c.lengthInstruction}
${c.fillerInstruction ? `- Filler phrases: ${c.fillerInstruction}` : ''}
- Language: ${c.langInstruction}
- Code-switching: ${c.codeSwitchInstruction}
${c.strictMalayInstruction ? `- Malay variant: ${c.strictMalayInstruction}` : ''}

QUALIFICATION — the assistant should collect these fields in this order:
${c.qualificationList}
Fields marked required must always be gathered. Optional fields only if conversation allows.

HANDOFF RULES:
- ${c.handoffTrigger}
- When handing off, use exactly this message (replace {agentName} with the agent's real name): "${c.handoffMessage}"

INDUSTRY: ${c.industry}

OUTPUT INSTRUCTIONS:
- Write 3-5 short paragraphs of plain prose.
- Do NOT use headers, bullet points, or markdown.
- Do NOT repeat or contradict locked base instructions (JSON format, WhatsApp markdown syntax, classification definitions).
- Do NOT invent rules that were not given to you.
- Write in second person addressing the AI ("You are...", "Your tone is...").
- Output ONLY the instruction text. No preamble, no explanation.`

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }
  return textBlock.text.trim()
}
