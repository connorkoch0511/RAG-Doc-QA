import { extractText } from 'unpdf'

export async function parsePDF(buffer: ArrayBuffer): Promise<{ fullText: string; pageTexts: string[] }> {
  const uint8 = new Uint8Array(buffer)
  const pdf = await extractText(uint8, { mergePages: false })

  const pageTexts: string[] = Array.isArray(pdf.text)
    ? (pdf.text as string[])
    : [pdf.text as string]

  const fullText = pageTexts.join('\n\n')
  return { fullText, pageTexts }
}

export function parsePlainText(buffer: ArrayBuffer): { fullText: string; pageTexts: string[] } {
  const fullText = new TextDecoder().decode(buffer)
  return { fullText, pageTexts: [fullText] }
}
