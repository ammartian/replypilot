type ChunkOptions = {
  overlap?: boolean
}

export function chunkText(text: string, maxSize: number, options: ChunkOptions = {}): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  // Split on sentence boundaries
  const sentenceRe = /(?<=[.!?])\s+/
  const sentences = trimmed.split(sentenceRe).map((s) => s.trim()).filter(Boolean)

  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    // Hard-split sentences that exceed maxSize on their own
    if (sentence.length > maxSize) {
      if (current) {
        chunks.push(current.trim())
        current = ''
      }
      for (let i = 0; i < sentence.length; i += maxSize) {
        chunks.push(sentence.slice(i, i + maxSize))
      }
      continue
    }

    const candidate = current ? `${current} ${sentence}` : sentence
    if (candidate.length <= maxSize) {
      current = candidate
    } else {
      if (current) chunks.push(current.trim())
      current = sentence
    }
  }

  if (current) chunks.push(current.trim())

  if (!options.overlap || chunks.length <= 1) return chunks

  // Add ~10% overlap: append first sentence of next chunk to current
  return chunks.map((chunk, i) => {
    if (i === chunks.length - 1) return chunk
    const nextFirst = chunks[i + 1].split(/(?<=[.!?])\s+/)[0]
    return `${chunk} ${nextFirst}`
  })
}
