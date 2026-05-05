import type { SupabaseClient } from '@supabase/supabase-js'
import { parsePDF, parsePlainText } from '@/lib/parsers/pdf'
import { chunkText } from '@/lib/rag/chunker'
import { embedTexts } from '@/lib/rag/embedder'
import type { UploadResponse } from '@/types'

export async function ingestDocument(params: {
  file: File
  supabase: SupabaseClient
}): Promise<UploadResponse> {
  const { file, supabase } = params

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
  const { data: docData, error: docError } = await supabase
    .from('documents')
    .insert({
      name: file.name,
      size_bytes: file.size,
      mime_type: file.type || 'text/plain',
    })
    .select('id')
    .single()

  if (docError || !docData) {
    throw new Error(`Failed to create document record: ${docError?.message}`)
  }

  const documentId: string = docData.id

  try {
    // 4. Generate embeddings
    const texts = chunks.map((c) => c.content)
    const embeddings = await embedTexts(texts)

    if (embeddings.length !== chunks.length) {
      throw new Error('Embedding count mismatch — retry upload.')
    }

    // 5. Batch-insert all chunks
    const chunkRows = chunks.map((chunk, i) => ({
      document_id: documentId,
      content: chunk.content,
      chunk_index: chunk.chunkIndex,
      page_number: chunk.pageNumber,
      token_count: chunk.tokenCount,
      embedding: embeddings[i],
    }))

    const { error: chunkError } = await supabase.from('chunks').insert(chunkRows)

    if (chunkError) {
      throw new Error(`Failed to store chunks: ${chunkError.message}`)
    }
  } catch (err) {
    // Clean up the document row if chunk insertion fails
    await supabase.from('documents').delete().eq('id', documentId)
    throw err
  }

  return {
    documentId,
    chunkCount: chunks.length,
    documentName: file.name,
  }
}
