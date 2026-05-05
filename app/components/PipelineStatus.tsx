'use client'

import type { PipelineStepState } from '@/types'

interface Props {
  steps: PipelineStepState[]
}

const icons = {
  pending: (
    <span className="h-4 w-4 rounded-full border border-gray-600 inline-block" />
  ),
  active: (
    <svg className="h-4 w-4 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  ),
  done: (
    <svg className="h-4 w-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="h-4 w-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
}

export default function PipelineStatus({ steps }: Props) {
  return (
    <div className="mt-3 space-y-2">
      {steps.map((step) => (
        <div key={step.step} className="flex items-center gap-2 text-sm">
          <span className="flex-shrink-0">{icons[step.status]}</span>
          <span
            className={
              step.status === 'active'
                ? 'text-blue-300'
                : step.status === 'done'
                ? 'text-gray-400'
                : step.status === 'error'
                ? 'text-red-400'
                : 'text-gray-600'
            }
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}
