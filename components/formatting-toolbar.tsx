'use client'

import { Bold, Italic, Strikethrough, Code, List, ListOrdered } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FormattingToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  value: string
  onChange: (newValue: string) => void
  disabled?: boolean
}

type WrapAction = { kind: 'wrap'; open: string; close: string }
type LinePrefixAction = { kind: 'line-prefix'; prefix: 'bullet' | 'ordered' }
type FormatAction = WrapAction | LinePrefixAction

function applyFormat(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  action: FormatAction
) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  if (action.kind === 'wrap') {
    const { open, close } = action
    if (start === end) {
      // No selection — insert delimiters at cursor
      const next = value.slice(0, start) + open + close + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(start + open.length, start + open.length)
      })
    } else {
      const selected = value.slice(start, end)
      const next = value.slice(0, start) + open + selected + close + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(start + open.length, start + open.length + selected.length)
      })
    }
    return
  }

  // line-prefix
  // Expand selection to cover full lines
  let lineStart = value.lastIndexOf('\n', start - 1) + 1
  let lineEnd = value.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = value.length

  const selectedText = value.slice(lineStart, lineEnd)
  const lines = selectedText.split('\n')

  let prefixed: string
  if (action.prefix === 'bullet') {
    prefixed = lines.map(l => `- ${l}`).join('\n')
  } else {
    prefixed = lines.map((l, i) => `${i + 1}. ${l}`).join('\n')
  }

  const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd)
  onChange(next)
  requestAnimationFrame(() => textarea.focus())
}

const BUTTONS: {
  title: string
  Icon: React.FC<{ className?: string }>
  action: FormatAction
}[] = [
  { title: 'Bold', Icon: Bold, action: { kind: 'wrap', open: '*', close: '*' } },
  { title: 'Italic', Icon: Italic, action: { kind: 'wrap', open: '_', close: '_' } },
  { title: 'Strikethrough', Icon: Strikethrough, action: { kind: 'wrap', open: '~', close: '~' } },
  { title: 'Code', Icon: Code, action: { kind: 'wrap', open: '`', close: '`' } },
  { title: 'Bullet list', Icon: List, action: { kind: 'line-prefix', prefix: 'bullet' } },
  { title: 'Ordered list', Icon: ListOrdered, action: { kind: 'line-prefix', prefix: 'ordered' } },
]

export function FormattingToolbar({ textareaRef, value, onChange, disabled }: FormattingToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 px-1 py-1 border-b bg-neutral-50">
      {BUTTONS.map(({ title, Icon, action }) => (
        <Button
          key={title}
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={disabled}
          title={title}
          onClick={() => {
            if (textareaRef.current) {
              applyFormat(textareaRef.current, value, onChange, action)
            }
          }}
        >
          <Icon className="w-3.5 h-3.5" />
        </Button>
      ))}
    </div>
  )
}
