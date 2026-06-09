import { sql, toVector } from '@/lib/db'
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
  userId: string
  matchThreshold?: number
  matchCount?: number
  documentIds?: string[]
}): Promise<RetrievedChunk[]> {
  const {
    queryEmbedding,
    userId,
    matchThreshold = MATCH_THRESHOLD,
    matchCount = MATCH_COUNT,
    documentIds,
  } = params

  // null = search all of the user's documents; the SQL function scopes by user.
  const docIds = documentIds && documentIds.length > 0 ? documentIds : null

  const rows = (await sql`
    select * from match_chunks(
      ${toVector(queryEmbedding)}::vector(384),
      ${matchThreshold},
      ${matchCount},
      ${docIds}::uuid[],
      ${userId}
    )
  `) as MatchChunkRow[]

  if (rows.length === 0) return []

  // Fetch document names for the unique document IDs in results
  const uniqueDocIds = [...new Set(rows.map((r) => r.document_id))]
  const docs = (await sql`
    select id, name from documents where id = any(${uniqueDocIds}::uuid[])
  `) as { id: string; name: string }[]

  const docNameMap = new Map<string, string>(docs.map((d) => [d.id, d.name]))

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
