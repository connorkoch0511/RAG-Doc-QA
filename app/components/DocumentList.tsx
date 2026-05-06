'use client'

import type { Document } from '@/types'

interface Props {
  documents: Document[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
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

export default function DocumentList({ documents, selectedIds, onToggleSelect, onDelete, loading }: Props) {
  if (loading) {
    return <div className="px-4 py-6 text-center text-sm text-gray-600">Loading documents…</div>
  }

  if (documents.length === 0) {
    return <div className="px-4 py-6 text-center text-sm text-gray-600">No documents yet. Upload one to get started.</div>
  }

  const allSelected = documents.every((d) => selectedIds.has(d.id))

  return (
    <div>
      {documents.length > 1 && (
        <div className="px-4 py-2 border-b border-gray-800">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => documents.forEach((d) => onToggleSelect(d.id))}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            {allSelected ? 'Deselect all' : 'Select all'}
          </label>
        </div>
      )}
      <ul className="divide-y divide-gray-800">
        {documents.map((doc) => (
          <li key={doc.id} className="px-4 py-3 group flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={selectedIds.has(doc.id)}
              onChange={() => onToggleSelect(doc.id)}
              className="mt-0.5 flex-shrink-0 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              title="Include in search"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-200 truncate" title={doc.name}>
                {doc.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {[
                  doc.chunk_count != null ? `${doc.chunk_count} chunks` : null,
                  formatBytes(doc.size_bytes),
                  formatDate(doc.created_at),
                ].filter(Boolean).join(' · ')}
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
    </div>
  )
}
