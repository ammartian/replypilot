'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Check, Loader2, RefreshCw } from 'lucide-react'
import { shouldShowWizard } from '@/lib/ai-config'
import type { WizardAnswers } from '@/lib/ai-config'
import { AiWizard } from '@/components/ai-wizard'

export default function AiSettingsPage() {
  const agent = useQuery(api.agents.getAgent)
  const saveAiConfig = useMutation(api.agents.saveAiConfig)
  const router = useRouter()

  const [isRegenerateFlow, setIsRegenerateFlow] = useState(false)
  const [editedInstructions, setEditedInstructions] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (agent?.aiConfig?.generatedInstructions) {
      setEditedInstructions(agent.aiConfig.generatedInstructions)
    }
  }, [agent])

  async function handleEditSave() {
    setIsSaving(true)
    setError(null)
    try {
      await saveAiConfig({
        industry: (agent?.aiConfig?.wizardAnswers as WizardAnswers | undefined)?.industry ?? 'other',
        wizardAnswers: agent?.aiConfig?.wizardAnswers ?? {},
        generatedInstructions: editedInstructions,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
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

  const pageHeader = (onBack: () => void) => (
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="text-neutral-400 hover:text-neutral-600 transition-colors">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <h1 className="text-2xl font-bold">AI Behavior</h1>
    </div>
  )

  // Edit View
  if (!shouldShowWizard(!!agent?.aiConfig, isRegenerateFlow)) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        {pageHeader(() => router.push('/dashboard/settings'))}
        <Card>
          <CardHeader>
            <CardTitle>AI Instructions</CardTitle>
            <CardDescription>
              Edit your AI&apos;s instructions directly and save, or start the setup flow again to regenerate them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              rows={14}
              value={editedInstructions}
              onChange={(e) => { setEditedInstructions(e.target.value); setSaved(false) }}
              className="w-full resize-y rounded-md border border-input bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleEditSave} disabled={isSaving || !editedInstructions.trim()} className="w-full">
              {saved ? (
                <><Check className="w-4 h-4 mr-2" />Saved!</>
              ) : isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : 'Save'}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-4">
          <Separator className="mb-4" />
          <Button
            variant="outline"
            className="w-full gap-2 text-neutral-500"
            onClick={() => { setIsRegenerateFlow(true); setError(null); setSaved(false) }}
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate flow
          </Button>
        </div>
      </div>
    )
  }

  // Wizard View
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {pageHeader(() => {
        if (isRegenerateFlow) {
          setIsRegenerateFlow(false)
        } else {
          router.push('/dashboard/settings')
        }
      })}
      <AiWizard
        initialAnswers={agent?.aiConfig?.wizardAnswers as WizardAnswers | undefined}
        onSaved={(instructions) => {
          setEditedInstructions(instructions)
          setIsRegenerateFlow(false)
        }}
      />
    </div>
  )
}
