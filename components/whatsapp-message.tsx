import { cn } from '@/lib/utils'
import {
  parseWhatsAppFormat,
  type InlineNode,
  type BlockNode,
  type BulletListNode,
  type OrderedListNode,
} from '@/lib/whatsapp-format'

interface WhatsAppMessageProps {
  content: string
  className?: string
}

function renderInline(node: InlineNode, key: number): React.ReactNode {
  switch (node.type) {
    case 'text':
      return node.value
    case 'bold':
      return <strong key={key} className="font-semibold">{node.children.map(renderInline)}</strong>
    case 'italic':
      return <em key={key} className="italic">{node.children.map(renderInline)}</em>
    case 'strike':
      return <del key={key} className="line-through">{node.children.map(renderInline)}</del>
    case 'code':
      return <code key={key} className="font-mono text-[0.9em] bg-black/10 rounded px-0.5">{node.value}</code>
  }
}

function renderBlock(block: BlockNode, key: number): React.ReactNode {
  switch (block.type) {
    case 'paragraph':
      if (block.children.length === 0) {
        return <p key={key} className="h-[1em]" />
      }
      return (
        <p key={key} className="whitespace-pre-wrap">
          {block.children.map(renderInline)}
        </p>
      )
    case 'bullet-list':
      return (
        <ul key={key} className="list-disc pl-4 space-y-0.5">
          {(block as BulletListNode).items.map((item, i) => (
            <li key={i}>{item.children.map(renderInline)}</li>
          ))}
        </ul>
      )
    case 'ordered-list':
      return (
        <ol key={key} className="list-decimal pl-4 space-y-0.5">
          {(block as OrderedListNode).items.map((item, i) => (
            <li key={i}>{item.children.map(renderInline)}</li>
          ))}
        </ol>
      )
  }
}

export function WhatsAppMessage({ content, className }: WhatsAppMessageProps) {
  const doc = parseWhatsAppFormat(content)
  return (
    <div className={cn('text-sm leading-relaxed space-y-1', className)}>
      {doc.blocks.map(renderBlock)}
    </div>
  )
}
