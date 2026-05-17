export type TextNode = { type: 'text'; value: string }
export type BoldNode = { type: 'bold'; children: InlineNode[] }
export type ItalicNode = { type: 'italic'; children: InlineNode[] }
export type StrikeNode = { type: 'strike'; children: InlineNode[] }
export type CodeNode = { type: 'code'; value: string }
export type InlineNode = TextNode | BoldNode | ItalicNode | StrikeNode | CodeNode

export type ParagraphNode = { type: 'paragraph'; children: InlineNode[] }
export type BulletItemNode = { type: 'bullet-item'; children: InlineNode[] }
export type OrderedItemNode = { type: 'ordered-item'; index: number; children: InlineNode[] }
export type BulletListNode = { type: 'bullet-list'; items: BulletItemNode[] }
export type OrderedListNode = { type: 'ordered-list'; items: OrderedItemNode[] }
export type BlockNode = ParagraphNode | BulletListNode | OrderedListNode

export type WhatsAppDocument = { blocks: BlockNode[] }

const BULLET_RE = /^[-•]\s+(.+)/
const ORDERED_RE = /^(\d+)\.\s+(.+)/

type RawLine =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'ordered'; index: number; text: string }

function classifyLine(line: string): RawLine {
  const bulletMatch = BULLET_RE.exec(line)
  if (bulletMatch) return { kind: 'bullet', text: bulletMatch[1] }
  const orderedMatch = ORDERED_RE.exec(line)
  if (orderedMatch) return { kind: 'ordered', index: parseInt(orderedMatch[1], 10), text: orderedMatch[2] }
  return { kind: 'paragraph', text: line }
}

// --- Inline parser ---

const DELIMITERS: Record<string, string> = { '*': '*', '_': '_', '~': '~' }
const DELIMITER_TYPES: Record<string, 'bold' | 'italic' | 'strike'> = {
  '*': 'bold',
  '_': 'italic',
  '~': 'strike',
}

function parseInline(text: string): InlineNode[] {
  return parseInlineAt(text, 0, null).nodes
}

function parseInlineAt(
  text: string,
  start: number,
  closeDelim: string | null
): { nodes: InlineNode[]; end: number } {
  const nodes: InlineNode[] = []
  let i = start
  let textBuf = ''

  function flushText() {
    if (textBuf) {
      nodes.push({ type: 'text', value: textBuf })
      textBuf = ''
    }
  }

  while (i < text.length) {
    const ch = text[i]

    // Check if this is the closing delimiter we're looking for
    if (closeDelim && ch === closeDelim) {
      flushText()
      return { nodes, end: i + 1 }
    }

    // Backtick code span — highest priority, no nesting
    if (ch === '`') {
      const closeIdx = text.indexOf('`', i + 1)
      if (closeIdx !== -1) {
        flushText()
        nodes.push({ type: 'code', value: text.slice(i + 1, closeIdx) })
        i = closeIdx + 1
        continue
      }
    }

    // Inline formatting delimiters
    if (DELIMITERS[ch]) {
      const next = text[i + 1]
      // Must not be followed by a space (WhatsApp rule: no space after opener)
      if (next !== ' ' && next !== undefined && next !== ch) {
        // Check if a matching close exists ahead (not immediately — empty spans forbidden)
        const closeIdx = findClose(text, i + 1, ch)
        if (closeIdx !== -1) {
          flushText()
          const inner = parseInlineAt(text, i + 1, ch)
          const nodeType = DELIMITER_TYPES[ch]
          nodes.push({ type: nodeType, children: inner.nodes } as BoldNode | ItalicNode | StrikeNode)
          i = inner.end // inner.end is already past the closing delimiter
          continue
        }
      }
    }

    textBuf += ch
    i++
  }

  flushText()
  return { nodes, end: i }
}

function findClose(text: string, from: number, delim: string): number {
  // Find first occurrence of delim that is not at position `from` (empty span)
  // and is preceded by a non-space char
  for (let i = from; i < text.length; i++) {
    if (text[i] === delim) {
      // Ensure not empty (from === i means nothing between open and close)
      if (i === from) return -1
      return i
    }
    // Backtick skips its content
    if (text[i] === '`') {
      const closeBack = text.indexOf('`', i + 1)
      if (closeBack !== -1) i = closeBack
    }
  }
  return -1
}

// --- Block grouping ---

export function parseWhatsAppFormat(content: string): WhatsAppDocument {
  if (!content) return { blocks: [] }

  const lines = content.split('\n')
  const rawLines = lines.map(classifyLine)

  const blocks: BlockNode[] = []
  let i = 0

  while (i < rawLines.length) {
    const raw = rawLines[i]

    if (raw.kind === 'bullet') {
      const items: BulletItemNode[] = []
      while (i < rawLines.length && rawLines[i].kind === 'bullet') {
        items.push({ type: 'bullet-item', children: parseInline((rawLines[i] as { kind: 'bullet'; text: string }).text) })
        i++
      }
      blocks.push({ type: 'bullet-list', items })
      continue
    }

    if (raw.kind === 'ordered') {
      const items: OrderedItemNode[] = []
      while (i < rawLines.length && rawLines[i].kind === 'ordered') {
        const r = rawLines[i] as { kind: 'ordered'; index: number; text: string }
        items.push({ type: 'ordered-item', index: r.index, children: parseInline(r.text) })
        i++
      }
      blocks.push({ type: 'ordered-list', items })
      continue
    }

    // paragraph
    const r = raw as { kind: 'paragraph'; text: string }
    blocks.push({ type: 'paragraph', children: parseInline(r.text) })
    i++
  }

  return { blocks }
}
