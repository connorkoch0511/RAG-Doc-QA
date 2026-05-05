'use client'

import type { Document } from '@/types'

interface Props {
  documents: Document[]
  onDelete: (id: string) => void
  loading: boolean
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function DocumentList({ documents, onDelete, loading }: Props) {
  if (loading) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-600">
        Loading documents…
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-600">
        No documents yet. Upload one to get started.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-800">
      {documents.map((doc) => (
        <li key={doc.id} className="px-4 py-3 group flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate" title={doc.name}>
              {doc.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {[
                doc.chunk_count != null ? `${doc.chunk_count} chunks` : null,
                formatBytes(doc.size_bytes),
                formatDate(doc.created_at),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <button
            onClick={() => onDelete(doc.id)}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 p-1 rounded"
            title="Delete document"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}
