import type { RetrievedChunk } from '@/types'

export const LLM_MODEL = process.env.LLM_MODEL ?? 'llama-3.1-8b-instant'

export function buildPrompt(userMessage: string, chunks: RetrievedChunk[]): {
  system: string
  userPrompt: string
} {
  const system = `You are a helpful assistant that answers questions based strictly on provided document excerpts.

Rules:
- Answer ONLY from the provided context. Do not use outside knowledge.
- If the context does not contain enough information to answer, say so explicitly.
- When you use information from a source, cite it using [Source N] notation.
- Be concise and direct.`

  const contextBlock = chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}] (${chunk.document_name}${chunk.page_number ? `, Page ${chunk.page_number}` : ''}):\n${chunk.content}`
    )
    .join('\n\n')

  const userPrompt = `Context:\n${contextBlock}\n\nQuestion: ${userMessage}`

  return { system, userPrompt }
}
