import React, { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import ProviderSettings from './components/ProviderSettings'
import SummaryPanel from './components/SummaryPanel'
import TranslationPanel from './components/TranslationPanel'
import AudioControls from './components/AudioControls'
import ExportPanel from './components/ExportPanel'
import HistoryPanel from './components/HistoryPanel'
import ReaderPanel from './components/ReaderPanel'
import {
  getSettings, Settings,
  getHistory, saveToHistory, HistoryItem,
  getSessionSummary, saveSessionSummary, SessionSummary,
  getReaderSession, saveReaderSession, ReaderSession,
} from '../utils/storage'
import { getProviderById } from '../utils/providers'
import { googleTranslate } from '../utils/googleTranslate'
import { extractiveSummary } from '../utils/extractiveSummary'
import { type SummaryMode } from './components/SummaryPanel'

const SUMMARY_PROMPTS: Record<SummaryMode, string> = {
  keypoints: 'Summarize the following webpage content. Write 6-8 numbered points (1. 2. 3. etc). Plain text only — no asterisks, no bold, no markdown. Each point on its own line.',
  brief:     'Write a concise 3-4 sentence overview of the following webpage content. Plain text only — no asterisks, no markdown.',
  eli5:      'Explain the following webpage content in very simple, plain language as if to someone unfamiliar with the topic. Write 5-7 numbered points. Avoid jargon. Plain text only.',
  actions:   'Extract the key actionable takeaways from the following webpage content. Write 5-8 numbered action items. Each item must start with an action verb (e.g. "Use", "Avoid", "Check"). Plain text only.',
  proscons:  'List the pros and cons from the following webpage content. Use this exact format:\nPros:\n1. ...\n\nCons:\n1. ...\n\nPlain text only — no asterisks, no markdown.',
}

type Status = 'idle' | 'loading' | 'done' | 'error'
type ReaderStatus = 'idle' | 'extracting' | 'ready' | 'error'
type ActiveTab = 'summary' | 'reader' | 'history' | 'settings'

// Strip markdown formatting from AI responses so asterisks aren't read aloud
function cleanAiText(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/gs, '$1')   // ***bold italic***
    .replace(/\*\*(.+?)\*\*/gs, '$1')        // **bold**
    .replace(/\*([^*\n]+?)\*/gs, '$1')       // *italic*
    .replace(/^#{1,6}\s+/gm, '')             // ## Headings
    .replace(/^[-•]\s+/gm, '• ')            // - bullet → •
    .replace(/`([^`]+)`/g, '$1')             // `code`
    .replace(/~~(.+?)~~/gs, '$1')            // ~~strikethrough~~
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) → text
    .replace(/[ \t]+$/gm, '')                // trailing spaces
    .replace(/\n{3,}/g, '\n\n')              // collapse blank lines
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
  })

  const [summary, setSummary] = useState('')
  const [translatedSummary, setTranslatedSummary] = useState('')
  const [translatedLang, setTranslatedLang] = useState('')
  const [translatedLangCode, setTranslatedLangCode] = useState('')
  const [pageData, setPageData] = useState<PageData>({ text: '', title: '', url: '' })

  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [isTranslating, setIsTranslating] = useState(false)
  const [translateError, setTranslateError] = useState('')

  const [isSaved, setIsSaved] = useState(false)
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)

  // Reader mode state
  const [readerStatus, setReaderStatus] = useState<ReaderStatus>('idle')
  const [readerErrorMsg, setReaderErrorMsg] = useState('')
  const [readerText, setReaderText] = useState('')
  const [readerTitle, setReaderTitle] = useState('')
  const [readerUrl, setReaderUrl] = useState('')
  const [readerTranslation, setReaderTranslation] = useState('')
  const [readerTranslatedLang, setReaderTranslatedLang] = useState('')
  const [readerTranslatedLangCode, setReaderTranslatedLangCode] = useState('')
  const [isTranslatingReader, setIsTranslatingReader] = useState(false)
  const [readerTranslateProgress, setReaderTranslateProgress] = useState(0)
  const [readerTranslateError, setReaderTranslateError] = useState('')

  // Load settings and restore session summary on mount
  useEffect(() => {
    getSettings().then((s) => setSettings(s))

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return
      setCurrentTabId(tab.id)

      // Restore cached session summary for this tab
      const session = await getSessionSummary(tab.id)
      if (session?.summary) {
        setPageData({ text: '', title: session.title, url: session.url })
        setSummary(session.summary)
        if (session.translatedSummary) setTranslatedSummary(session.translatedSummary)
        if (session.translatedLang) setTranslatedLang(session.translatedLang)
        setStatus('done')

        // Check if this URL is already in history
        const history = await getHistory()
        setIsSaved(history.some((h) => h.url === session.url))
      }

      const readerSess = await getReaderSession()
      if (readerSess?.text) {
        setReaderText(readerSess.text)
        setReaderTitle(readerSess.title)
        setReaderUrl(readerSess.url)
        if (readerSess.translation) setReaderTranslation(readerSess.translation)
        if (readerSess.translatedLang) setReaderTranslatedLang(readerSess.translatedLang)
        if (readerSess.translatedLangCode) setReaderTranslatedLangCode(readerSess.translatedLangCode)
        setReaderStatus('ready')
      }
    })
  }, [])

  function handleSettingsChange(s: Settings) {
    setSettings(s)
  }

  const sendAiRequest = useCallback(
    async (prompt: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'AI_REQUEST',
            payload: {
              provider: settings.providerId,
              model: settings.model,
              apiKey: settings.apiKeys[settings.providerId] ?? '',
              prompt,
            },
          },
          (response: { text?: string; error?: string } | undefined) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            if (!response) {
              reject(new Error('No response from background service worker'))
              return
            }
            if (response.error) {
              reject(new Error(response.error))
              return
            }
            resolve(response.text ?? '')
          }
        )
      })
    },
    [settings]
  )

  const getPageText = useCallback((): Promise<PageData> => {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        const tab = tabs[0]
        if (!tab?.id) {
          reject(new Error('No active tab found'))
          return
        }

        const tabId = tab.id

        chrome.tabs.sendMessage(
          tabId,
          { type: 'GET_PAGE_TEXT' },
          (response: PageData | undefined) => {
            if (!chrome.runtime.lastError && response) {
              resolve(response)
              return
            }

            // Content script not loaded — inject inline via scripting API
            chrome.scripting.executeScript(
              {
                target: { tabId },
                func: (): { text: string; title: string; url: string } => {
                  const CONTENT = [
                    'article','main','[role="main"]','[itemprop="articleBody"]',
                    '.post-content','.entry-content','.article-content','.article-body',
                    '.story-body','.story-content','.content-body','.post-body','.blog-content',
                    '.post-control','.post-inner','.entry-body','.td-post-content',
                    '#article-body','#story-body','#content-body',
                    '.main-content','#main-content','.page-content','#page-content',
                  ]
                  const SAFE_TAGS = ['script','style','noscript','iframe','svg','canvas','video','nav','header','footer','aside','[role="navigation"]','[role="banner"]','[role="complementary"]','[role="contentinfo"]','[role="search"]','[aria-hidden="true"]']
                  const clean = (t: string) => t.replace(/#[\w\u0080-\uFFFF]+/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').replace(/^\s+|\s+$/gm,'').trim()
                  // Try content selectors on live document (innerText works correctly)
                  for (const sel of CONTENT) {
                    try {
                      const el = document.querySelector(sel) as HTMLElement | null
                      if (!el) continue
                      const t = el.innerText.trim()
                      if (t.length > 300) return { text: clean(t), title: document.title || '', url: window.location.href }
                    } catch { /* skip */ }
                  }
                  // Density scoring on live document (innerText accurate, skip noise ancestors)
                  const best = Array.from(document.querySelectorAll('div,section,article,main'))
                    .filter(el => !el.closest('nav,header,footer,aside'))
                    .map(el => { const h=el as HTMLElement; const p=el.querySelectorAll('p,h2,h3,h4,li').length; const t=h.innerText; const w=t.split(/\s+/).filter(Boolean).length; return {t,score:p>0?p*Math.log(w+1):0} })
                    .filter(c=>c.score>2&&c.t.trim().length>200).sort((a,b)=>b.score-a.score)[0]
                  if (best) return { text: clean(best.t), title: document.title || '', url: window.location.href }
                  // Fallback: minimal tag-only noise removal
                  const clone = document.body.cloneNode(true) as HTMLElement
                  SAFE_TAGS.forEach(sel => { try { clone.querySelectorAll(sel).forEach(el => el.remove()) } catch {} })
                  return { text: clean(clone.textContent||''), title: document.title || '', url: window.location.href }
                },
              },
              (results) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(`Could not extract page content: ${chrome.runtime.lastError.message}`))
                  return
                }
                const result = results?.[0]?.result
                if (
                  !result ||
                  typeof (result as PageData).text !== 'string' ||
                  typeof (result as PageData).title !== 'string' ||
                  typeof (result as PageData).url !== 'string'
                ) {
                  reject(new Error('No result from page extraction'))
                  return
                }
                resolve(result as PageData)
              }
            )
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

  async function handleSummarize(mode: SummaryMode = 'keypoints') {
    if (!(settings.apiKeys[settings.providerId] ?? '').trim()) return

    setStatus('loading')
    setErrorMessage('')
    setSummary('')
    setTranslatedSummary('')
    setTranslatedLang('')
    setTranslatedLangCode('')
    setIsSaved(false)

    try {
      const data = await getPageText()
      setPageData(data)

      if (!data.text.trim()) {
        throw new Error('Could not extract text from this page. It may be a PDF or protected page.')
      }

      const prompt = `${SUMMARY_PROMPTS[mode]}

Title: ${data.title}
URL: ${data.url}

Content:
${data.text.slice(0, 15000)}`

      const result = await sendAiRequest(prompt)

      if (!result.trim()) {
        throw new Error('AI returned an empty response. Please try again.')
      }

      const trimmed = cleanAiText(result.trim())
      setSummary(trimmed)
      setStatus('done')

      // Cache in session storage so summary survives popup close/reopen
      await persistSession({ url: data.url, title: data.title, summary: trimmed })

      // Check if already saved to history
      const history = await getHistory()
      setIsSaved(history.some((h) => h.url === data.url))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setErrorMessage(msg)
      setStatus('error')
    }
  }

  async function handleQuickSummarize(mode: SummaryMode = 'keypoints') {
    setStatus('loading')
    setErrorMessage('')
    setSummary('')
    setTranslatedSummary('')
    setTranslatedLang('')
    setTranslatedLangCode('')
    setIsSaved(false)

    try {
      const data = await getPageText()
      setPageData(data)

      if (!data.text.trim()) {
        throw new Error('Could not extract text from this page.')
      }

      const result = extractiveSummary(data.text, 8, mode)
      setSummary(result)
      setStatus('done')
      await persistSession({ url: data.url, title: data.title, summary: result })
      const history = await getHistory()
      setIsSaved(history.some((h) => h.url === data.url))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setErrorMessage(msg)
      setStatus('error')
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

      // Update session cache with translation
      await persistSession({
        url: pageData.url,
        title: pageData.title,
        summary,
        translatedSummary: trimmed,
        translatedLang: langName,
      })

      // Update history entry if already saved
      if (isSaved) {
        await saveToHistory({
          url: pageData.url,
          title: pageData.title,
          summary,
          translatedSummary: trimmed,
          translatedLang: langName,
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
    })
    setIsSaved(true)
  }

  async function handleReadPage() {
    setReaderStatus('extracting')
    setReaderErrorMsg('')
    setReaderTranslation('')
    setReaderTranslatedLang('')
    setReaderTranslatedLangCode('')
    try {
      const data = await getPageText()
      if (!data.text.trim()) throw new Error('Could not extract text from this page.')
      setReaderTitle(data.title)
      setReaderUrl(data.url)
      setReaderText(data.text)
      setReaderStatus('ready')
      await saveReaderSession({ text: data.text, title: data.title, url: data.url })
    } catch (err) {
      setReaderErrorMsg(err instanceof Error ? err.message : 'Failed to extract page')
      setReaderStatus('error')
    }
  }

  async function handleTranslateReaderText(langCode: string, langName: string) {
    if (!readerText) return
    setIsTranslatingReader(true)
    setReaderTranslateError('')
    setReaderTranslation('')
    setReaderTranslatedLang(langName)
    setReaderTranslatedLangCode(langCode)
    setReaderTranslateProgress(0)

    try {
      const result = await googleTranslate(readerText, langCode, setReaderTranslateProgress)
      setReaderTranslation(result)
      await saveReaderSession({ text: readerText, title: readerTitle, url: readerUrl, translation: result, translatedLang: langName, translatedLangCode: langCode })
    } catch (err) {
      setReaderTranslateError(err instanceof Error ? err.message : 'Translation failed')
      setReaderTranslatedLang('')
      setReaderTranslatedLangCode('')
    } finally {
      setIsTranslatingReader(false)
      setReaderTranslateProgress(0)
    }
  }

  function handleLoadFromHistory(item: HistoryItem) {
    setPageData({ text: '', title: item.title, url: item.url })
    setSummary(item.summary)
    setTranslatedSummary(item.translatedSummary ?? '')
    setTranslatedLang(item.translatedLang ?? '')
    setStatus('done')
    setIsSaved(true)
    setActiveTab('summary')
  }

  const hasApiKey = (settings.apiKeys[settings.providerId] ?? '').trim().length > 0
  const providerName = getProviderById(settings.providerId)?.name ?? settings.providerId
  const hasSummary = status === 'done' && summary.length > 0

  return (
    <div
      className="w-[420px] max-h-[600px] overflow-y-auto bg-gray-900 text-white flex flex-col"
      style={{ width: 420, minHeight: 200 }}
    >
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Settings */}
      {activeTab === 'settings' && (
        <ProviderSettings settings={settings} onSettingsChange={handleSettingsChange} />
      )}

      {/* History */}
      {activeTab === 'history' && (
        <HistoryPanel onLoadSummary={handleLoadFromHistory} />
      )}

      {/* Reader */}
      {activeTab === 'reader' && (
        <ReaderPanel
          status={readerStatus}
          errorMsg={readerErrorMsg}
          text={readerText}
          title={readerTitle}
          url={readerUrl}
          translation={readerTranslation}
          translatedLang={readerTranslatedLang}
          translatedLangCode={readerTranslatedLangCode}
          isTranslating={isTranslatingReader}
          translateProgress={readerTranslateProgress}
          translateError={readerTranslateError}
          onReadPage={handleReadPage}
          onTextChange={setReaderText}
          onTranslate={handleTranslateReaderText}
        />
      )}

      {/* Summary view */}
      {activeTab === 'summary' && (
        <>
          {/* Active provider badge */}
          {hasApiKey && (
            <div className="px-4 pt-3">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Using <span className="text-gray-200 font-medium">{providerName}</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500 truncate max-w-[160px]">{settings.model}</span>
              </div>
            </div>
          )}

          <SummaryPanel
            summary={summary}
            status={status}
            errorMessage={errorMessage}
            hasApiKey={hasApiKey}
            isSaved={isSaved}
            onSummarize={(mode) => handleSummarize(mode)}
            onQuickSummarize={(mode) => handleQuickSummarize(mode)}
            onSave={handleSaveToHistory}
          />

          {hasSummary && (
            <TranslationPanel
              summary={summary}
              translatedSummary={translatedSummary}
              isTranslating={isTranslating}
              translateError={translateError}
              onTranslate={handleTranslate}
            />
          )}

          {/* Read Aloud — reads translated text if available, otherwise original summary */}
          {hasSummary && (
            <AudioControls
              text={translatedSummary || summary}
              langCode={translatedSummary && translatedLangCode ? translatedLangCode : undefined}
            />
          )}

          {hasSummary && (
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
                Open Settings to configure your API key, then summarize any webpage instantly.
              </div>
            </div>
          )}

          {status === 'idle' && hasApiKey && (
            <div className="px-4 pb-4 pt-0 text-center">
              <div className="text-gray-600 text-xs">
                Navigate to any webpage and click "Summarize This Page"
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
