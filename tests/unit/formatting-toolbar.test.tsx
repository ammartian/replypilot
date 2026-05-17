import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import { FormattingToolbar } from '../../components/formatting-toolbar'

function makeTextarea(value: string, selStart = 0, selEnd = 0) {
  const el = document.createElement('textarea')
  el.value = value
  el.selectionStart = selStart
  el.selectionEnd = selEnd
  document.body.appendChild(el)
  return el
}

describe('FormattingToolbar', () => {
  let textarea: HTMLTextAreaElement
  let ref: React.RefObject<HTMLTextAreaElement>
  let onChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    document.body.innerHTML = ''
    textarea = makeTextarea('')
    ref = createRef<HTMLTextAreaElement>()
    ;(ref as { current: HTMLTextAreaElement }).current = textarea
    onChange = vi.fn()
  })

  it('renders Bold, Italic, Strikethrough, Code, Bullet, Ordered buttons', () => {
    render(
      <FormattingToolbar textareaRef={ref} value="" onChange={onChange} />
    )
    expect(screen.getByTitle('Bold')).toBeTruthy()
    expect(screen.getByTitle('Italic')).toBeTruthy()
    expect(screen.getByTitle('Strikethrough')).toBeTruthy()
    expect(screen.getByTitle('Code')).toBeTruthy()
    expect(screen.getByTitle('Bullet list')).toBeTruthy()
    expect(screen.getByTitle('Ordered list')).toBeTruthy()
  })

  it('all buttons disabled when disabled prop is true', () => {
    render(
      <FormattingToolbar textareaRef={ref} value="" onChange={onChange} disabled />
    )
    const buttons = screen.getAllByRole('button')
    buttons.forEach(btn => expect(btn).toBeDisabled())
  })

  // Wrap: no selection
  it('Bold click with no selection → inserts ** at cursor, onChange called', () => {
    textarea.value = 'hello'
    textarea.selectionStart = 5
    textarea.selectionEnd = 5
    render(<FormattingToolbar textareaRef={ref} value="hello" onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Bold'))
    expect(onChange).toHaveBeenCalledWith('hello**')
  })

  it('Italic click with no selection → inserts __ at cursor', () => {
    textarea.value = 'hello'
    textarea.selectionStart = 5
    textarea.selectionEnd = 5
    render(<FormattingToolbar textareaRef={ref} value="hello" onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Italic'))
    expect(onChange).toHaveBeenCalledWith('hello__')
  })

  it('Strikethrough click with no selection → inserts ~~ at cursor', () => {
    textarea.value = 'hello'
    textarea.selectionStart = 5
    textarea.selectionEnd = 5
    render(<FormattingToolbar textareaRef={ref} value="hello" onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Strikethrough'))
    expect(onChange).toHaveBeenCalledWith('hello~~')
  })

  it('Code click with no selection → inserts `` at cursor', () => {
    textarea.value = 'hello'
    textarea.selectionStart = 5
    textarea.selectionEnd = 5
    render(<FormattingToolbar textareaRef={ref} value="hello" onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Code'))
    expect(onChange).toHaveBeenCalledWith('hello``')
  })

  // Wrap: with selection
  it('Bold click with selection → wraps selected text', () => {
    textarea.value = 'hello world'
    textarea.selectionStart = 6
    textarea.selectionEnd = 11 // 'world'
    render(<FormattingToolbar textareaRef={ref} value="hello world" onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Bold'))
    expect(onChange).toHaveBeenCalledWith('hello *world*')
  })

  it('Italic click with selection → wraps with underscores', () => {
    textarea.value = 'hello world'
    textarea.selectionStart = 6
    textarea.selectionEnd = 11
    render(<FormattingToolbar textareaRef={ref} value="hello world" onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Italic'))
    expect(onChange).toHaveBeenCalledWith('hello _world_')
  })

  it('Strikethrough click with selection → wraps with tildes', () => {
    textarea.value = 'hello world'
    textarea.selectionStart = 6
    textarea.selectionEnd = 11
    render(<FormattingToolbar textareaRef={ref} value="hello world" onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Strikethrough'))
    expect(onChange).toHaveBeenCalledWith('hello ~world~')
  })

  it('Code click with selection → wraps with backticks', () => {
    textarea.value = 'hello world'
    textarea.selectionStart = 6
    textarea.selectionEnd = 11
    render(<FormattingToolbar textareaRef={ref} value="hello world" onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Code'))
    expect(onChange).toHaveBeenCalledWith('hello `world`')
  })

  // Line prefix
  it('Bullet click → prefixes current line with "- "', () => {
    textarea.value = 'hello world'
    textarea.selectionStart = 5
    textarea.selectionEnd = 5
    render(<FormattingToolbar textareaRef={ref} value="hello world" onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Bullet list'))
    expect(onChange).toHaveBeenCalledWith('- hello world')
  })

  it('Ordered click → prefixes current line with "1. "', () => {
    textarea.value = 'hello world'
    textarea.selectionStart = 5
    textarea.selectionEnd = 5
    render(<FormattingToolbar textareaRef={ref} value="hello world" onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Ordered list'))
    expect(onChange).toHaveBeenCalledWith('1. hello world')
  })

  it('Bullet click on multiline selection → prefixes each line', () => {
    const value = 'line one\nline two\nline three'
    textarea.value = value
    textarea.selectionStart = 0
    textarea.selectionEnd = value.length
    render(<FormattingToolbar textareaRef={ref} value={value} onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Bullet list'))
    expect(onChange).toHaveBeenCalledWith('- line one\n- line two\n- line three')
  })

  it('Ordered click on multiline selection → prefixes each line sequentially', () => {
    const value = 'line one\nline two\nline three'
    textarea.value = value
    textarea.selectionStart = 0
    textarea.selectionEnd = value.length
    render(<FormattingToolbar textareaRef={ref} value={value} onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Ordered list'))
    expect(onChange).toHaveBeenCalledWith('1. line one\n2. line two\n3. line three')
  })
})
