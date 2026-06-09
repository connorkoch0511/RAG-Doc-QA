import { sql, toVector } from '@/lib/db'
import { parsePDF, parsePlainText } from '@/lib/parsers/pdf'
import { chunkText } from '@/lib/rag/chunker'
import { embedTexts } from '@/lib/rag/embedder'
import type { UploadResponse } from '@/types'

export async function ingestDocument(params: {
  file: File
  userId: string
}): Promise<UploadResponse> {
  const { file, userId } = params

  // 1. Parse
  const buffer = await file.arrayBuffer()
  const { fullText, pageTexts } =
    file.type === 'application/pdf'
      ? await parsePDF(buffer)
      : parsePlainText(buffer)

  if (!fullText.trim()) {
    throw new Error('No text content found in the uploaded file.')
  }

  // 2. Chunk
  const chunks = chunkText(fullText, pageTexts)
  if (chunks.length === 0) {
    throw new Error('Document produced no chunks — it may be too short.')
  }

  // 3. Insert document row
  const docRows = (await sql`
    insert into documents (name, size_bytes, mime_type, user_id)
    values (${file.name}, ${file.size}, ${file.type || 'text/plain'}, ${userId})
    returning id
  `) as { id: string }[]

  const documentId: string = docRows[0].id

  try {
    // 4. Generate embeddings
    const texts = chunks.map((c) => c.content)
    const embeddings = await embedTexts(texts)

    if (embeddings.length !== chunks.length) {
      throw new Error('Embedding count mismatch — retry upload.')
    }

    // 5. Batch-insert all chunks via unnest (single round-trip)
    const contents = chunks.map((c) => c.content)
    const indices = chunks.map((c) => c.chunkIndex)
    const pages = chunks.map((c) => c.pageNumber)
    const tokens = chunks.map((c) => c.tokenCount)
    const embStrings = embeddings.map((e) => toVector(e))

    await sql`
      insert into chunks (document_id, content, chunk_index, page_number, token_count, embedding)
      select
        ${documentId}::uuid,
        t.content,
        t.chunk_index,
        t.page_number,
        t.token_count,
        t.embedding::vector(384)
      from unnest(
        ${contents}::text[],
        ${indices}::int[],
        ${pages}::int[],
        ${tokens}::int[],
        ${embStrings}::text[]
      ) as t(content, chunk_index, page_number, token_count, embedding)
    `
  } catch (err) {
    // Clean up the document row if chunk insertion fails
    await sql`delete from documents where id = ${documentId}::uuid`
    throw err
  }

  return {
    documentId,
    chunkCount: chunks.length,
    documentName: file.name,
  }
}
