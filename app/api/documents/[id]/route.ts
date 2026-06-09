import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'

export const runtime = 'nodejs'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Scoped to the owner; chunks cascade via the foreign key.
    await sql`delete from documents where id = ${id}::uuid and user_id = ${userId}`

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    console.error('[documents DELETE]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
