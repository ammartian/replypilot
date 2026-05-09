import OpenAI from 'openai'

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getClient()
  const res = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return res.data[0].embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts.length) return []
  const client = getClient()
  const res = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  })
  return res.data.map((d) => d.embedding)
}
