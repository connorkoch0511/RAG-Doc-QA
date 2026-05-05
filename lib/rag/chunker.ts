import type { TextChunk } from '@/types'

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE ?? '512')
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP ?? '100')

// Separators tried in order — prefer semantic boundaries over arbitrary splits
const SEPARATORS = ['\n\n', '\n', '. ', '! ', '? ', ' ', '']

function splitOnSeparator(text: string, separator: string): string[] {
  if (separator === '') return text.split('')
  return text.split(separator).flatMap((part, i, arr) =>
    i < arr.length - 1 ? [part + separator] : part ? [part] : []
  )
}

function mergeIntoChunks(splits: string[], chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let current = ''
  let overlapBuffer = ''

  for (const split of splits) {
    if ((current + split).length > chunkSize && current.length > 0) {
      chunks.push(current.trim())
      // compute overlap from end of current chunk
      overlapBuffer = current.slice(-overlap)
      current = overlapBuffer + split
    } else {
      current += split
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

function recursiveSplit(text: string, separators: string[], chunkSize: number): string[] {
  if (text.length <= chunkSize) return [text]

  for (const sep of separators) {
    const splits = splitOnSeparator(text, sep)
    if (splits.length > 1) {
      // merge small splits back together up to chunkSize
      const merged = mergeIntoChunks(splits, chunkSize, CHUNK_OVERLAP)
      // recursively split any still-oversized chunks with finer separators
      const remaining = separators.slice(separators.indexOf(sep) + 1)
      return merged.flatMap((chunk) =>
        chunk.length > chunkSize && remaining.length > 0
          ? recursiveSplit(chunk, remaining, chunkSize)
          : [chunk]
      )
    }
  }
  // last resort: hard-cut at chunkSize
  const result: string[] = []
  for (let i = 0; i < text.length; i += chunkSize - CHUNK_OVERLAP) {
    result.push(text.slice(i, i + chunkSize))
  }
  return result
}

export function chunkText(fullText: string, pageTexts?: string[]): TextChunk[] {
  const rawChunks = recursiveSplit(fullText, SEPARATORS, CHUNK_SIZE)
  const chunks: TextChunk[] = []

  // Build page boundary offsets so we can tag each chunk with a page number
  const pageBoundaries: number[] = []
  if (pageTexts && pageTexts.length > 1) {
    let offset = 0
    for (const page of pageTexts) {
      pageBoundaries.push(offset)
      offset += page.length + 2 // +2 for \n\n separator
    }
  }

  let charOffset = 0
  for (let i = 0; i < rawChunks.length; i++) {
    const content = rawChunks[i]

    let pageNumber: number | null = null
    if (pageBoundaries.length > 0) {
      // Find which page this chunk starts on (1-indexed)
      for (let p = pageBoundaries.length - 1; p >= 0; p--) {
        if (charOffset >= pageBoundaries[p]) {
          pageNumber = p + 1
          break
        }
      }
    }

    chunks.push({
      content,
      chunkIndex: i,
      pageNumber,
      tokenCount: Math.ceil(content.length / 4),
    })

    charOffset += content.length
  }

  return chunks
}
