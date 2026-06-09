import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const documents = await sql`
      select
        d.id,
        d.name,
        d.size_bytes,
        d.mime_type,
        d.created_at,
        count(c.id)::int as chunk_count
      from documents d
      left join chunks c on c.document_id = d.id
      where d.user_id = ${userId}
      group by d.id
      order by d.created_at desc
    `

    return NextResponse.json({ documents })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load documents'
    console.error('[documents GET]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
