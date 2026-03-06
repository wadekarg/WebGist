import React, { useState, useEffect } from 'react'
import { Trash2, Clock, ExternalLink, ChevronDown, ChevronUp, BookOpen, AlertCircle } from 'lucide-react'
import { getHistory, deleteFromHistory, clearHistory, HistoryItem } from '../../utils/storage'

interface HistoryPanelProps {
  onLoadSummary: (item: HistoryItem) => void
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).length
  const mins = Math.ceil(words / 200)
  return mins < 1 ? '<1 min' : `${mins} min`
}

export default function HistoryPanel({ onLoadSummary }: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory().then((h) => { setItems(h); setLoading(false) })
  }, [])

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteFromHistory(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  async function handleClearAll() {
    await clearHistory()
    setItems([])
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id))
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-800 rounded-lg" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
          <Clock size={22} className="text-gray-600" />
        </div>
        <p className="text-gray-400 text-sm font-medium">No saved summaries yet</p>
        <p className="text-gray-600 text-xs text-center">
          Summarize a page and click the bookmark icon to save it here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-gray-400 text-[11px]">{items.length} saved</span>
        <button
          onClick={handleClearAll}
          className="flex items-center gap-1 text-red-400/70 hover:text-red-400 text-[11px] transition-colors"
        >
          <Trash2 size={11} />
          Clear all
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-1.5 px-3 pb-4">
        {items.map((item) => {
          const isOpen = expanded === item.id
          return (
            <div
              key={item.id}
              className="bg-gray-800/60 border border-gray-700/40 rounded-xl overflow-hidden
                         hover:border-violet-700/30 transition-colors"
            >
              {/* Header row */}
              <div
                className="flex items-start gap-2.5 p-3 cursor-pointer"
                onClick={() => toggleExpand(item.id)}
              >
                <div className="w-7 h-7 rounded-lg bg-violet-900/50 border border-violet-700/30
                                flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BookOpen size={13} className="text-violet-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-xs font-medium leading-snug line-clamp-2">
                    {item.title || 'Untitled Page'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500 text-[10px] truncate max-w-[160px]">
                      {item.url.replace(/^https?:\/\//, '')}
                    </span>
                    <span className="text-gray-600 text-[10px]">·</span>
                    <span className="text-gray-500 text-[10px] flex-shrink-0">{timeAgo(item.timestamp)}</span>
                    <span className="text-gray-600 text-[10px]">·</span>
                    <span className="text-gray-500 text-[10px] flex-shrink-0">~{readingTime(item.summary)}</span>
                  </div>
                  {item.translatedLang && (
                    <span className="inline-block mt-1 text-[10px] text-violet-400 bg-violet-900/30
                                     border border-violet-700/30 rounded px-1.5 py-0.5">
                      {item.translatedLang}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                  {isOpen ? (
                    <ChevronUp size={14} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-500" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {isOpen && (
                <div className="border-t border-gray-700/40 px-3 pt-3 pb-3">
                  <p className="text-gray-300 text-[11px] leading-relaxed whitespace-pre-wrap line-clamp-6">
                    {item.summary}
                  </p>
                  {item.translatedSummary && (
                    <div className="mt-2.5 pt-2.5 border-t border-gray-700/30">
                      <p className="text-violet-400 text-[10px] font-medium uppercase tracking-wider mb-1.5">
                        {item.translatedLang}
                      </p>
                      <p className="text-gray-400 text-[11px] leading-relaxed whitespace-pre-wrap line-clamp-4">
                        {item.translatedSummary}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => onLoadSummary(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
                                 bg-gradient-to-r from-violet-600 to-indigo-600 text-white
                                 hover:from-violet-500 hover:to-indigo-500 transition-all"
                    >
                      <BookOpen size={11} />
                      Load summary
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // active: false keeps popup open while opening the tab in background
                        chrome.tabs.create({ url: item.url, active: false })
                      }}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-300 text-[11px] transition-colors"
                    >
                      <ExternalLink size={11} />
                      Open page
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
