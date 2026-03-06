import React from 'react'
import { Sparkles, Zap, AlertCircle, Copy, CheckCheck, Bookmark, BookmarkCheck, Clock } from 'lucide-react'
import { useState } from 'react'

type Status = 'idle' | 'loading' | 'done' | 'error'

export const SUMMARY_MODES = [
  { id: 'keypoints', label: 'Key Points' },
  { id: 'brief',     label: 'Brief'      },
  { id: 'eli5',      label: 'ELI5'       },
  { id: 'actions',   label: 'Actions'    },
  { id: 'proscons',  label: 'Pros & Cons'},
] as const

export type SummaryMode = typeof SUMMARY_MODES[number]['id']

interface SummaryPanelProps {
  summary: string
  status: Status
  errorMessage: string
  hasApiKey: boolean
  isSaved: boolean
  onSummarize: (mode: SummaryMode) => void
  onQuickSummarize: (mode: SummaryMode) => void
  onSave: () => void
}

function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).length
  const mins = Math.ceil(words / 200)
  return `~${mins} min read`
}

export default function SummaryPanel({
  summary,
  status,
  errorMessage,
  hasApiKey,
  isSaved,
  onSummarize,
  onQuickSummarize,
  onSave,
}: SummaryPanelProps) {
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState<SummaryMode>('keypoints')

  function handleCopy() {
    if (!summary) return
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const isLoading = status === 'loading'
  const isError = status === 'error'
  const hasSummary = status === 'done' && summary.length > 0

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Mode selector */}
      <div className="flex gap-1.5 flex-wrap">
        {SUMMARY_MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all
              ${mode === m.id
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                : 'bg-gray-700/40 text-gray-500 border border-gray-700/40 hover:text-gray-300'
              }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Summarize buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onSummarize(mode)}
          disabled={isLoading || !hasApiKey}
          className={`
            flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-semibold
            transition-all duration-150
            ${isLoading
              ? 'bg-indigo-900/60 text-indigo-300 cursor-not-allowed'
              : !hasApiKey
              ? 'bg-gray-700/60 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/40'
            }
          `}
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-indigo-300/30 border-t-indigo-200 rounded-full animate-spin" />
              Summarizing...
            </>
          ) : (
            <>
              <Sparkles size={15} />
              AI Summary
            </>
          )}
        </button>

        <button
          onClick={() => onQuickSummarize(mode)}
          disabled={isLoading}
          title="Extractive summary — no AI or API key needed"
          className={`
            flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold
            transition-all duration-150 flex-shrink-0
            ${isLoading
              ? 'bg-gray-700/40 text-gray-600 cursor-not-allowed'
              : 'bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 border border-gray-600/40'
            }
          `}
        >
          <Zap size={14} />
          Quick
        </button>
      </div>

      {/* No API key hint */}
      {!hasApiKey && (
        <p className="text-gray-600 text-[11px] text-center -mt-1">
          No API key? Use <span className="text-gray-400">Quick</span> for instant summarization
        </p>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-3 bg-gray-800 rounded-lg w-full" />
          <div className="h-3 bg-gray-800 rounded-lg w-[92%]" />
          <div className="h-3 bg-gray-800 rounded-lg w-[85%]" />
          <div className="h-3 bg-gray-800 rounded-lg w-full" />
          <div className="h-3 bg-gray-800 rounded-lg w-[78%]" />
          <div className="h-3 bg-gray-800 rounded-lg w-[90%]" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-start gap-2 bg-red-950/30 border border-red-700/30 rounded-xl px-3 py-2.5">
          <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-300 text-xs font-medium">Error generating summary</p>
            <p className="text-red-400/80 text-[11px] mt-0.5 break-words">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Summary display */}
      {hasSummary && (
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Summary</h3>
              <span className="flex items-center gap-1 text-gray-600 text-[10px]">
                <Clock size={10} />
                {readingTime(summary)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Save to history */}
              <button
                onClick={onSave}
                title={isSaved ? 'Saved to history' : 'Save to history'}
                className={`flex items-center gap-1 text-[11px] transition-colors
                  ${isSaved
                    ? 'text-amber-400'
                    : 'text-gray-500 hover:text-amber-400'
                  }`}
              >
                {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
              </button>
              {/* Copy */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-200 text-[11px] transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCheck size={12} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/40 rounded-xl p-3 max-h-52 overflow-y-auto
                          scrollbar-thin">
            <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
              {summary}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
