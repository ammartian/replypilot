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
  try {
    let blob: Blob
    let fileType: string

    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
      blob = file
      fileType = file.type
    } else {
      const { fileUrl, fileType: ft } = await req.json()
      if (!fileUrl || !ft) return NextResponse.json({ error: 'Missing fileUrl or fileType' }, { status: 400 })
      const fileRes = await fetch(fileUrl)
      if (!fileRes.ok) return NextResponse.json({ error: 'Failed to fetch file' }, { status: 502 })
      blob = await fileRes.blob()
      fileType = ft
    }

    const text = await extractText(blob, fileType)
    return NextResponse.json({ text, chars: text.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
