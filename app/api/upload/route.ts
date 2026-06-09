import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ingestDocument } from '@/lib/rag/pipeline'

export const runtime = 'nodejs'
export const maxDuration = 60

const ALLOWED_TYPES = ['application/pdf', 'text/plain']
const MAX_SIZE_BYTES = 4 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.txt')) {
      return NextResponse.json({ error: 'Only PDF and plain text files are supported.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File exceeds the 4MB limit.' }, { status: 400 })
    }

    const result = await ingestDocument({ file, userId })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[upload]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
