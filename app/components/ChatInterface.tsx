'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useChat } from 'ai/react'
import type { Citation } from '@/types'
import ChatMessage from './ChatMessage'
import EmptyState from './EmptyState'

interface Props {
  hasDocuments: boolean
  selectedDocIds: string[]
}

export default function ChatInterface({ hasDocuments, selectedDocIds }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [citationsMap, setCitationsMap] = useState<Map<string, Citation[]>>(new Map())

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    onResponse: (response) => {
      const raw = response.headers.get('X-Citations')
      if (raw) {
        try {
          const citations: Citation[] = JSON.parse(atob(raw))
          setCitationsMap((prev) => new Map(prev).set('__pending__', citations))
        } catch {
          // ignore parse errors
        }
      }
    },
    onFinish: (message) => {
      if (message.role === 'assistant') {
        setCitationsMap((prev) => {
          const next = new Map(prev)
          const pending = next.get('__pending__')
          if (pending) {
            next.set(message.id, pending)
            next.delete('__pending__')
          }
          return next
        })
      }
    },
  })

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (input.trim() && !isLoading) {
          const form = e.currentTarget.closest('form')
          if (form) form.requestSubmit()
        }
      }
    },
    [input, isLoading]
  )

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    handleSubmit(e, {
      body: { documentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined },
    })
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!hasMessages && <EmptyState />}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role as 'user' | 'assistant'}
            content={msg.content}
            citations={msg.role === 'assistant' ? citationsMap.get(msg.id) : undefined}
          />
        ))}

        {isLoading && (
          <div className="flex items-start">
            <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-2.5">
              <div className="flex gap-1 items-center h-5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 text-center">{error.message}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleFormSubmit}
        className="border-t border-gray-800 px-4 py-3 flex gap-2 items-end"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={
            hasDocuments
              ? 'Ask a question about your documents…'
              : 'Upload a document first…'
          }
          disabled={!hasDocuments || isLoading}
          rows={1}
          className="flex-1 resize-none bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-40 transition-colors"
          style={{ minHeight: '40px', maxHeight: '160px' }}
        />
        <button
          type="submit"
          disabled={!hasDocuments || isLoading || !input.trim()}
          className="flex-shrink-0 h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  )
}
