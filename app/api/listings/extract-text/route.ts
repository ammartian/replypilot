import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

async function extractText(blob: Blob, fileType: string): Promise<string> {
  if (fileType === 'application/pdf' || fileType.includes('pdf')) {
    const { PDFParse } = await import('pdf-parse')
    const buffer = Buffer.from(await blob.arrayBuffer())
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    return result.text
  }

  if (
    fileType.includes('word') ||
    fileType.includes('docx') ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const { default: mammoth } = await import('mammoth')
    const buffer = Buffer.from(await blob.arrayBuffer())
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  return blob.text()
}

export async function POST(req: NextRequest) {
  const { fileUrl, fileType } = await req.json()

  if (!fileUrl || !fileType) {
    return NextResponse.json({ error: 'Missing fileUrl or fileType' }, { status: 400 })
  }

  const fileRes = await fetch(fileUrl)
  if (!fileRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 502 })
  }

  const blob = await fileRes.blob()
  const text = await extractText(blob, fileType)

  return NextResponse.json({ text })
}
