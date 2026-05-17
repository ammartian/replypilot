'use client'

import { useEffect, useState } from 'react'
import { Bold, Italic, Strikethrough, Code, List, ListOrdered } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FormattingToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>
  value: string
  onChange: (newValue: string) => void
  disabled?: boolean
}

export type WrapAction = { kind: 'wrap'; open: string; close: string }
export type LinePrefixAction = { kind: 'line-prefix'; prefix: 'bullet' | 'ordered' }
export type FormatAction = WrapAction | LinePrefixAction

// Returns whether the current selection/cursor is inside or around a formatted span
export function isActiveForAction(
  value: string,
  selRange: { start: number; end: number },
  action: FormatAction
): boolean {
  const { start, end } = selRange

  if (action.kind === 'wrap') {
    const { open, close } = action
    const selected = value.slice(start, end)
    // Case A: selection includes the delimiters
    if (
      selected.startsWith(open) &&
      selected.endsWith(close) &&
      selected.length > open.length + close.length
    ) return true
    // Case B: cursor/selection is the inner text, delimiters are just outside
    if (
      start >= open.length &&
      value.slice(start - open.length, start) === open &&
      value.slice(end, end + close.length) === close
    ) return true
    return false
  }

  // line-prefix
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  let lineEnd = value.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = value.length
  const lines = value.slice(lineStart, lineEnd).split('\n')

  if (action.prefix === 'bullet') {
    return lines.every(l => l.startsWith('- '))
  }
  return lines.every(l => /^\d+\. /.test(l))
}

function nativeInsert(
  textarea: HTMLTextAreaElement,
  selStart: number,
  selEnd: number,
  text: string
) {
  textarea.focus()
  textarea.setSelectionRange(selStart, selEnd)
  // Writes into the browser's native undo stack. No-op in jsdom (tests).
  if (typeof document.execCommand === 'function') {
    document.execCommand('insertText', false, text)
  }
}

function toggleFormat(
  textarea: HTMLTextAreaElement,
  value: string,
  selRange: { start: number; end: number },
  onChange: (v: string) => void,
  action: FormatAction
) {
  const { start, end } = selRange
  const active = isActiveForAction(value, selRange, action)

  if (action.kind === 'wrap') {
    const { open, close } = action

    if (active) {
      const selected = value.slice(start, end)
      // Case A: delimiters are inside the selection
      if (selected.startsWith(open) && selected.endsWith(close) && selected.length > open.length + close.length) {
        const inner = selected.slice(open.length, selected.length - close.length)
        nativeInsert(textarea, start, end, inner)
        onChange(value.slice(0, start) + inner + value.slice(end))
        return
      }
      // Case B: delimiters are outside the selection
      const outerStart = start - open.length
      const outerEnd = end + close.length
      const inner = value.slice(start, end)
      nativeInsert(textarea, outerStart, outerEnd, inner)
      onChange(value.slice(0, outerStart) + inner + value.slice(outerEnd))
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(outerStart, outerStart + inner.length)
      })
      return
    }

    // Apply
    if (start === end) {
      const next = value.slice(0, start) + open + close + value.slice(end)
      nativeInsert(textarea, start, end, open + close)
      onChange(next)
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(start + open.length, start + open.length)
      })
    } else {
      const selected = value.slice(start, end)
      const next = value.slice(0, start) + open + selected + close + value.slice(end)
      nativeInsert(textarea, start, end, open + selected + close)
      onChange(next)
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(start + open.length, start + open.length + selected.length)
      })
    }
    return
  }

  // line-prefix
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  let lineEnd = value.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = value.length
  const lines = value.slice(lineStart, lineEnd).split('\n')

  let result: string
  if (active) {
    // Remove prefix
    if (action.prefix === 'bullet') {
      result = lines.map(l => (l.startsWith('- ') ? l.slice(2) : l)).join('\n')
    } else {
      result = lines.map(l => l.replace(/^\d+\. /, '')).join('\n')
    }
  } else {
    // Apply prefix
    if (action.prefix === 'bullet') {
      result = lines.map(l => `- ${l}`).join('\n')
    } else {
      result = lines.map((l, i) => `${i + 1}. ${l}`).join('\n')
    }
  }

  const next = value.slice(0, lineStart) + result + value.slice(lineEnd)
  nativeInsert(textarea, lineStart, lineEnd, result)
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
  const [selRange, setSelRange] = useState({ start: 0, end: 0 })

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const update = () => setSelRange({ start: el.selectionStart, end: el.selectionEnd })
    el.addEventListener('select', update)
    el.addEventListener('keyup', update)
    el.addEventListener('mouseup', update)
    el.addEventListener('focus', update)
    return () => {
      el.removeEventListener('select', update)
      el.removeEventListener('keyup', update)
      el.removeEventListener('mouseup', update)
      el.removeEventListener('focus', update)
    }
  }, [textareaRef])

  return (
    <div className="flex items-center gap-0.5 px-1 py-1 border-b bg-neutral-50">
      {BUTTONS.map(({ title, Icon, action }) => {
        const active = !disabled && isActiveForAction(value, selRange, action)
        return (
          <Button
            key={title}
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', active && 'bg-neutral-200 text-neutral-900')}
            disabled={disabled}
            title={title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const el = textareaRef.current
              if (!el) return
              // Read live selection at click time (textarea kept focus via preventDefault)
              const live = { start: el.selectionStart, end: el.selectionEnd }
              toggleFormat(el, value, live, onChange, action)
            }}
          >
            <Icon className="w-3.5 h-3.5" />
          </Button>
        )
      })}
    </div>
  )
}
