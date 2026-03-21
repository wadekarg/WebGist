import React, { useState, useEffect, useMemo } from 'react'
import {
  Trash2, Clock, ExternalLink, ChevronDown, ChevronUp,
  BookOpen, Search, Tag, X
} from 'lucide-react'
import { getHistory, deleteFromHistory, clearHistory, updateHistoryTags, HistoryItem } from '../../utils/storage'

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

const TAG_COLORS = [
  'bg-violet-900/40 text-violet-300 border-violet-700/40',
  'bg-blue-900/40 text-blue-300 border-blue-700/40',
  'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  'bg-amber-900/40 text-amber-300 border-amber-700/40',
  'bg-rose-900/40 text-rose-300 border-rose-700/40',
  'bg-cyan-900/40 text-cyan-300 border-cyan-700/40',
  'bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-700/40',
  'bg-lime-900/40 text-lime-300 border-lime-700/40',
]

function tagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export default function HistoryPanel({ onLoadSummary }: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    getHistory().then((h) => { setItems(h); setLoading(false) })
  }, [])

  // Collect all unique tags across all items
  const allTags = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => item.tags?.forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [items])

  // Filter items by search query and active tag
  const filtered = useMemo(() => {
    let result = items
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          (item.title || '').toLowerCase().includes(q) ||
          item.url.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q)
      )
    }
    if (activeTag) {
      result = result.filter((item) => item.tags?.includes(activeTag))
    }
    return result
  }, [items, searchQuery, activeTag])

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteFromHistory(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  async function handleClearAll() {
    await clearHistory()
    setItems([])
    setActiveTag(null)
    setSearchQuery('')
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id))
  }

  async function handleAddTag(item: HistoryItem) {
    const value = (tagInputs[item.id] || '').trim().toLowerCase()
    if (!value) return
    if (item.tags?.includes(value)) {
      setTagInputs((prev) => ({ ...prev, [item.id]: '' }))
      return
    }
    const newTags = [...(item.tags || []), value]
    await updateHistoryTags(item.id, newTags)
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, tags: newTags } : i))
    )
    setTagInputs((prev) => ({ ...prev, [item.id]: '' }))
  }

  async function handleRemoveTag(item: HistoryItem, tag: string) {
    const newTags = (item.tags || []).filter((t) => t !== tag)
    await updateHistoryTags(item.id, newTags)
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, tags: newTags } : i))
    )
    // If the removed tag was the active filter and no items have it anymore, clear filter
    if (activeTag === tag && !items.some((i) => i.id !== item.id && i.tags?.includes(tag))) {
      setActiveTag(null)
    }
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
        <span className="text-gray-400 text-[11px]">
          {filtered.length === items.length
            ? `${items.length} saved`
            : `${filtered.length} of ${items.length} shown`}
        </span>
        <button
          onClick={handleClearAll}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-red-400/70
                     hover:text-red-400 hover:bg-red-900/20 text-[11px] transition-colors"
        >
          <Trash2 size={11} />
          Clear all
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, URLs, summaries..."
            className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-gray-800/70 border border-gray-700/50
                       text-gray-200 text-[11px] placeholder-gray-500
                       focus:outline-none focus:border-violet-600/50 focus:ring-1 focus:ring-violet-600/30
                       transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
          <Tag size={11} className="text-gray-500 flex-shrink-0" />
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                         border transition-all cursor-pointer
                         ${activeTag === tag
                           ? 'bg-violet-600/40 text-violet-200 border-violet-500/60 ring-1 ring-violet-500/30'
                           : tagColor(tag) + ' hover:brightness-125'
                         }`}
            >
              {tag}
              {activeTag === tag && <X size={9} />}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-1.5 px-3 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <Search size={18} className="text-gray-600" />
            <p className="text-gray-500 text-xs">No matching summaries found</p>
          </div>
        ) : (
          filtered.map((item) => {
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
                      <span className="text-gray-600 text-[10px]">&middot;</span>
                      <span className="text-gray-500 text-[10px] flex-shrink-0">{timeAgo(item.timestamp)}</span>
                      <span className="text-gray-600 text-[10px]">&middot;</span>
                      <span className="text-gray-500 text-[10px] flex-shrink-0">~{readingTime(item.summary)}</span>
                    </div>
                    {item.translatedLang && (
                      <span className="inline-block mt-1 text-[10px] text-violet-400 bg-violet-900/30
                                       border border-violet-700/30 rounded px-1.5 py-0.5">
                        {item.translatedLang}
                      </span>
                    )}
                    {/* Inline tag pills on collapsed view */}
                    {item.tags?.length > 0 && !isOpen && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px]
                                       font-medium border ${tagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                        {item.tags.length > 3 && (
                          <span className="text-gray-500 text-[9px]">+{item.tags.length - 3}</span>
                        )}
                      </div>
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

                    {/* Tags section */}
                    <div className="mt-3 pt-2.5 border-t border-gray-700/30">
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <Tag size={11} className="text-gray-500" />
                        {item.tags?.length > 0 ? (
                          item.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full
                                         text-[10px] font-medium border ${tagColor(tag)}`}
                            >
                              {tag}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveTag(item, tag) }}
                                className="ml-0.5 hover:brightness-150 transition-all"
                              >
                                <X size={9} />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-600 text-[10px]">No tags</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={tagInputs[item.id] || ''}
                          onChange={(e) =>
                            setTagInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleAddTag(item) }
                          }}
                          placeholder="Add tag..."
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 px-2 py-1 rounded-md bg-gray-900/60 border border-gray-700/50
                                     text-gray-300 text-[10px] placeholder-gray-600
                                     focus:outline-none focus:border-violet-600/50 transition-colors"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddTag(item) }}
                          className="px-2 py-1 rounded-md text-[10px] font-medium
                                     bg-gray-700/50 text-gray-300 border border-gray-600/40
                                     hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => onLoadSummary(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
                                   text-white transition-all"
                        style={{ background: 'linear-gradient(to right, var(--grad-from), var(--grad-to))' }}
                      >
                        <BookOpen size={11} />
                        Load summary
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
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
          })
        )}
      </div>
    </div>
  )
}
