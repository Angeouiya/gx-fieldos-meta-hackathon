import { GX_DOCUMENT_MAX_CHARS } from './gx-document-context'

type OfficeFormat = 'docx' | 'pptx' | 'xlsx'
type OfficeText = { excerpt: string; truncated: boolean }
type ZipTextStream = {
  on(event: 'data', listener: (chunk: string) => void): ZipTextStream
  on(event: 'end', listener: () => void): ZipTextStream
  on(event: 'error', listener: (error: unknown) => void): ZipTextStream
  pause(): ZipTextStream
  resume(): ZipTextStream
}

const MAX_XML_BYTES = 2 * 1024 * 1024
const MAX_SLIDES = 20
const MAX_SHEETS = 5
const MAX_ROWS = 40
const MAX_CELLS_PER_ROW = 20

function decodeXml(value: string) {
  return value.replace(/&(?:#(x[0-9a-f]+|\d+)|amp|lt|gt|quot|apos);/gi, (entity, numeric: string | undefined) => {
    if (numeric) {
      const codePoint = numeric.startsWith('x') || numeric.startsWith('X') ? Number.parseInt(numeric.slice(1), 16) : Number(numeric)
      try { return String.fromCodePoint(codePoint) } catch { return entity }
    }
    return ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" } as Record<string, string>)[entity.toLowerCase()] ?? entity
  })
}

function xmlText(xml: string, tag: 'w:t' | 'a:t' | 't') {
  const escaped = tag.replace(':', '\\:')
  const matches = xml.matchAll(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'g'))
  return Array.from(matches, (match) => decodeXml(match[1] ?? '')).join('')
}

function paragraphText(xml: string, tag: 'w:t' | 'a:t', paragraphEnd: string) {
  const escaped = tag.replace(':', '\\:')
  const token = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>|${paragraphEnd}`, 'g')
  const parts: string[] = []
  let line = ''
  for (const match of xml.matchAll(token)) {
    if (match[1] !== undefined) line += decodeXml(match[1])
    else if (line.trim()) { parts.push(line.trim()); line = '' }
  }
  if (line.trim()) parts.push(line.trim())
  return parts.join('\n')
}

function attr(attributes: string, name: string) {
  const escaped = name.replace(':', '\\:')
  return decodeXml(attributes.match(new RegExp(`(?:^|\\s)${escaped}="([^"]*)"`))?.[1] ?? '')
}

export async function extractGXOfficeText(bytes: Uint8Array, format: OfficeFormat, language: 'fr' | 'en' = 'fr'): Promise<OfficeText | null> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(bytes)
  const read = async (path: string) => {
    const entry = zip.file(path)
    if (!entry) return null
    const declaredSize = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize
    if (!Number.isSafeInteger(declaredSize) || Number(declaredSize) > MAX_XML_BYTES) throw new Error('Office XML part exceeds limit')
    return new Promise<string>((resolve, reject) => {
      let text = ''
      const stream = (entry as unknown as { internalStream(type: 'string'): ZipTextStream }).internalStream('string')
      stream.on('data', (chunk) => {
        text += chunk
        if (text.length > MAX_XML_BYTES) {
          stream.pause()
          reject(new Error('Office XML part exceeds limit'))
        }
      }).on('end', () => resolve(text)).on('error', reject).resume()
    })
  }

  if (format === 'docx') {
    const xml = await read('word/document.xml')
    if (xml === null) return null
    const text = paragraphText(xml, 'w:t', '<\\/w:p>')
    return { excerpt: text.slice(0, GX_DOCUMENT_MAX_CHARS), truncated: text.length > GX_DOCUMENT_MAX_CHARS }
  }

  if (format === 'pptx') {
    const slides = Object.keys(zip.files).map((path) => ({ path, number: Number(path.match(/^ppt\/slides\/slide(\d+)\.xml$/)?.[1]) })).filter((item) => Number.isSafeInteger(item.number) && item.number > 0).sort((a, b) => a.number - b.number)
    if (!slides.length) return null
    const parts: string[] = []
    for (const slide of slides.slice(0, MAX_SLIDES)) {
      const xml = await read(slide.path)
      if (xml) parts.push(`[${language === 'en' ? 'Slide' : 'Diapositive'} ${slide.number}]\n${paragraphText(xml, 'a:t', '<\\/a:p>')}`)
    }
    const text = parts.join('\n\n').trim()
    return { excerpt: text.slice(0, GX_DOCUMENT_MAX_CHARS), truncated: slides.length > MAX_SLIDES || text.length > GX_DOCUMENT_MAX_CHARS }
  }

  const sheets = Object.keys(zip.files).map((path) => ({ path, number: Number(path.match(/^xl\/worksheets\/sheet(\d+)\.xml$/)?.[1]) })).filter((item) => Number.isSafeInteger(item.number) && item.number > 0).sort((a, b) => a.number - b.number)
  if (!sheets.length) return null
  const sharedXml = await read('xl/sharedStrings.xml')
  const sharedStrings = sharedXml ? Array.from(sharedXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g), (match) => xmlText(match[1] ?? '', 't')) : []
  const parts: string[] = [language === 'en' ? 'Saved workbook values; formulas have not been recalculated.' : 'Valeurs enregistrées dans le classeur ; les formules ne sont pas recalculées.']
  let truncated = sheets.length > MAX_SHEETS
  for (const sheet of sheets.slice(0, MAX_SHEETS)) {
    const xml = await read(sheet.path)
    if (!xml) continue
    parts.push(`[${language === 'en' ? 'Sheet' : 'Feuille'} ${sheet.number}]`)
    let rowCount = 0
    for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      if (++rowCount > MAX_ROWS) { truncated = true; break }
      const cells: string[] = []
      let cellCount = 0
      for (const cell of (row[1] ?? '').matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
        if (++cellCount > MAX_CELLS_PER_ROW) { truncated = true; break }
        const attributes = cell[1] ?? ''
        const body = cell[2] ?? ''
        const reference = attr(attributes, 'r') || `${language === 'en' ? 'cell' : 'cellule'} ${cellCount}`
        const type = attr(attributes, 't')
        const raw = body.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1] ?? ''
        const formula = body.match(/<f(?:\s[^>]*)?>([\s\S]*?)<\/f>/)?.[1]
        const value = type === 's' ? sharedStrings[Number(raw)] ?? '' : type === 'inlineStr' ? xmlText(body, 't') : decodeXml(raw)
        if (value || formula) cells.push(`${reference}: ${formula ? language === 'en' ? `formula ${decodeXml(formula)}; saved value ${value || 'missing'}` : `formule ${decodeXml(formula)} ; valeur enregistrée ${value || 'absente'}` : value}`)
      }
      if (cells.length) parts.push(cells.join(' | '))
    }
  }
  const text = parts.join('\n').trim()
  return { excerpt: text.slice(0, GX_DOCUMENT_MAX_CHARS), truncated: truncated || text.length > GX_DOCUMENT_MAX_CHARS }
}
