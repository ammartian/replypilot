import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const PDFParser = (await import('pdf2json')).default
  return new Promise((resolve, reject) => {
    const parser = new PDFParser()
    parser.on('pdfParser_dataReady', (data: { Pages: Array<{ Texts: Array<{ R: Array<{ T: string }> }> }> }) => {
      const text = data.Pages.flatMap((page) =>
        page.Texts.flatMap((t) => t.R.map((r) => decodeURIComponent(r.T)))
      ).join(' ')
      resolve(text)
    })
    parser.on('pdfParser_dataError', (err: Error | { parserError: Error }) => reject('parserError' in err ? err.parserError : err))
    parser.parseBuffer(buffer)
  })
}

async function extractText(blob: Blob, fileType: string): Promise<string> {
  if (fileType === 'application/pdf' || fileType.includes('pdf')) {
    const buffer = Buffer.from(await blob.arrayBuffer())
    return extractTextFromPdf(buffer)
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

  try {
    const text = await extractText(blob, fileType)
    return NextResponse.json({ text })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
