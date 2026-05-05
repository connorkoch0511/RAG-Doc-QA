import type { SupabaseClient } from '@supabase/supabase-js'
import type { RetrievedChunk } from '@/types'

const MATCH_THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD ?? '0.1')
const MATCH_COUNT = parseInt(process.env.MATCH_COUNT ?? '5')

interface MatchChunkRow {
  id: string
  document_id: string
  content: string
  chunk_index: number
  page_number: number | null
  similarity: number
}

export async function retrieveChunks(params: {
  queryEmbedding: number[]
  supabase: SupabaseClient
  matchThreshold?: number
  matchCount?: number
  documentIds?: string[]
}): Promise<RetrievedChunk[]> {
  const {
    queryEmbedding,
    supabase,
    matchThreshold = MATCH_THRESHOLD,
    matchCount = MATCH_COUNT,
    documentIds,
  } = params

  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_doc_ids: documentIds ?? null,
  })

  if (error) throw new Error(`Retrieval failed: ${error.message}`)
  if (!data || data.length === 0) return []

  const rows = data as MatchChunkRow[]

  // Fetch document names for the unique document IDs in results
  const uniqueDocIds = [...new Set(rows.map((r) => r.document_id))]
  const { data: docs, error: docError } = await supabase
    .from('documents')
    .select('id, name')
    .in('id', uniqueDocIds)

  if (docError) throw new Error(`Document lookup failed: ${docError.message}`)

  const docNameMap = new Map<string, string>(
    (docs ?? []).map((d: { id: string; name: string }) => [d.id, d.name])
  )

  return rows.map((row) => ({
    id: row.id,
    document_id: row.document_id,
    document_name: docNameMap.get(row.document_id) ?? 'Unknown',
    content: row.content,
    chunk_index: row.chunk_index,
    page_number: row.page_number,
    similarity: row.similarity,
  }))
}
