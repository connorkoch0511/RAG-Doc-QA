import { HfInference } from '@huggingface/inference'

const MODEL = process.env.EMBEDDING_MODEL ?? 'sentence-transformers/all-MiniLM-L6-v2'
const BATCH_SIZE = 8
const MAX_RETRIES = 3

let hf: HfInference | null = null

function getClient(): HfInference {
  if (!hf) {
    const token = process.env.HUGGINGFACE_API_TOKEN
    if (!token) throw new Error('Missing HUGGINGFACE_API_TOKEN')
    hf = new HfInference(token)
  }
  return hf
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function embedBatchWithRetry(texts: string[]): Promise<number[][]> {
  const client = getClient()

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.featureExtraction({
        model: MODEL,
        inputs: texts,
      })

      if (Array.isArray(response) && Array.isArray(response[0])) {
        return response as number[][]
      }
      // Single input returned as flat array
      return [response as number[]]
    } catch (err: unknown) {
      const error = err as { message?: string; status?: number }
      const isLoading =
        error?.message?.includes('loading') || error?.status === 503

      if (isLoading && attempt < MAX_RETRIES - 1) {
        // HuggingFace free tier cold-start — model is warming up
        const waitMs = (attempt + 1) * 8000
        await sleep(waitMs)
        continue
      }
      throw err
    }
  }

  throw new Error(`Failed to embed batch after ${MAX_RETRIES} retries`)
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const batchEmbeddings = await embedBatchWithRetry(batch)
    results.push(...batchEmbeddings)
  }

  return results
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text])
  return embedding
}
