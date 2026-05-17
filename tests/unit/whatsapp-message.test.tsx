import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatsAppMessage } from '../../components/whatsapp-message'

describe('WhatsAppMessage', () => {
  it('renders plain text without extra markup', () => {
    render(<WhatsAppMessage content="hello world" />)
    expect(screen.getByText('hello world')).toBeTruthy()
  })

  it('renders <strong> for bold syntax', () => {
    const { container } = render(<WhatsAppMessage content="*bold*" />)
    expect(container.querySelector('strong')).toBeTruthy()
    expect(container.querySelector('strong')!.textContent).toBe('bold')
  })

  it('renders <em> for italic syntax', () => {
    const { container } = render(<WhatsAppMessage content="_italic_" />)
    expect(container.querySelector('em')).toBeTruthy()
    expect(container.querySelector('em')!.textContent).toBe('italic')
  })

  it('renders <del> for strikethrough syntax', () => {
    const { container } = render(<WhatsAppMessage content="~strike~" />)
    expect(container.querySelector('del')).toBeTruthy()
    expect(container.querySelector('del')!.textContent).toBe('strike')
  })

  it('renders <code> for monospace syntax', () => {
    const { container } = render(<WhatsAppMessage content="`code`" />)
    expect(container.querySelector('code')).toBeTruthy()
    expect(container.querySelector('code')!.textContent).toBe('code')
  })

  it('renders <ul><li> for bullet list', () => {
    const { container } = render(<WhatsAppMessage content={"- one\n- two"} />)
    expect(container.querySelector('ul')).toBeTruthy()
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toBe('one')
    expect(items[1].textContent).toBe('two')
  })

  it('renders <ol><li> for ordered list', () => {
    const { container } = render(<WhatsAppMessage content={"1. first\n2. second"} />)
    expect(container.querySelector('ol')).toBeTruthy()
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(2)
  })

  it('raw delimiters not visible for recognized formatting', () => {
    const { container } = render(<WhatsAppMessage content="*bold*" />)
    expect(container.textContent).not.toContain('*')
  })

  it('className prop forwarded to wrapper div', () => {
    const { container } = render(<WhatsAppMessage content="text" className="custom-class" />)
    expect(container.firstElementChild?.classList.contains('custom-class')).toBe(true)
  })

  it('nested bold+italic renders strong > em', () => {
    const { container } = render(<WhatsAppMessage content="*_bold italic_*" />)
    const strong = container.querySelector('strong')
    expect(strong).toBeTruthy()
    expect(strong!.querySelector('em')).toBeTruthy()
  })

  it('code content not further parsed', () => {
    const { container } = render(<WhatsAppMessage content="`*raw*`" />)
    const code = container.querySelector('code')
    expect(code).toBeTruthy()
    expect(code!.textContent).toBe('*raw*')
    expect(container.querySelector('strong')).toBeNull()
  })

  it('empty string renders without error', () => {
    const { container } = render(<WhatsAppMessage content="" />)
    expect(container.firstElementChild).toBeTruthy()
  })
})
