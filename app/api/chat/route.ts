import { NextRequest } from 'next/server'
import { createGroq } from '@ai-sdk/groq'
import { streamText } from 'ai'
import { createServerClient } from '@/lib/supabase/server'
import { embedQuery } from '@/lib/rag/embedder'
import { retrieveChunks } from '@/lib/rag/retriever'
import { buildPrompt, LLM_MODEL } from '@/lib/groq'
import type { ChatRequest, Citation } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json()
    const { message, documentIds } = body

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createServerClient()

    // 1. Embed the user's question
    const queryEmbedding = await embedQuery(message)

    // 2. Retrieve the most relevant chunks
    const chunks = await retrieveChunks({
      queryEmbedding,
      supabase,
      documentIds,
    })

    // 3. Build the augmented prompt
    const { system, userPrompt } = buildPrompt(message, chunks)

    // 4. Build citations payload to attach to the response headers
    const citations: Citation[] = chunks.map((chunk, i) => ({
      sourceIndex: i + 1,
      documentName: chunk.document_name,
      pageNumber: chunk.page_number,
      content: chunk.content,
      chunkId: chunk.id,
    }))

    // 5. Stream the LLM response with citations in a custom header
    const result = streamText({
      model: groq(LLM_MODEL),
      system,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1024,
    })

    return result.toDataStreamResponse({
      headers: {
        'X-Citations': JSON.stringify(citations),
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Chat failed'
    console.error('[chat]', err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
