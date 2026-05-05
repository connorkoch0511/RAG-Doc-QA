'use client'

import { useState } from 'react'
import type { Citation } from '@/types'
import CitationCard from './CitationCard'

interface Props {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

export default function ChatMessage({ role, content, citations }: Props) {
  const [showSources, setShowSources] = useState(false)
  const isUser = role === 'user'

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-800 text-gray-100 rounded-bl-sm'
        }`}
      >
        {content}
      </div>

      {!isUser && citations && citations.length > 0 && (
        <div className="max-w-[85%] w-full">
          <button
            onClick={() => setShowSources((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-1"
          >
            <svg
              className={`h-3 w-3 transition-transform ${showSources ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Sources ({citations.length})
          </button>

          {showSources && (
            <div className="mt-2 space-y-2">
              {citations.map((c) => (
                <CitationCard key={c.chunkId} citation={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
