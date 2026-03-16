// ---- Settings ----

export interface Settings {
  providerId: string
  model: string
  apiKeys: Record<string, string>
}

const DEFAULT_SETTINGS: Settings = {
  providerId: 'gemini',
  model: 'gemini-2.0-flash',
  apiKeys: {},
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
}

const MAX_HISTORY = 50

export async function getHistory(): Promise<HistoryItem[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['webgist_history'], (result) => {
      if (chrome.runtime.lastError) { resolve([]); return }
      resolve(result['webgist_history'] ?? [])
    })
  })
}

export async function saveToHistory(
  item: Omit<HistoryItem, 'id' | 'timestamp'>
): Promise<HistoryItem> {
  const history = await getHistory()
  const newItem: HistoryItem = {
    ...item,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  }
  // Replace existing entry for the same URL
  const filtered = history.filter((h) => h.url !== item.url)
  const updated = [newItem, ...filtered].slice(0, MAX_HISTORY)
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ webgist_history: updated }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else resolve(newItem)
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
    // Keyed by tab ID so each tab has its own summary; session storage clears on browser close
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
    // Same key scheme as getSessionSummary — one entry per tab
    const key = `session_tab_${tabId}`
    try {
      chrome.storage.session.set({ [key]: data }, () => { resolve() })
    } catch {
      resolve()
    }
  })
}

