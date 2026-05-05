'use client'

import { useState } from 'react'
import type { Citation } from '@/types'

interface Props {
  citation: Citation
}

export default function CitationCard({ citation }: Props) {
  const [expanded, setExpanded] = useState(false)
  const preview = citation.content.slice(0, 200)
  const hasMore = citation.content.length > 200

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 text-xs">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-blue-900 text-blue-300 text-xs font-bold flex-shrink-0">
          {citation.sourceIndex}
        </span>
        <span className="font-medium text-gray-300 truncate">
          {citation.documentName}
        </span>
        {citation.pageNumber && (
          <span className="text-gray-500 flex-shrink-0">Page {citation.pageNumber}</span>
        )}
      </div>
      <p className="text-gray-400 leading-relaxed">
        {expanded ? citation.content : preview}
        {hasMore && !expanded && '…'}
      </p>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-blue-400 hover:text-blue-300 transition-colors"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
