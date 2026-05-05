import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('documents')
      .select('id, name, size_bytes, mime_type, created_at')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    // Attach chunk counts
    const documentsWithCounts = await Promise.all(
      (data ?? []).map(async (doc) => {
        const { count } = await supabase
          .from('chunks')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', doc.id)

        return { ...doc, chunk_count: count ?? 0 }
      })
    )

    return NextResponse.json({ documents: documentsWithCounts })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load documents'
    console.error('[documents GET]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
