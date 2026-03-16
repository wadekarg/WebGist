// Background service worker — handles AI API calls and manages the offscreen TTS document

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
    sendResponse: (response: AiResponse | { ok: boolean } | unknown[]) => void
  ) => {
    // Ignore messages targeted at offscreen (they loop back through runtime)
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
      // chrome.action.openPopup() requires a windowId in MV3 service workers —
      // without it the call silently fails. Query the active tab first to get windowId.
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
  // Intentionally empty — no setup needed on install/update
})
