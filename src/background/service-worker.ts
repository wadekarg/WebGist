// Background service worker — handles AI API calls, enhanced extraction, and offscreen TTS

import { callProviderApi } from '../utils/providers'

interface AiRequestPayload {
  provider: string
  model: string
  apiKey: string
  prompt: string
}

interface AiRequestMessage {
  type: 'AI_REQUEST'
  payload: AiRequestPayload
}

interface AiResponseSuccess { text: string }
interface AiResponseError { error: string }
type AiResponse = AiResponseSuccess | AiResponseError

// ---- Enhanced content extraction ----
// Tier 1: Trafilatura local server (best quality, needs `python webgist_server.py`)
// Tier 2: Jina AI Reader (free, no key, server-side headless Chrome — optional, withJina flag)
// Tier 3: Caller falls back to Readability content script

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
  // ---- Tier 1: Get raw HTML, POST to Trafilatura server ----
  let html = ''
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML,
    })
    html = (results[0]?.result as string) || ''
  } catch { /* scripting blocked (PDF, chrome://, etc.) */ }

  if (html) {
    try {
      const resp = await fetchWithTimeout(
        'http://127.0.0.1:7777/extract',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html, url }),
        },
        5000   // 5 s — if server not running, fail fast
      )
      if (resp.ok) {
        const data = await resp.json() as { text?: string }
        if (data.text?.trim()) return data.text.trim()
      }
    } catch { /* server not running */ }
  }

  // ---- Tier 2: Jina AI Reader (only for Full Page mode) ----
  if (withJina && url) {
    try {
      const resp = await fetchWithTimeout(
        `https://r.jina.ai/${url}`,
        { headers: { 'X-Return-Format': 'text' } },
        20000   // up to 20 s for server-side render
      )
      if (resp.ok) {
        const text = await resp.text()
        if (text.trim()) return text.trim()
      }
    } catch { /* Jina timed out or unavailable */ }
  }

  return ''  // Signal caller to use Readability fallback
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

// ---- Message listener ----

const TTS_TYPES = new Set(['TTS_SPEAK', 'TTS_PAUSE', 'TTS_RESUME', 'TTS_STOP', 'GET_VOICES', 'GET_TTS_STATE', 'TTS_SET_SPEED'])

chrome.runtime.onMessage.addListener(
  (
    message: AiRequestMessage | { type: string; [key: string]: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: AiResponse | { ok: boolean } | { text: string } | unknown[]) => void
  ) => {
    if ((message as { target?: string }).target === 'offscreen') return false

    if (message.type === 'AI_REQUEST') {
      const { payload } = message as AiRequestMessage
      callProviderApi(payload)
        .then((text) => sendResponse({ text }))
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
        const windowId = tabs[0]?.windowId
        if (windowId) {
          chrome.action.openPopup({ windowId }).catch(() => {})
        }
      })
      return false
    }

    return false
  }
)

chrome.runtime.onInstalled.addListener(() => {
  // Intentionally empty
})
