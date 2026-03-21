// Background service worker — handles AI API calls, streaming, enhanced extraction,
// context menu, keyboard shortcuts, health checks, and offscreen TTS

import {
  callProviderApi,
  callProviderApiStream,
  pingProvider,
  fetchOllamaModels,
  type ApiRequestPayload,
  type ApiResponse,
} from '../utils/providers'

// ---- Types ----

interface AiRequestMessage {
  type: 'AI_REQUEST'
  payload: ApiRequestPayload
}

type AiResponseSuccess = { text: string; tokensUsed?: number }
type AiResponseError = { error: string }
type AiResponse = AiResponseSuccess | AiResponseError

// ---- Enhanced content extraction ----

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function enhancedExtract(tabId: number, url: string, withJina: boolean): Promise<string> {
  let html = ''
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML,
    })
    html = (results[0]?.result as string) || ''
  } catch { /* scripting blocked */ }

  if (html) {
    try {
      const resp = await fetchWithTimeout(
        'http://127.0.0.1:7777/extract',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html, url }),
        },
        5000
      )
      if (resp.ok) {
        const data = await resp.json() as { text?: string }
        if (data.text?.trim()) return data.text.trim()
      }
    } catch { /* server not running */ }
  }

  if (withJina && url) {
    try {
      const resp = await fetchWithTimeout(
        `https://r.jina.ai/${url}`,
        { headers: { 'X-Return-Format': 'text' } },
        20000
      )
      if (resp.ok) {
        const text = await resp.text()
        if (text.trim()) return text.trim()
      }
    } catch { /* Jina unavailable */ }
  }

  return ''
}

// ---- Multi-tab extraction ----

async function extractMultipleTabs(): Promise<{ title: string; url: string; text: string }[]> {
  const tabs = await chrome.tabs.query({ highlighted: true, currentWindow: true })
  const results: { title: string; url: string; text: string }[] = []

  for (const tab of tabs.slice(0, 5)) {
    if (!tab.id) continue
    try {
      const execResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText.slice(0, 10000),
      })
      results.push({
        title: tab.title ?? '',
        url: tab.url ?? '',
        text: execResult[0]?.result ?? '',
      })
    } catch {
      results.push({ title: tab.title ?? '', url: tab.url ?? '', text: '(Could not extract)' })
    }
  }
  return results
}

// ---- Offscreen document management ----

const OFFSCREEN_URL = 'offscreen/tts.html'

async function ensureOffscreen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  })
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'Text-to-speech synthesis for WebGist summaries',
    })
  }
}

function relayToOffscreen(message: object): void {
  ensureOffscreen().then(() => {
    chrome.runtime.sendMessage({ ...message, target: 'offscreen' }).catch(() => {})
  })
}

// ---- Streaming via ports ----

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'ai-stream') return

  port.onMessage.addListener(async (msg: { type: string; payload: ApiRequestPayload }) => {
    if (msg.type !== 'AI_STREAM_REQUEST') return

    try {
      const stream = callProviderApiStream(msg.payload)
      for await (const chunk of stream) {
        try { port.postMessage({ type: 'AI_STREAM_CHUNK', text: chunk }) } catch { return }
      }
      port.postMessage({ type: 'AI_STREAM_END' })
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'
      try { port.postMessage({ type: 'AI_STREAM_ERROR', error: errorMsg }) } catch {}
    }
  })
})

// ---- Message listener ----

const TTS_TYPES = new Set(['TTS_SPEAK', 'TTS_PAUSE', 'TTS_RESUME', 'TTS_STOP', 'GET_VOICES', 'GET_TTS_STATE', 'TTS_SET_SPEED'])

chrome.runtime.onMessage.addListener(
  (
    message: AiRequestMessage | { type: string; [key: string]: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: AiResponse | { ok: boolean } | { text: string } | unknown) => void
  ) => {
    if ((message as { target?: string }).target === 'offscreen') return false

    if (message.type === 'AI_REQUEST') {
      const { payload } = message as AiRequestMessage
      callProviderApi(payload)
        .then((response: ApiResponse) => sendResponse({ text: response.text, tokensUsed: response.tokensUsed }))
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'
          sendResponse({ error: errorMsg })
        })
      return true
    }

    if (message.type === 'ENHANCED_EXTRACT') {
      const { tabId, url, withJina } = message as { type: string; tabId: number; url: string; withJina?: boolean }
      enhancedExtract(tabId, url, withJina ?? false)
        .then((text) => sendResponse({ text }))
        .catch(() => sendResponse({ text: '' }))
      return true
    }

    if (message.type === 'MULTI_TAB_EXTRACT') {
      extractMultipleTabs()
        .then((tabs) => sendResponse({ tabs }))
        .catch(() => sendResponse({ tabs: [] }))
      return true
    }

    if (message.type === 'PING_PROVIDER') {
      const { providerId, apiKey } = message as { type: string; providerId: string; apiKey: string }
      pingProvider(providerId, apiKey)
        .then((ok) => sendResponse({ ok }))
        .catch(() => sendResponse({ ok: false }))
      return true
    }

    if (message.type === 'GET_OLLAMA_MODELS') {
      fetchOllamaModels()
        .then((models) => sendResponse({ models }))
        .catch(() => sendResponse({ models: [] }))
      return true
    }

    if (TTS_TYPES.has(message.type)) {
      if (message.type === 'GET_VOICES' || message.type === 'GET_TTS_STATE') {
        ensureOffscreen().then(() => {
          chrome.runtime.sendMessage(
            { ...message, target: 'offscreen' },
            (response) => { sendResponse(response ?? (message.type === 'GET_VOICES' ? [] : { isPlaying: false, isPaused: false })) }
          )
        })
      } else {
        relayToOffscreen(message)
        sendResponse({ ok: true })
      }
      return true
    }

    if (message.type === 'OPEN_POPUP') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_PANEL' }).catch(() => {})
        }
      })
      return false
    }

    return false
  }
)

// ---- Toolbar icon click ----

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' }).catch(() => {})
  }
})

// ---- Keyboard shortcuts ----

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id
    if (!tabId) return
    if (command === 'toggle-panel') {
      chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_PANEL' }).catch(() => {})
    } else if (command === 'summarize') {
      chrome.tabs.sendMessage(tabId, { type: 'OPEN_AND_SUMMARIZE' }).catch(() => {})
    }
  })
})

// ---- Context menu ----

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'webgist-summarize-selection',
    title: 'Summarize with WebGist',
    contexts: ['selection'],
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'webgist-summarize-selection' && tab?.id && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'SUMMARIZE_SELECTION',
      text: info.selectionText,
    }).catch(() => {})
  }
})

// ---- Session cleanup on tab close ----

chrome.tabs.onRemoved.addListener((tabId) => {
  const key = `session_tab_${tabId}`
  chrome.storage.session.remove(key).catch(() => {})
})
