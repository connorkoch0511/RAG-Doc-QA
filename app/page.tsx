'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Document } from '@/types'
import { getSupabaseClient } from '@/lib/supabase/client'
import DocumentUploader from './components/DocumentUploader'
import DocumentList from './components/DocumentList'
import ChatInterface from './components/ChatInterface'

export default function Home() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true)
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      const docs: Document[] = data.documents ?? []
      setDocuments(docs)
      // Auto-select all documents
      setSelectedIds(new Set(docs.map((d) => d.id)))
    } finally {
      setLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    const supabase = getSupabaseClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null)
    })

    fetchDocuments()

    const channel = supabase
      .channel('documents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, fetchDocuments)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchDocuments])

  const handleUploaded = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev])
    setSelectedIds((prev) => new Set([...prev, doc.id]))
  }

  const handleDelete = async (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSignOut = async () => {
    await getSupabaseClient().auth.signOut()
    router.push('/auth/sign-in')
    router.refresh()
  }

  const selectedDocIds = [...selectedIds]

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 flex flex-col border-r border-gray-800 bg-gray-900 transition-all duration-200 ${
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-800">
          <svg className="h-5 w-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          <h1 className="font-semibold text-gray-100 text-sm flex-1">RAG Doc Q&amp;A</h1>
        </div>

        <DocumentUploader onUploaded={handleUploaded} />

        <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Knowledge Base</p>
          {selectedIds.size > 0 && documents.length > 0 && (
            <span className="text-xs text-blue-400">{selectedIds.size} active</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <DocumentList
            documents={documents}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onDelete={handleDelete}
            loading={loadingDocs}
          />
        </div>

        {/* Sign out */}
        <div className="border-t border-gray-800 px-4 py-3 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main chat */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded"
            title="Toggle sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <p className="text-sm font-medium text-gray-200">Chat</p>
            <p className="text-xs text-gray-500">
              {documents.length === 0
                ? 'No documents loaded'
                : selectedIds.size === 0
                ? 'No documents selected — check a document to enable search'
                : selectedIds.size === documents.length
                ? `Searching all ${documents.length} document${documents.length !== 1 ? 's' : ''}`
                : `Searching ${selectedIds.size} of ${documents.length} documents`}
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <ChatInterface
            hasDocuments={selectedIds.size > 0}
            selectedDocIds={selectedDocIds}
          />
        </div>
      </main>
    </div>
  )
}
