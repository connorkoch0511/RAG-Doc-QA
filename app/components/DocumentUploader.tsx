'use client'

import { useState, useCallback } from 'react'
import type { Document, PipelineStep, PipelineStepState } from '@/types'
import PipelineStatus from './PipelineStatus'

interface Props {
  onUploaded: (doc: Document) => void
}

const INITIAL_STEPS: PipelineStepState[] = [
  { step: 'parsing', label: 'Parsing document...', status: 'pending' },
  { step: 'chunking', label: 'Splitting into chunks...', status: 'pending' },
  { step: 'embedding', label: 'Generating embeddings...', status: 'pending' },
  { step: 'storing', label: 'Storing in vector DB...', status: 'pending' },
]

function updateStep(
  steps: PipelineStepState[],
  target: PipelineStep,
  status: PipelineStepState['status']
): PipelineStepState[] {
  return steps.map((s) => (s.step === target ? { ...s, status } : s))
}

export default function DocumentUploader({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [steps, setSteps] = useState<PipelineStepState[]>(INITIAL_STEPS)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const resetState = () => {
    setSteps(INITIAL_STEPS)
    setError(null)
    setFileName(null)
  }

  const upload = useCallback(async (file: File) => {
    resetState()
    setUploading(true)
    setFileName(file.name)

    // Simulate step progression — parsing and chunking are instant on the server
    // but we animate them to show the pipeline
    setSteps((s) => updateStep(s, 'parsing', 'active'))
    await new Promise((r) => setTimeout(r, 300))
    setSteps((s) => {
      let next = updateStep(s, 'parsing', 'done')
      next = updateStep(next, 'chunking', 'active')
      return next
    })
    await new Promise((r) => setTimeout(r, 300))
    setSteps((s) => {
      let next = updateStep(s, 'chunking', 'done')
      next = updateStep(next, 'embedding', 'active')
      return next
    })

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setSteps((s) => updateStep(s, 'embedding', 'error'))
        setError(data.error ?? 'Upload failed')
        return
      }

      setSteps((s) => {
        let next = updateStep(s, 'embedding', 'done')
        next = updateStep(next, 'storing', 'active')
        return next
      })
      await new Promise((r) => setTimeout(r, 200))
      setSteps((s) => updateStep(s, 'storing', 'done'))

      onUploaded({
        id: data.documentId,
        name: data.documentName,
        size_bytes: file.size,
        mime_type: file.type,
        created_at: new Date().toISOString(),
        chunk_count: data.chunkCount,
      })
    } catch {
      setSteps((s) => updateStep(s, 'embedding', 'error'))
      setError('Network error — please try again.')
    } finally {
      setUploading(false)
    }
  }, [onUploaded])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) upload(file)
    },
    [upload]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
    e.target.value = ''
  }

  const showSteps = uploading || steps.some((s) => s.status === 'done' || s.status === 'error')

  return (
    <div className="p-4">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-blue-400 bg-blue-950/30'
            : 'border-gray-700 hover:border-gray-500'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          type="file"
          accept=".pdf,.txt,text/plain,application/pdf"
          className="hidden"
          onChange={handleChange}
          disabled={uploading}
        />
        <svg
          className="mx-auto h-8 w-8 text-gray-500 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-sm text-gray-400">
          {uploading ? `Uploading ${fileName}…` : 'Drop a PDF or TXT file, or click to browse'}
        </p>
        <p className="text-xs text-gray-600 mt-1">Max 4MB</p>
      </label>

      {showSteps && <PipelineStatus steps={steps} />}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
