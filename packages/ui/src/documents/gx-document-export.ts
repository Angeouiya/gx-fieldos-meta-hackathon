import { cleanGXControl } from './gx-document-context.ts'

export type GXExportFormat = 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'txt'

const MAX_EXPORT_CHARS = 30_000

export function gxExportFileName(title: string, format: GXExportFormat) {
  const base = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'gx-document'
  return `${base}.${format}`
}

function exportLines(title: string, content: string) {
  const cleanTitle = cleanGXControl(title).trim().slice(0, 200) || 'GX.ai'
  const cleanContent = cleanGXControl(content, true).trim().slice(0, MAX_EXPORT_CHARS)
  if (!cleanContent) throw new Error('empty export')
  return { title: cleanTitle, content: cleanContent, paragraphs: cleanContent.split(/\n+/).map((line) => line.trim()).filter(Boolean) }
}

function pdfSafeText(value: string, characterSet: Set<number>) {
  return Array.from(value, (character) => characterSet.has(character.codePointAt(0) ?? -1) ? character : '?').join('')
}

export async function createGXDocumentBlob(title: string, content: string, format: GXExportFormat): Promise<Blob> {
  const source = exportLines(title, content)

  if (format === 'txt') return new Blob([`${source.title}\n\n${source.content}\n`], { type: 'text/plain;charset=utf-8' })

  if (format === 'docx') {
    const { Document, Packer, Paragraph, TextRun } = await import('docx')
    const document = new Document({ sections: [{ children: [
      new Paragraph({ children: [new TextRun({ text: source.title, bold: true, size: 32 })], spacing: { after: 240 } }),
      ...source.paragraphs.map((paragraph) => new Paragraph({ text: paragraph, spacing: { after: 120 } })),
    ] }] })
    return Packer.toBlob(document)
  }

  if (format === 'pptx') {
    const { default: PptxGenJS } = await import('pptxgenjs')
    const presentation = new PptxGenJS()
    presentation.layout = 'LAYOUT_WIDE'
    presentation.author = 'GX.ai'
    presentation.subject = source.title
    const chunks: string[] = []
    let chunk = ''
    for (const paragraph of source.paragraphs) {
      const words = paragraph.split(/\s+/)
      let line = ''
      for (const word of words) {
        if ((line + word).length > 76 && line) {
          if (chunk.length + line.length > 950) { chunks.push(chunk.trim()); chunk = '' }
          chunk += `${line.trim()}\n`
          line = ''
        }
        line += `${word} `
      }
      if (line) {
        if (chunk.length + line.length > 950) { chunks.push(chunk.trim()); chunk = '' }
        chunk += `${line.trim()}\n\n`
      }
    }
    if (chunk.trim()) chunks.push(chunk.trim())
    for (const [index, text] of chunks.entries()) {
      const slide = presentation.addSlide()
      slide.background = { color: 'F8FBF7' }
      slide.addText(source.title, { x: 0.7, y: 0.35, w: 11.7, h: 0.55, fontFace: 'Arial', fontSize: 21, bold: true, color: '175C3B', breakLine: false })
      slide.addText(text, { x: 0.7, y: 1.15, w: 11.7, h: 5.7, fontFace: 'Arial', fontSize: 15, color: '263B2E', valign: 'top', breakLine: false, margin: 0.06 })
      slide.addText(`${index + 1} / ${chunks.length}`, { x: 11.5, y: 7.08, w: 1.0, h: 0.2, align: 'right', fontSize: 8, color: '688474' })
    }
    const data = await presentation.write({ outputType: 'blob', compression: true })
    return new Blob([data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
  }

  if (format === 'xlsx') {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'GX.ai'
    const sheet = workbook.addWorksheet('GX')
    sheet.columns = [{ header: source.title, key: 'text', width: 100 }]
    sheet.getRow(1).font = { bold: true, color: { argb: 'FF175C3B' } }
    for (const paragraph of source.paragraphs) sheet.addRow([paragraph])
    sheet.eachRow((row) => { row.alignment = { vertical: 'top', wrapText: true } })
    const data = await workbook.xlsx.writeBuffer()
    return new Blob([data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const document = await PDFDocument.create()
  const font = await document.embedFont(StandardFonts.Helvetica)
  const characters = new Set(font.getCharacterSet())
  const pageWidth = 595
  const pageHeight = 842
  const margin = 52
  const bodySize = 10
  const maxLineWidth = pageWidth - 2 * margin
  const wrap = (text: string, size: number) => {
    const lines: string[] = []
    let line = ''
    for (const originalWord of pdfSafeText(text, characters).split(/\s+/)) {
      let word = originalWord
      while (font.widthOfTextAtSize(word, size) > maxLineWidth) {
        if (line) { lines.push(line); line = '' }
        let cut = 1
        while (cut < word.length && font.widthOfTextAtSize(word.slice(0, cut + 1), size) <= maxLineWidth) cut++
        lines.push(word.slice(0, cut))
        word = word.slice(cut)
      }
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) > maxLineWidth && line) { lines.push(line); line = word }
      else line = candidate
    }
    if (line) lines.push(line)
    return lines
  }
  let page = document.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin
  const draw = (line: string, size: number, bold = false) => {
    if (y < margin + size) { page = document.addPage([pageWidth, pageHeight]); y = pageHeight - margin }
    page.drawText(pdfSafeText(line, characters), { x: margin, y, size, font, color: rgb(bold ? 0.09 : 0.16, bold ? 0.36 : 0.23, bold ? 0.23 : 0.18) })
    y -= size * 1.55
  }
  for (const line of wrap(source.title, 17)) draw(line, 17, true)
  y -= 15
  for (const paragraph of source.paragraphs) {
    for (const line of wrap(paragraph, bodySize)) draw(line, bodySize)
    y -= 7
  }
  const bytes = await document.save()
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
}
