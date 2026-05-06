import { NextRequest } from 'next/server'
import { createGroq } from '@ai-sdk/groq'
import { streamText } from 'ai'
import { createAuthClient } from '@/lib/supabase/server'
import { embedQuery } from '@/lib/rag/embedder'
import { retrieveChunks } from '@/lib/rag/retriever'
import { buildPrompt, LLM_MODEL } from '@/lib/groq'
import type { Citation } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const authClient = await createAuthClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const sdkMessages: { role: string; content: string }[] = body.messages ?? []
    const lastUserMessage = sdkMessages.findLast((m) => m.role === 'user')
    const message = lastUserMessage?.content
    const documentIds: string[] | undefined = body.documentIds

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const queryEmbedding = await embedQuery(message)
    const chunks = await retrieveChunks({
      queryEmbedding,
      supabase: authClient,
      documentIds,
    })

    const { system, userPrompt } = buildPrompt(message, chunks)

    const citations: Citation[] = chunks.map((chunk, i) => ({
      sourceIndex: i + 1,
      documentName: chunk.document_name,
      pageNumber: chunk.page_number,
      content: chunk.content,
      chunkId: chunk.id,
    }))

    const citationsB64 = Buffer.from(JSON.stringify(citations)).toString('base64')

    const result = streamText({
      model: groq(LLM_MODEL),
      system,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1024,
    })

    return result.toDataStreamResponse({
      headers: { 'X-Citations': citationsB64 },
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
