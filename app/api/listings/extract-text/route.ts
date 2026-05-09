import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// pdf2json can hang indefinitely on scanned/image-only PDFs.
// Race against a 45s timeout and return empty string so the caller
// can treat it as an image-only file rather than crashing.
async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; timedOut: boolean }> {
  const PDFParser = (await import('pdf2json')).default

  const parse = new Promise<string>((resolve, reject) => {
    const parser = new PDFParser()
    parser.on('pdfParser_dataReady', (data: { Pages: Array<{ Texts: Array<{ R: Array<{ T: string }> }> }> }) => {
      const text = data.Pages.flatMap((page) =>
        page.Texts.flatMap((t) => t.R.map((r) => decodeURIComponent(r.T)))
      ).join(' ')
      resolve(text)
    })
    parser.on('pdfParser_dataError', (err: Error | { parserError: Error }) =>
      reject('parserError' in err ? err.parserError : err)
    )
    parser.parseBuffer(buffer)
  })

  const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 45_000))

  const result = await Promise.race([parse, timeout])
  if (result === 'timeout') return { text: '', timedOut: true }
  return { text: result, timedOut: false }
}

async function extractText(
  blob: Blob,
  fileType: string,
): Promise<{ text: string; warning?: string }> {
  if (fileType === 'application/pdf' || fileType.includes('pdf')) {
    const buffer = Buffer.from(await blob.arrayBuffer())
    const { text, timedOut } = await extractTextFromPdf(buffer)
    if (timedOut) {
      return {
        text: '',
        warning:
          'PDF parsing timed out — this is likely a scanned/image-only PDF. The file was saved but the AI will not be able to search its content. Convert to a text-based PDF or use Word/Excel instead.',
      }
    }
    if (!text.trim()) {
      return {
        text: '',
        warning: 'No text found in PDF — may be a scanned/image-only file. The AI will not be able to search its content.',
      }
    }
    return { text }
  }

  if (
    fileType.includes('word') ||
    fileType.includes('docx') ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const { default: mammoth } = await import('mammoth')
    const buffer = Buffer.from(await blob.arrayBuffer())
    const result = await mammoth.extractRawText({ buffer })
    return { text: result.value }
  }

  return { text: await blob.text() }
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

    const { text, warning } = await extractText(blob, fileType)
    return NextResponse.json({ text, chars: text.length, warning })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
