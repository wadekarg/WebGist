// ---- Settings ----

export interface CustomPrompt {
  id: string
  label: string
  prompt: string
}

export interface Settings {
  providerId: string
  model: string
  apiKeys: Record<string, string>
  customPrompts: CustomPrompt[]
  autoSummarize: boolean
  fallbackProviders: string[]
  summaryLength: 'short' | 'medium' | 'long'
  theme: 'dark' | 'light' | 'system'
}

const DEFAULT_SETTINGS: Settings = {
  providerId: 'gemini',
  model: 'gemini-2.0-flash',
  apiKeys: {},
  customPrompts: [],
  autoSummarize: false,
  fallbackProviders: [],
  summaryLength: 'medium',
  theme: 'dark',
}

export async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['webgist_settings'], (result) => {
      if (chrome.runtime.lastError) {
        resolve(DEFAULT_SETTINGS)
        return
      }
      const stored = result['webgist_settings']
      if (stored && typeof stored === 'object') {
        // Migrate old format: { apiKey: string } → { apiKeys: Record<string, string> }
        if (typeof stored.apiKey === 'string' && !stored.apiKeys) {
          const providerId: string = stored.providerId ?? DEFAULT_SETTINGS.providerId
          resolve({
            ...DEFAULT_SETTINGS,
            providerId,
            model: stored.model ?? DEFAULT_SETTINGS.model,
            apiKeys: stored.apiKey ? { [providerId]: stored.apiKey } : {},
          })
        } else {
          resolve({ ...DEFAULT_SETTINGS, ...stored })
        }
      } else {
        resolve(DEFAULT_SETTINGS)
      }
    })
  })
}

export async function saveSettings(s: Settings): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ webgist_settings: s }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve()
      }
    })
  })
}

// ---- History ----

export interface HistoryItem {
  id: string
  url: string
  title: string
  summary: string
  translatedSummary?: string
  translatedLang?: string
  translatedLangCode?: string
  timestamp: number
  tags: string[]
  mode?: string
  providerId?: string
  tokensUsed?: number
}

const MAX_HISTORY = 50

export async function getHistory(): Promise<HistoryItem[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['webgist_history'], (result) => {
      if (chrome.runtime.lastError) { resolve([]); return }
      const items: HistoryItem[] = result['webgist_history'] ?? []
      // Ensure tags array exists on migrated items
      resolve(items.map(h => ({ ...h, tags: h.tags ?? [] })))
    })
  })
}

export async function saveToHistory(
  item: Omit<HistoryItem, 'id' | 'timestamp'>
): Promise<HistoryItem> {
  const history = await getHistory()
  const newItem: HistoryItem = {
    ...item,
    tags: item.tags ?? [],
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  }
  const filtered = history.filter((h) => h.url !== item.url)
  const updated = [newItem, ...filtered].slice(0, MAX_HISTORY)
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ webgist_history: updated }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve(newItem)
    })
  })
}

export async function updateHistoryTags(id: string, tags: string[]): Promise<void> {
  const history = await getHistory()
  const updated = history.map(h => h.id === id ? { ...h, tags } : h)
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ webgist_history: updated }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve()
    })
  })
}

export async function deleteFromHistory(id: string): Promise<void> {
  const history = await getHistory()
  const updated = history.filter((h) => h.id !== id)
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ webgist_history: updated }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve()
    })
  })
}

export async function clearHistory(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ webgist_history: [] }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve()
    })
  })
}

// ---- Session (per-tab summary cache, cleared on browser close) ----

export interface SessionSummary {
  url: string
  title: string
  summary: string
  translatedSummary?: string
  translatedLang?: string
  translatedLangCode?: string
}

export async function getSessionSummary(tabId: number): Promise<SessionSummary | null> {
  return new Promise((resolve) => {
    const key = `session_tab_${tabId}`
    try {
      chrome.storage.session.get([key], (result) => {
        if (chrome.runtime.lastError) { resolve(null); return }
        resolve(result[key] ?? null)
      })
    } catch {
      resolve(null)
    }
  })
}

export async function saveSessionSummary(tabId: number, data: SessionSummary): Promise<void> {
  return new Promise((resolve) => {
    const key = `session_tab_${tabId}`
    try {
      chrome.storage.session.set({ [key]: data }, () => { resolve() })
    } catch {
      resolve()
    }
  })
}

// ---- Token usage tracking ----

export interface TokenUsageEntry {
  providerId: string
  date: string  // YYYY-MM-DD
  tokens: number
}

export async function recordTokenUsage(providerId: string, tokens: number): Promise<void> {
  if (!tokens || tokens <= 0) return
  const date = new Date().toISOString().slice(0, 10)
  return new Promise((resolve) => {
    chrome.storage.local.get(['webgist_tokens'], (result) => {
      const entries: TokenUsageEntry[] = result['webgist_tokens'] ?? []
      const existing = entries.find(e => e.providerId === providerId && e.date === date)
      if (existing) {
        existing.tokens += tokens
      } else {
        entries.push({ providerId, date, tokens })
      }
      // Keep only last 30 days
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      const pruned = entries.filter(e => e.date >= cutoffStr)
      chrome.storage.local.set({ webgist_tokens: pruned }, () => resolve())
    })
  })
}

export async function getTokenUsage(): Promise<TokenUsageEntry[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['webgist_tokens'], (result) => {
      if (chrome.runtime.lastError) { resolve([]); return }
      resolve(result['webgist_tokens'] ?? [])
    })
  })
}

// ---- Offline summary cache ----

export interface CachedSummary {
  url: string
  summary: string
  mode: string
  timestamp: number
}

const MAX_CACHE = 100

export async function getCachedSummary(url: string, mode: string): Promise<CachedSummary | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['webgist_cache'], (result) => {
      if (chrome.runtime.lastError) { resolve(null); return }
      const cache: CachedSummary[] = result['webgist_cache'] ?? []
      resolve(cache.find(c => c.url === url && c.mode === mode) ?? null)
    })
  })
}

export async function saveCachedSummary(entry: CachedSummary): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['webgist_cache'], (result) => {
      const cache: CachedSummary[] = result['webgist_cache'] ?? []
      const filtered = cache.filter(c => !(c.url === entry.url && c.mode === entry.mode))
      const updated = [entry, ...filtered].slice(0, MAX_CACHE)
      chrome.storage.local.set({ webgist_cache: updated }, () => resolve())
    })
  })
}

export async function clearSummaryCache(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ webgist_cache: [] }, () => resolve())
  })
}
