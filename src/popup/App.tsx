import React, { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header'
import ProviderSettings from './components/ProviderSettings'
import SummaryPanel from './components/SummaryPanel'
import TranslationPanel from './components/TranslationPanel'
import AudioControls from './components/AudioControls'
import ExportPanel from './components/ExportPanel'
import HistoryPanel from './components/HistoryPanel'
import {
  getSettings, Settings,
  getHistory, saveToHistory, HistoryItem,
  getSessionSummary, saveSessionSummary, SessionSummary,
  recordTokenUsage,
  getCachedSummary, saveCachedSummary,
  saveSettings,
} from '../utils/storage'
import { getProviderById, type ApiRequestPayload } from '../utils/providers'
import { googleTranslate } from '../utils/googleTranslate'
import { type SummaryMode } from './components/SummaryPanel'

const SUMMARY_PROMPTS: Record<string, string> = {
  keypoints: 'Summarize the following webpage content. Write 6-8 numbered points (1. 2. 3. etc). Plain text only — no asterisks, no bold, no markdown. Each point on its own line.',
  brief:     'Write a concise 3-4 sentence overview of the following webpage content. Plain text only — no asterisks, no markdown.',
  eli5:      'Explain the following webpage content in very simple, plain language as if to someone unfamiliar with the topic. Write 5-7 numbered points. Avoid jargon. Plain text only.',
  actions:   'Extract the key actionable takeaways from the following webpage content. Write 5-8 numbered action items. Each item must start with an action verb (e.g. "Use", "Avoid", "Check"). Plain text only.',
  proscons:  'List the pros and cons from the following webpage content. Use this exact format:\nPros:\n1. ...\n\nCons:\n1. ...\n\nPlain text only — no asterisks, no markdown.',
}

const LENGTH_MODIFIERS: Record<string, string> = {
  short: 'Be extremely concise. Keep the response under 80 words.',
  medium: '',
  long: 'Provide a detailed, comprehensive response. Aim for 300-500 words with thorough coverage.',
}

type Status = 'idle' | 'loading' | 'streaming' | 'done' | 'error'
type ActiveTab = 'summary' | 'history' | 'settings'

// Strip markdown formatting from AI responses
function cleanAiText(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/gs, '$1')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-•]\s+/gm, '• ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~(.+?)~~/gs, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface PageData {
  text: string
  title: string
  url: string
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary')
  const [settings, setSettings] = useState<Settings>({
    providerId: 'gemini',
    model: 'gemini-2.0-flash',
    apiKeys: {},
    customPrompts: [],
    autoSummarize: false,
    fallbackProviders: [],
    summaryLength: 'medium',
    theme: 'dark',
  })

  const [summary, setSummary] = useState('')
  const [prevSummary, setPrevSummary] = useState('')
  const [translatedSummary, setTranslatedSummary] = useState('')
  const [translatedLang, setTranslatedLang] = useState('')
  const [translatedLangCode, setTranslatedLangCode] = useState('')
  const [pageData, setPageData] = useState<PageData>({ text: '', title: '', url: '' })

  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [isExtracting, setIsExtracting] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translateError, setTranslateError] = useState('')

  const [isSaved, setIsSaved] = useState(false)
  const [isCached, setIsCached] = useState(false)
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)
  const [currentMode, setCurrentMode] = useState<string>('keypoints')
  const [usedFallback, setUsedFallback] = useState<string | null>(null)

  const autoSummarizeTriggered = useRef(false)

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme === 'light' ? 'light' : 'dark')
  }, [settings.theme])

  // Load settings and restore session summary on mount
  useEffect(() => {
    getSettings().then((s) => setSettings(s))

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return
      setCurrentTabId(tab.id)

      const session = await getSessionSummary(tab.id)
      if (session?.summary) {
        setPageData({ text: '', title: session.title, url: session.url })
        setSummary(session.summary)
        if (session.translatedSummary) setTranslatedSummary(session.translatedSummary)
        if (session.translatedLang) setTranslatedLang(session.translatedLang)
        if (session.translatedLangCode) setTranslatedLangCode(session.translatedLangCode)
        setStatus('done')

        const history = await getHistory()
        setIsSaved(history.some((h) => h.url === session.url))
      }
    })
  }, [])

  // Auto-summarize on mount if enabled and no existing summary
  useEffect(() => {
    if (
      settings.autoSummarize &&
      !autoSummarizeTriggered.current &&
      status === 'idle' &&
      (settings.apiKeys[settings.providerId] ?? '').trim()
    ) {
      autoSummarizeTriggered.current = true
      handleSummarize('keypoints')
    }
  }, [settings])

  // Listen for messages from content script (context menu, keyboard shortcut)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'AUTO_SUMMARIZE') {
        if (status !== 'loading' && status !== 'streaming') {
          handleSummarize('keypoints')
        }
      }
      if (event.data?.type === 'SUMMARIZE_SELECTION' && event.data.text) {
        handleSummarizeText(event.data.text)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [settings, status])

  function handleSettingsChange(s: Settings) {
    setSettings(s)
  }

  // ---- Streaming AI request ----

  const sendAiRequestStreaming = useCallback(
    async (systemPrompt: string, userContent: string): Promise<void> => {
      const provider = getProviderById(settings.providerId)
      if (provider?.supportsStreaming) {
        return new Promise((resolve, reject) => {
          const port = chrome.runtime.connect({ name: 'ai-stream' })
          port.postMessage({
            type: 'AI_STREAM_REQUEST',
            payload: {
              provider: settings.providerId,
              model: settings.model,
              apiKey: settings.apiKeys[settings.providerId] ?? '',
              systemPrompt,
              userContent,
            } satisfies ApiRequestPayload,
          })
          port.onMessage.addListener((msg: { type: string; text?: string; error?: string }) => {
            if (msg.type === 'AI_STREAM_CHUNK' && msg.text) {
              setSummary(prev => prev + msg.text)
            }
            if (msg.type === 'AI_STREAM_END') {
              port.disconnect()
              resolve()
            }
            if (msg.type === 'AI_STREAM_ERROR') {
              port.disconnect()
              reject(new Error(msg.error ?? 'Streaming error'))
            }
          })
          port.onDisconnect.addListener(() => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            }
          })
        })
      }
      // Fallback to non-streaming
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'AI_REQUEST',
            payload: {
              provider: settings.providerId,
              model: settings.model,
              apiKey: settings.apiKeys[settings.providerId] ?? '',
              systemPrompt,
              userContent,
            } satisfies ApiRequestPayload,
          },
          (response: { text?: string; error?: string; tokensUsed?: number } | undefined) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            if (!response) { reject(new Error('No response from service worker')); return }
            if (response.error) { reject(new Error(response.error)); return }
            setSummary(response.text ?? '')
            if (response.tokensUsed) {
              recordTokenUsage(settings.providerId, response.tokensUsed)
            }
            resolve()
          }
        )
      })
    },
    [settings]
  )

  // ---- Fallback-aware AI request ----

  const sendAiRequestWithFallback = useCallback(
    async (systemPrompt: string, userContent: string): Promise<void> => {
      const providerIds = [settings.providerId, ...settings.fallbackProviders]
        .filter((id, i, arr) => arr.indexOf(id) === i)  // dedupe
        .filter(id => id === 'ollama' || (settings.apiKeys[id] ?? '').trim())

      for (let i = 0; i < providerIds.length; i++) {
        const pid = providerIds[i]
        try {
          const provider = getProviderById(pid)
          const model = pid === settings.providerId ? settings.model : (provider?.defaultModel ?? '')

          const payload: ApiRequestPayload = {
            provider: pid,
            model,
            apiKey: settings.apiKeys[pid] ?? '',
            systemPrompt,
            userContent,
          }

          if (provider?.supportsStreaming) {
            await new Promise<void>((resolve, reject) => {
              const port = chrome.runtime.connect({ name: 'ai-stream' })
              port.postMessage({ type: 'AI_STREAM_REQUEST', payload })
              port.onMessage.addListener((msg: { type: string; text?: string; error?: string }) => {
                if (msg.type === 'AI_STREAM_CHUNK' && msg.text) {
                  setSummary(prev => prev + msg.text)
                }
                if (msg.type === 'AI_STREAM_END') { port.disconnect(); resolve() }
                if (msg.type === 'AI_STREAM_ERROR') { port.disconnect(); reject(new Error(msg.error)) }
              })
              port.onDisconnect.addListener(() => {
                if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
              })
            })
          } else {
            await new Promise<void>((resolve, reject) => {
              chrome.runtime.sendMessage(
                { type: 'AI_REQUEST', payload },
                (response: { text?: string; error?: string; tokensUsed?: number } | undefined) => {
                  if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return }
                  if (!response || response.error) { reject(new Error(response?.error ?? 'No response')); return }
                  setSummary(response.text ?? '')
                  if (response.tokensUsed) recordTokenUsage(pid, response.tokensUsed)
                  resolve()
                }
              )
            })
          }

          if (i > 0) setUsedFallback(provider?.name ?? pid)
          return
        } catch (err) {
          setSummary('')  // clear partial streaming on failure
          if (i === providerIds.length - 1) throw err
          // else try next provider
        }
      }
    },
    [settings]
  )

  // withJina=true: Full Page mode — tries Trafilatura → Jina → Readability
  // withJina=false: AI Summary — tries Trafilatura → Readability (skip slow Jina)
  const getPageText = useCallback((withJina = false): Promise<PageData> => {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        const tab = tabs[0]
        if (!tab?.id) { reject(new Error('No active tab found')); return }
        const tabId = tab.id
        const url = tab.url || ''
        const title = tab.title || ''

        chrome.runtime.sendMessage(
          { type: 'ENHANCED_EXTRACT', tabId, url, withJina },
          (enhanced: { text: string } | undefined) => {
            if (!chrome.runtime.lastError && enhanced?.text?.trim()) {
              resolve({ text: enhanced.text, title, url })
              return
            }

            const useReadability = () => {
              chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_TEXT' }, (r: PageData | undefined) => {
                if (!chrome.runtime.lastError && r) { resolve(r); return }
                chrome.scripting.executeScript(
                  { target: { tabId }, files: ['content/index.js'] },
                  () => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(`Could not extract page content: ${chrome.runtime.lastError.message}`))
                      return
                    }
                    setTimeout(() => {
                      chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_TEXT' }, (r2: PageData | undefined) => {
                        if (!chrome.runtime.lastError && r2) resolve(r2)
                        else reject(new Error('Could not extract page content'))
                      })
                    }, 100)
                  }
                )
              })
            }
            useReadability()
          }
        )
      })
    })
  }, [])

  async function persistSession(data: SessionSummary) {
    if (currentTabId) {
      await saveSessionSummary(currentTabId, data)
    }
  }

  async function handleSummarize(mode: string = 'keypoints') {
    const isOllama = settings.providerId === 'ollama'
    if (!isOllama && !(settings.apiKeys[settings.providerId] ?? '').trim()) return
    if (status === 'loading' || status === 'streaming') return

    // Save previous summary for comparison
    if (summary) setPrevSummary(summary)

    setStatus('streaming')
    setErrorMessage('')
    setSummary('')
    setTranslatedSummary('')
    setTranslatedLang('')
    setTranslatedLangCode('')
    setIsSaved(false)
    setIsCached(false)
    setUsedFallback(null)
    setCurrentMode(mode)

    try {
      const data = await getPageText(false)
      setPageData(data)

      if (!data.text.trim()) {
        throw new Error('Could not extract text from this page. It may be a PDF or protected page.')
      }

      // Check offline cache
      const cached = await getCachedSummary(data.url, mode)
      if (cached) {
        setSummary(cached.summary)
        setStatus('done')
        setIsCached(true)
        await persistSession({ url: data.url, title: data.title, summary: cached.summary })
        const history = await getHistory()
        setIsSaved(history.some((h) => h.url === data.url))
        return
      }

      const provider = getProviderById(settings.providerId)
      const maxChars = provider?.maxInputChars ?? 15000

      // Look up prompt: built-in or custom
      let systemPrompt = SUMMARY_PROMPTS[mode]
      if (!systemPrompt) {
        const custom = settings.customPrompts.find(p => p.id === mode)
        systemPrompt = custom?.prompt ?? SUMMARY_PROMPTS['keypoints']
      }

      // Apply length modifier
      const lengthMod = LENGTH_MODIFIERS[settings.summaryLength] ?? ''
      if (lengthMod) systemPrompt = `${lengthMod}\n\n${systemPrompt}`

      const userContent = `Title: ${data.title}\nURL: ${data.url}\n\nContent:\n${data.text.slice(0, maxChars)}`

      await sendAiRequestWithFallback(systemPrompt, userContent)

      // After streaming completes, get the final summary from state
      // We need to use a callback since setSummary is async
      setSummary(prev => {
        const trimmed = cleanAiText(prev.trim())
        if (!trimmed) {
          setErrorMessage('AI returned an empty response. Please try again.')
          setStatus('error')
          return prev
        }

        setStatus('done')

        // Cache and persist
        persistSession({ url: data.url, title: data.title, summary: trimmed })
        saveCachedSummary({ url: data.url, summary: trimmed, mode, timestamp: Date.now() })
        getHistory().then(history => {
          setIsSaved(history.some((h) => h.url === data.url))
        })

        return trimmed
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setErrorMessage(msg)
      setStatus('error')
    }
  }

  // Summarize arbitrary text (from context menu selection)
  async function handleSummarizeText(text: string) {
    const isOllama = settings.providerId === 'ollama'
    if (!isOllama && !(settings.apiKeys[settings.providerId] ?? '').trim()) return
    if (status === 'loading' || status === 'streaming') return

    if (summary) setPrevSummary(summary)

    setStatus('streaming')
    setErrorMessage('')
    setSummary('')
    setTranslatedSummary('')
    setTranslatedLang('')
    setTranslatedLangCode('')
    setIsSaved(false)
    setIsCached(false)
    setUsedFallback(null)

    try {
      const systemPrompt = 'Summarize the following text. Write 4-6 numbered points. Plain text only — no asterisks, no markdown.'
      const userContent = `Text:\n${text.slice(0, 15000)}`

      await sendAiRequestWithFallback(systemPrompt, userContent)

      setSummary(prev => {
        const trimmed = cleanAiText(prev.trim())
        setStatus(trimmed ? 'done' : 'error')
        if (!trimmed) setErrorMessage('AI returned an empty response.')
        return trimmed || prev
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setErrorMessage(msg)
      setStatus('error')
    }
  }

  // Multi-tab summarization
  async function handleMultiTabSummarize() {
    const isOllama = settings.providerId === 'ollama'
    if (!isOllama && !(settings.apiKeys[settings.providerId] ?? '').trim()) return
    if (status === 'loading' || status === 'streaming') return

    if (summary) setPrevSummary(summary)

    setStatus('streaming')
    setErrorMessage('')
    setSummary('')
    setTranslatedSummary('')
    setTranslatedLang('')
    setTranslatedLangCode('')
    setIsSaved(false)
    setIsCached(false)
    setUsedFallback(null)

    try {
      const response = await new Promise<{ tabs: { title: string; url: string; text: string }[] }>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'MULTI_TAB_EXTRACT' }, (res) => {
          if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return }
          resolve(res as { tabs: { title: string; url: string; text: string }[] })
        })
      })

      if (!response.tabs?.length) throw new Error('No tabs to summarize. Select multiple tabs with Ctrl+Click.')

      const systemPrompt = `Summarize the following ${response.tabs.length} webpages together. Identify common themes and key differences. Write 8-10 numbered points. Plain text only — no markdown.`

      const maxPerTab = Math.floor(15000 / response.tabs.length)
      const userContent = response.tabs
        .map((t, i) => `--- Page ${i + 1}: ${t.title} ---\nURL: ${t.url}\n${t.text.slice(0, maxPerTab)}`)
        .join('\n\n')

      setPageData({ text: '', title: `Summary of ${response.tabs.length} pages`, url: '' })

      await sendAiRequestWithFallback(systemPrompt, userContent)

      setSummary(prev => {
        const trimmed = cleanAiText(prev.trim())
        setStatus(trimmed ? 'done' : 'error')
        if (!trimmed) setErrorMessage('AI returned an empty response.')
        return trimmed || prev
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setErrorMessage(msg)
      setStatus('error')
    }
  }

  async function handleResync() {
    setIsCached(false)
    handleSummarize(currentMode)
  }

  async function handleExtractPage() {
    setIsExtracting(true)
    setErrorMessage('')
    if (summary) setPrevSummary(summary)
    setSummary('')
    setTranslatedSummary('')
    setTranslatedLang('')
    setTranslatedLangCode('')
    setIsSaved(false)
    setIsCached(false)
    setStatus('idle')

    try {
      const data = await getPageText(true)
      setPageData(data)

      if (!data.text.trim()) {
        throw new Error('Could not extract text from this page.')
      }

      setSummary(data.text)
      setStatus('done')
      await persistSession({ url: data.url, title: data.title, summary: data.text })
      const history = await getHistory()
      setIsSaved(history.some((h) => h.url === data.url))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setErrorMessage(msg)
      setStatus('error')
    } finally {
      setIsExtracting(false)
    }
  }

  async function handleTranslate(langCode: string, langName: string) {
    if (!summary) return

    setIsTranslating(true)
    setTranslateError('')
    setTranslatedSummary('')
    setTranslatedLang(langName)
    setTranslatedLangCode(langCode)

    try {
      const trimmed = await googleTranslate(summary, langCode)
      setTranslatedSummary(trimmed)

      await persistSession({
        url: pageData.url,
        title: pageData.title,
        summary,
        translatedSummary: trimmed,
        translatedLang: langName,
        translatedLangCode: langCode,
      })

      if (isSaved) {
        await saveToHistory({
          url: pageData.url,
          title: pageData.title,
          summary,
          translatedSummary: trimmed,
          translatedLang: langName,
          translatedLangCode: langCode,
          tags: [],
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Translation failed'
      setTranslateError(msg)
      setTranslatedLang('')
      setTranslatedLangCode('')
    } finally {
      setIsTranslating(false)
    }
  }

  async function handleSaveToHistory() {
    if (!summary) return
    await saveToHistory({
      url: pageData.url,
      title: pageData.title,
      summary,
      translatedSummary: translatedSummary || undefined,
      translatedLang: translatedLang || undefined,
      translatedLangCode: translatedLangCode || undefined,
      tags: [],
      mode: currentMode,
      providerId: settings.providerId,
    })
    setIsSaved(true)
  }

  function handleLoadFromHistory(item: HistoryItem) {
    setPageData({ text: '', title: item.title, url: item.url })
    setSummary(item.summary)
    setTranslatedSummary(item.translatedSummary ?? '')
    setTranslatedLang(item.translatedLang ?? '')
    setTranslatedLangCode(item.translatedLangCode ?? '')
    setStatus('done')
    setIsSaved(true)
    setActiveTab('summary')
  }

  const isOllama = settings.providerId === 'ollama'
  const hasApiKey = isOllama || (settings.apiKeys[settings.providerId] ?? '').trim().length > 0
  const providerName = getProviderById(settings.providerId)?.name ?? settings.providerId
  const hasSummary = (status === 'done' || status === 'streaming') && summary.length > 0

  return (
    <div
      className="w-full min-h-screen overflow-y-auto bg-gray-900 text-white flex flex-col"
      style={{ minHeight: '100vh' }}
    >
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={settings.theme}
        onThemeChange={(theme) => {
          const updated = { ...settings, theme }
          setSettings(updated)
          saveSettings(updated)
        }}
      />

      {activeTab === 'settings' && (
        <ProviderSettings settings={settings} onSettingsChange={handleSettingsChange} />
      )}

      {activeTab === 'history' && (
        <HistoryPanel onLoadSummary={handleLoadFromHistory} />
      )}

      {activeTab === 'summary' && (
        <>
          {hasApiKey && (
            <div className="px-4 pt-3">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Using <span className="text-gray-200 font-medium">{providerName}</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500 truncate max-w-[160px]">{settings.model}</span>
              </div>
              {usedFallback && (
                <div className="text-[10px] text-amber-400 mt-0.5">
                  Primary provider failed — used {usedFallback} instead
                </div>
              )}
            </div>
          )}

          <SummaryPanel
            summary={summary}
            prevSummary={prevSummary}
            status={status}
            errorMessage={errorMessage}
            hasApiKey={hasApiKey}
            isSaved={isSaved}
            isCached={isCached}
            isExtracting={isExtracting}
            customPrompts={settings.customPrompts}
            summaryLength={settings.summaryLength}
            pageTitle={pageData.title}
            pageUrl={pageData.url}
            onSummarize={(mode) => handleSummarize(mode)}
            onExtractPage={handleExtractPage}
            onMultiTab={handleMultiTabSummarize}
            onSave={handleSaveToHistory}
            onResync={handleResync}
            onLengthChange={(len) => {
              const updated = { ...settings, summaryLength: len }
              setSettings(updated)
              saveSettings(updated)
            }}
            onCustomPromptsChange={(prompts) => {
              const updated = { ...settings, customPrompts: prompts }
              setSettings(updated)
              saveSettings(updated)
            }}
          />

          {hasSummary && status === 'done' && (
            <TranslationPanel
              summary={summary}
              translatedSummary={translatedSummary}
              isTranslating={isTranslating}
              translateError={translateError}
              onTranslate={handleTranslate}
            />
          )}

          {hasSummary && status === 'done' && (
            <AudioControls
              originalText={summary}
              translatedText={translatedSummary || undefined}
              translatedLang={translatedLang || undefined}
              translatedLangCode={translatedLangCode || undefined}
            />
          )}

          {hasSummary && status === 'done' && (
            <ExportPanel
              summary={summary}
              translatedSummary={translatedSummary}
              translatedLang={translatedLang}
              pageTitle={pageData.title}
              pageUrl={pageData.url}
            />
          )}

          {status === 'idle' && !hasApiKey && (
            <div className="px-4 pb-6 pt-2 text-center">
              <div className="text-gray-600 text-xs">
                Open Settings to configure your AI provider, then summarize any webpage instantly.
              </div>
            </div>
          )}

          {status === 'idle' && hasApiKey && (
            <div className="px-4 pb-4 pt-0 text-center">
              <div className="text-gray-600 text-xs">
                Navigate to any webpage and click "AI Summary"
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
