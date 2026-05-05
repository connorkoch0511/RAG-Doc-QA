export interface Document {
  id: string
  name: string
  size_bytes: number | null
  mime_type: string | null
  created_at: string
  chunk_count?: number
}

export interface Chunk {
  id: string
  document_id: string
  content: string
  chunk_index: number
  page_number: number | null
  token_count: number | null
  embedding?: number[]
  created_at: string
}

export interface TextChunk {
  content: string
  chunkIndex: number
  pageNumber: number | null
  tokenCount: number
}

export interface RetrievedChunk {
  id: string
  document_id: string
  document_name: string
  content: string
  chunk_index: number
  page_number: number | null
  similarity: number
}

export interface Citation {
  sourceIndex: number
  documentName: string
  pageNumber: number | null
  content: string
  chunkId: string
}

export interface UploadResponse {
  documentId: string
  chunkCount: number
  documentName: string
}

export interface ChatRequest {
  message: string
  documentIds?: string[]
}

export type PipelineStep =
  | 'parsing'
  | 'chunking'
  | 'embedding'
  | 'storing'
  | 'done'
  | 'error'

export interface PipelineStepState {
  step: PipelineStep
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
}
