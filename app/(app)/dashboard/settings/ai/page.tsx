'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Check, Loader2 } from 'lucide-react'
import type { WizardAnswers, QualificationField, Industry } from '@/lib/ai-config'
import { cn } from '@/lib/utils'

const STEPS = ['Business', 'Language', 'Tone & Style', 'Qualification', 'Handoff', 'Preview']

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'legal', label: 'Legal' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'other', label: 'Other' },
]

const ALL_QUALIFICATION_FIELDS: { field: QualificationField; label: string }[] = [
  { field: 'budget', label: 'Budget range' },
  { field: 'location', label: 'Location preference' },
  { field: 'product_type', label: 'Product / property type' },
  { field: 'timeline', label: 'Timeline' },
  { field: 'requirements', label: 'Specific requirements' },
  { field: 'contact_name', label: 'Contact name' },
  { field: 'company_name', label: 'Company name (B2B)' },
]

const DEFAULT_ANSWERS: WizardAnswers = {
  industry: 'real_estate',
  businessName: '',
  businessDescription: '',
  primaryLanguage: 'auto',
  allowCodeSwitching: true,
  strictMalay: false,
  tone: 'friendly_professional',
  emojiAllowed: false,
  replyLength: 'short',
  fillerPhrasesAllowed: false,
  qualificationFields: [
    { field: 'budget', required: true, order: 0 },
    { field: 'location', required: true, order: 1 },
    { field: 'product_type', required: false, order: 2 },
    { field: 'timeline', required: false, order: 3 },
    { field: 'requirements', required: false, order: 4 },
  ],
  handoffTrigger: 'hot_warm',
  handoffMessagePreset: 'reach_out',
}

function ToggleButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-md text-sm border transition-colors',
        active
          ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
          : 'bg-transparent text-neutral-600 border-neutral-200 hover:border-neutral-400 dark:text-neutral-400 dark:border-neutral-700',
        className,
      )}
    >
      {children}
    </button>
  )
}

function OnOff({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-1">
      <ToggleButton active={value} onClick={() => onChange(true)}>
        On
      </ToggleButton>
      <ToggleButton active={!value} onClick={() => onChange(false)}>
        Off
      </ToggleButton>
    </div>
  )
}

export default function AiSettingsPage() {
  const agent = useQuery(api.agents.getAgent)
  const saveAiConfig = useMutation(api.agents.saveAiConfig)
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<WizardAnswers>(DEFAULT_ANSWERS)
  const [preview, setPreview] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-populate from existing config
  useEffect(() => {
    if (agent?.aiConfig?.wizardAnswers) {
      setAnswers(agent.aiConfig.wizardAnswers as WizardAnswers)
    }
  }, [agent])

  function update<K extends keyof WizardAnswers>(key: K, value: WizardAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
    setPreview(null)
  }

  // Qualification field helpers
  const selectedFields = [...answers.qualificationFields].sort((a, b) => a.order - b.order)
  const selectedFieldKeys = new Set(selectedFields.map((f) => f.field))

  function toggleField(field: QualificationField) {
    if (selectedFieldKeys.has(field)) {
      update(
        'qualificationFields',
        answers.qualificationFields.filter((f) => f.field !== field),
      )
    } else {
      const maxOrder = answers.qualificationFields.reduce((m, f) => Math.max(m, f.order), -1)
      update('qualificationFields', [
        ...answers.qualificationFields,
        { field, required: false, order: maxOrder + 1 },
      ])
    }
  }

  function moveField(field: QualificationField, dir: 'up' | 'down') {
    const sorted = [...selectedFields]
    const idx = sorted.findIndex((f) => f.field === field)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    ;[sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]]
    update(
      'qualificationFields',
      sorted.map((f, i) => ({ ...f, order: i })),
    )
  }

  function toggleRequired(field: QualificationField) {
    update(
      'qualificationFields',
      answers.qualificationFields.map((f) =>
        f.field === field ? { ...f, required: !f.required } : f,
      ),
    )
  }

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-config/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setPreview(data.instructions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSave() {
    if (!preview) return
    setIsSaving(true)
    setError(null)
    try {
      await saveAiConfig({
        industry: answers.industry,
        wizardAnswers: answers,
        generatedInstructions: preview,
      })
      setSaved(true)
      setTimeout(() => router.push('/dashboard/settings'), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  if (agent === undefined) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-neutral-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold">AI Behavior</h1>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex-1">
            <div
              className={cn(
                'h-1 rounded-full transition-colors',
                i <= step ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700',
              )}
            />
            <p
              className={cn(
                'text-xs mt-1 text-center hidden sm:block',
                i === step ? 'text-neutral-900 dark:text-white font-medium' : 'text-neutral-400',
              )}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Step 0: Business */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Business Context</CardTitle>
            <CardDescription>Tell us about your business so the AI knows its context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="biz-name">Business name</Label>
              <Input
                id="biz-name"
                placeholder="e.g. KL Luxury Realty"
                value={answers.businessName}
                onChange={(e) => update('businessName', e.target.value)}
              />
              <p className="text-xs text-neutral-400">
                This may appear in your AI bot&apos;s responses to buyers.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Industry</Label>
              <Select
                value={answers.industry}
                onValueChange={(v) => update('industry', v as Industry)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="biz-desc">
                Business description{' '}
                <span className="text-neutral-400 font-normal">
                  ({answers.businessDescription.length}/200)
                </span>
              </Label>
              <textarea
                id="biz-desc"
                rows={3}
                maxLength={200}
                placeholder="e.g. Luxury condo agency in KL specialising in KLCC area properties."
                value={answers.businessDescription}
                onChange={(e) => update('businessDescription', e.target.value)}
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Language */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Language</CardTitle>
            <CardDescription>How should your AI handle language?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Primary language</Label>
              <Select
                value={answers.primaryLanguage}
                onValueChange={(v) =>
                  update('primaryLanguage', v as WizardAnswers['primaryLanguage'])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect (match buyer)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ms">Malay</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="manglish">Manglish-friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {answers.primaryLanguage === 'ms' && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Strict Malaysian Malay</p>
                  <p className="text-xs text-neutral-400">
                    Enforce standard Malaysian Malay, not Indonesian variants
                  </p>
                </div>
                <OnOff value={answers.strictMalay} onChange={(v) => update('strictMalay', v)} />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Code-switching</p>
                <p className="text-xs text-neutral-400">
                  Allow mixing languages to match the buyer
                </p>
              </div>
              <OnOff
                value={answers.allowCodeSwitching}
                onChange={(v) => update('allowCodeSwitching', v)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Tone & Style */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Tone & Style</CardTitle>
            <CardDescription>How should your AI sound?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Tone</Label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: 'casual', label: 'Casual' },
                    { value: 'neutral', label: 'Neutral' },
                    { value: 'formal', label: 'Formal' },
                    { value: 'friendly_professional', label: 'Friendly-Professional' },
                  ] as const
                ).map((opt) => (
                  <ToggleButton
                    key={opt.value}
                    active={answers.tone === opt.value}
                    onClick={() => update('tone', opt.value)}
                  >
                    {opt.label}
                  </ToggleButton>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reply length</Label>
              <div className="flex gap-2">
                <ToggleButton
                  active={answers.replyLength === 'short'}
                  onClick={() => update('replyLength', 'short')}
                >
                  Short (1-2 sentences)
                </ToggleButton>
                <ToggleButton
                  active={answers.replyLength === 'medium'}
                  onClick={() => update('replyLength', 'medium')}
                >
                  Medium (3-4 sentences)
                </ToggleButton>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Emoji</p>
                <p className="text-xs text-neutral-400">Allow emoji in replies</p>
              </div>
              <OnOff
                value={answers.emojiAllowed}
                onChange={(v) => update('emojiAllowed', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Filler phrases</p>
                <p className="text-xs text-neutral-400">"Sure!", "Great!", "Of course!"</p>
              </div>
              <OnOff
                value={answers.fillerPhrasesAllowed}
                onChange={(v) => update('fillerPhrasesAllowed', v)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Qualification */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Qualification</CardTitle>
            <CardDescription>
              Choose what info to collect and in what order. Drag up/down to reorder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fields to collect</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_QUALIFICATION_FIELDS.map(({ field, label }) => (
                  <ToggleButton
                    key={field}
                    active={selectedFieldKeys.has(field)}
                    onClick={() => toggleField(field)}
                  >
                    {label}
                  </ToggleButton>
                ))}
              </div>
            </div>

            {selectedFields.length > 0 && (
              <>
                <Separator />
                <div className="space-y-1">
                  <Label>Order & required</Label>
                  {selectedFields.map((f, i) => {
                    const label = ALL_QUALIFICATION_FIELDS.find((q) => q.field === f.field)?.label
                    return (
                      <div
                        key={f.field}
                        className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-neutral-50 dark:bg-neutral-800/50"
                      >
                        <span className="text-xs text-neutral-400 w-4 text-right">{i + 1}.</span>
                        <span className="text-sm flex-1">{label}</span>
                        <ToggleButton
                          active={f.required}
                          onClick={() => toggleRequired(f.field)}
                          className="text-xs py-0.5 px-2"
                        >
                          {f.required ? 'Required' : 'Optional'}
                        </ToggleButton>
                        <div className="flex gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveField(f.field, 'up')}
                            disabled={i === 0}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-600 disabled:opacity-20"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(f.field, 'down')}
                            disabled={i === selectedFields.length - 1}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-600 disabled:opacity-20"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Handoff */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Handoff</CardTitle>
            <CardDescription>When should the AI hand over to you?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Trigger handoff when lead is</Label>
              <div className="flex gap-2">
                <ToggleButton
                  active={answers.handoffTrigger === 'hot_warm'}
                  onClick={() => update('handoffTrigger', 'hot_warm')}
                >
                  Hot or Warm
                </ToggleButton>
                <ToggleButton
                  active={answers.handoffTrigger === 'hot'}
                  onClick={() => update('handoffTrigger', 'hot')}
                >
                  Hot only
                </ToggleButton>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Handoff message</Label>
              <div className="space-y-2">
                {(
                  [
                    { value: 'reach_out', label: "I'll get {name} to reach out to you directly." },
                    { value: 'connect', label: "Let me connect you with {name} right away." },
                    { value: 'follow_up', label: "I'll have {name} follow up with you shortly." },
                    { value: 'custom', label: 'Custom message' },
                  ] as const
                ).map((opt) => (
                  <ToggleButton
                    key={opt.value}
                    active={answers.handoffMessagePreset === opt.value}
                    onClick={() => update('handoffMessagePreset', opt.value)}
                    className="w-full text-left justify-start"
                  >
                    {opt.label}
                  </ToggleButton>
                ))}
              </div>

              {answers.handoffMessagePreset === 'custom' && (
                <Input
                  maxLength={100}
                  placeholder="Your custom handoff message (use {name} for agent name)"
                  value={answers.handoffMessageCustom ?? ''}
                  onChange={(e) => update('handoffMessageCustom', e.target.value)}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Preview */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Instruction Preview</CardTitle>
            <CardDescription>
              Claude synthesizes your choices into a clear instruction block. Edit freely before saving.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!preview ? (
              <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  'Generate instructions'
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <textarea
                  rows={12}
                  value={preview}
                  onChange={(e) => setPreview(e.target.value)}
                  className="w-full resize-y rounded-md border border-input bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button onClick={handleSave} disabled={isSaving || saved} className="w-full">
                  {saved ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Saved!
                    </>
                  ) : isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Confirm & Save'
                  )}
                </Button>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button onClick={() => setStep((s) => s + 1)}>
            Next
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
