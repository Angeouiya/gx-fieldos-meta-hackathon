import type { PDFDocumentProxy } from 'pdfjs-dist'
import { cleanGXControl, GX_DOCUMENT_MAX_CHARS, GX_DOCUMENT_MAX_OFFICE_BYTES, GX_DOCUMENT_MAX_PAGES, GX_DOCUMENT_MAX_PDF_BYTES, GX_DOCUMENT_MAX_TEXT_BYTES, type GXDocumentExcerpt } from './gx-document-context'

export type GXDocumentErrorCode = 'format' | 'size' | 'empty' | 'unreadable'

export class GXDocumentError extends Error {
  constructor(readonly code: GXDocumentErrorCode, cause?: unknown) { super(code, { cause }) }
}

export async function extractGXDocument(file: File, options: { workerSrc?: string; language?: 'fr' | 'en' } = {}): Promise<GXDocumentExcerpt> {
  const sourceName = cleanGXControl(file.name).trim()
  const extension = sourceName.match(/\.(pdf|docx|pptx|xlsx|txt|md|csv|json)$/i)?.[0] ?? ''
  const name = sourceName.length > 80 ? `${sourceName.slice(0, 80 - extension.length)}${extension}` : sourceName
  const pdf = /\.pdf$/i.test(name)
  const officeFormat = name.match(/\.(docx|pptx|xlsx)$/i)?.[1]?.toLowerCase() as 'docx' | 'pptx' | 'xlsx' | undefined
  if (!pdf && !officeFormat && !/\.(txt|md|csv|json)$/i.test(name)) throw new GXDocumentError('format')
  if (file.size === 0) throw new GXDocumentError('empty')
  if (file.size > (pdf ? GX_DOCUMENT_MAX_PDF_BYTES : officeFormat ? GX_DOCUMENT_MAX_OFFICE_BYTES : GX_DOCUMENT_MAX_TEXT_BYTES)) throw new GXDocumentError('size')

  if (officeFormat) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) throw new GXDocumentError('format')
    try {
      const { extractGXOfficeText } = await import('./gx-office-extract')
      const result = await extractGXOfficeText(bytes, officeFormat, options.language)
      if (!result) throw new GXDocumentError('format')
      if (!result.excerpt.trim()) throw new GXDocumentError('empty')
      return { name, ...result }
    } catch (error) {
      if (error instanceof GXDocumentError) throw error
      throw new GXDocumentError('unreadable', error)
    }
  }

  if (!pdf) {
    const text = (await file.text()).split(String.fromCodePoint(0)).join('').trim()
    if (!text) throw new GXDocumentError('empty')
    return { name, excerpt: text.slice(0, GX_DOCUMENT_MAX_CHARS), truncated: text.length > GX_DOCUMENT_MAX_CHARS }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw new GXDocumentError('format')

  let document: PDFDocumentProxy | null = null
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = options.workerSrc ?? new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()
    document = await pdfjs.getDocument({ data: bytes }).promise
    const parts: string[] = []
    let characters = 0
    let pagesRead = 0
    let truncated = document.numPages > GX_DOCUMENT_MAX_PAGES
    const limit = Math.min(document.numPages, GX_DOCUMENT_MAX_PAGES)

    for (let pageNumber = 1; pageNumber <= limit; pageNumber++) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const text = content.items.map((item) => 'str' in item ? item.str : '').join(' ').replace(/\s+/g, ' ').trim()
      pagesRead = pageNumber
      if (!text) continue
      const prefix = `[Page ${pageNumber}] `
      const remaining = GX_DOCUMENT_MAX_CHARS - characters - prefix.length
      if (remaining <= 0) { truncated = true; break }
      parts.push(`${prefix}${text.slice(0, remaining)}`)
      characters += prefix.length + Math.min(text.length, remaining) + 1
      if (text.length > remaining || characters >= GX_DOCUMENT_MAX_CHARS) { truncated = true; break }
    }

    const excerpt = parts.join('\n').trim()
    if (!excerpt) throw new GXDocumentError('empty')
    return { name, excerpt, pagesRead, totalPages: document.numPages, truncated }
  } catch (error) {
    if (error instanceof GXDocumentError) throw error
    throw new GXDocumentError('unreadable', error)
  } finally {
    if (document) await document.destroy().catch(() => undefined)
  }
}
