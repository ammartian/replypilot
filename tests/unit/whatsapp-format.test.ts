import { describe, it, expect } from 'vitest'
import { parseWhatsAppFormat } from '../../lib/whatsapp-format'

describe('parseWhatsAppFormat', () => {
  // Plain text
  it('plain text → single ParagraphNode with TextNode', () => {
    const doc = parseWhatsAppFormat('hello world')
    expect(doc.blocks).toHaveLength(1)
    expect(doc.blocks[0].type).toBe('paragraph')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    expect(p.children).toHaveLength(1)
    expect(p.children[0]).toEqual({ type: 'text', value: 'hello world' })
  })

  it('empty string → no blocks', () => {
    const doc = parseWhatsAppFormat('')
    expect(doc.blocks).toHaveLength(0)
  })

  it('blank line only → one empty ParagraphNode', () => {
    const doc = parseWhatsAppFormat('\n')
    // two lines: '' and '' — both empty paragraphs
    expect(doc.blocks.length).toBeGreaterThanOrEqual(1)
    const p = doc.blocks[0] as { type: string; children: unknown[] }
    expect(p.type).toBe('paragraph')
    expect(p.children).toHaveLength(0)
  })

  // Bold
  it('*hello* → BoldNode', () => {
    const doc = parseWhatsAppFormat('*hello*')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    expect(p.children[0]).toMatchObject({ type: 'bold', children: [{ type: 'text', value: 'hello' }] })
  })

  it('*text with no closing star → literal text', () => {
    const doc = parseWhatsAppFormat('*hello')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    expect(p.children[0]).toEqual({ type: 'text', value: '*hello' })
  })

  it('* leading space → literal', () => {
    const doc = parseWhatsAppFormat('* hello')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    expect(p.children[0]).toEqual({ type: 'text', value: '* hello' })
  })

  it('** empty delimiters → literal', () => {
    const doc = parseWhatsAppFormat('**')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    // Should be literal text, not a BoldNode with empty children
    const hasNoEmptyBold = p.children.every(
      (c: unknown) => (c as { type: string }).type !== 'bold'
    )
    expect(hasNoEmptyBold).toBe(true)
  })

  // Italic
  it('_hello_ → ItalicNode', () => {
    const doc = parseWhatsAppFormat('_hello_')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    expect(p.children[0]).toMatchObject({ type: 'italic', children: [{ type: 'text', value: 'hello' }] })
  })

  it('_no closing underscore → literal', () => {
    const doc = parseWhatsAppFormat('_hello')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    expect(p.children[0]).toEqual({ type: 'text', value: '_hello' })
  })

  // Strike
  it('~hello~ → StrikeNode', () => {
    const doc = parseWhatsAppFormat('~hello~')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    expect(p.children[0]).toMatchObject({ type: 'strike', children: [{ type: 'text', value: 'hello' }] })
  })

  // Code
  it('`code` → CodeNode with raw value', () => {
    const doc = parseWhatsAppFormat('`code here`')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    expect(p.children[0]).toEqual({ type: 'code', value: 'code here' })
  })

  it('`*bold inside code*` → CodeNode (no inner parsing)', () => {
    const doc = parseWhatsAppFormat('`*bold inside code*`')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    expect(p.children[0]).toEqual({ type: 'code', value: '*bold inside code*' })
  })

  // Nested inline
  it('*_bold italic_* → BoldNode > ItalicNode', () => {
    const doc = parseWhatsAppFormat('*_bold italic_*')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    const bold = p.children[0] as { type: string; children: unknown[] }
    expect(bold.type).toBe('bold')
    const italic = bold.children[0] as { type: string; children: unknown[] }
    expect(italic.type).toBe('italic')
    expect(italic.children[0]).toEqual({ type: 'text', value: 'bold italic' })
  })

  it('*hello _world_* → BoldNode with TextNode + ItalicNode inside', () => {
    const doc = parseWhatsAppFormat('*hello _world_*')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    const bold = p.children[0] as { type: string; children: unknown[] }
    expect(bold.type).toBe('bold')
    expect(bold.children).toHaveLength(2)
    expect(bold.children[0]).toEqual({ type: 'text', value: 'hello ' })
    expect((bold.children[1] as { type: string }).type).toBe('italic')
  })

  // Multiline / newlines
  it('two lines → two ParagraphNodes', () => {
    const doc = parseWhatsAppFormat('line1\nline2')
    expect(doc.blocks).toHaveLength(2)
    expect(doc.blocks[0].type).toBe('paragraph')
    expect(doc.blocks[1].type).toBe('paragraph')
  })

  it('line1 + blank line + line3 → three ParagraphNodes', () => {
    const doc = parseWhatsAppFormat('line1\n\nline3')
    expect(doc.blocks).toHaveLength(3)
    const middle = doc.blocks[1] as { type: string; children: unknown[] }
    expect(middle.children).toHaveLength(0)
  })

  // Bullet lists
  it('- item one\\n- item two → BulletListNode with 2 items', () => {
    const doc = parseWhatsAppFormat('- item one\n- item two')
    expect(doc.blocks).toHaveLength(1)
    expect(doc.blocks[0].type).toBe('bullet-list')
    const list = doc.blocks[0] as { type: string; items: unknown[] }
    expect(list.items).toHaveLength(2)
  })

  it('• item (bullet char) → BulletListNode', () => {
    const doc = parseWhatsAppFormat('• item')
    expect(doc.blocks[0].type).toBe('bullet-list')
  })

  it('para before and after list → [ParagraphNode, BulletListNode, ParagraphNode]', () => {
    const doc = parseWhatsAppFormat('intro\n- item\noutro')
    expect(doc.blocks).toHaveLength(3)
    expect(doc.blocks[0].type).toBe('paragraph')
    expect(doc.blocks[1].type).toBe('bullet-list')
    expect(doc.blocks[2].type).toBe('paragraph')
  })

  // Ordered lists
  it('1. a\\n2. b → OrderedListNode with 2 items', () => {
    const doc = parseWhatsAppFormat('1. a\n2. b')
    expect(doc.blocks).toHaveLength(1)
    expect(doc.blocks[0].type).toBe('ordered-list')
    const list = doc.blocks[0] as { type: string; items: unknown[] }
    expect(list.items).toHaveLength(2)
  })

  it('ordered item index matches number', () => {
    const doc = parseWhatsAppFormat('3. third')
    const list = doc.blocks[0] as { type: string; items: { index: number }[] }
    expect(list.items[0].index).toBe(3)
  })

  it('split ordered lists (non-consecutive) → two OrderedListNodes', () => {
    const doc = parseWhatsAppFormat('1. first\npara\n2. second')
    expect(doc.blocks).toHaveLength(3)
    expect(doc.blocks[0].type).toBe('ordered-list')
    expect(doc.blocks[1].type).toBe('paragraph')
    expect(doc.blocks[2].type).toBe('ordered-list')
  })

  // Mixed inline in list items
  it('list item with bold inline → BulletListNode > BulletItemNode > BoldNode', () => {
    const doc = parseWhatsAppFormat('- *bold item*')
    const list = doc.blocks[0] as { type: string; items: { children: unknown[] }[] }
    expect(list.items[0].children[0]).toMatchObject({ type: 'bold' })
  })

  // Mixed content
  it('*bold* and _italic_ and ~strike~ → 5 inline nodes in paragraph', () => {
    const doc = parseWhatsAppFormat('*bold* and _italic_ and ~strike~')
    const p = doc.blocks[0] as { type: 'paragraph'; children: unknown[] }
    // bold, ' and ', italic, ' and ', strike
    expect(p.children).toHaveLength(5)
    expect((p.children[0] as { type: string }).type).toBe('bold')
    expect((p.children[1] as { type: string; value: string })).toEqual({ type: 'text', value: ' and ' })
    expect((p.children[2] as { type: string }).type).toBe('italic')
    expect((p.children[4] as { type: string }).type).toBe('strike')
  })
})
