// Content script: extracts visible page text, handles TTS, and provides voice list
import { Readability } from '@mozilla/readability'

// Semantic HTML tags + known ad/promo elements that are never part of the main article.
const SAFE_NOISE_TAGS = [
  'script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'video',
  'nav', 'header', 'footer', 'aside',
  '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
  '[role="contentinfo"]', '[role="search"]', '[aria-hidden="true"]',
  // Ad / promo elements
  'ins.adsbygoogle',
  '[data-ad]', '[data-advertisement]', '[data-ad-unit]',
  '[id^="div-gpt-ad"]', '[id^="google_ads"]',
]

// Well-known CMS/theme class names for the primary content block.
const CONTENT_SELECTORS = [
  'article', 'main', '[role="main"]', '[itemprop="articleBody"]',
  '.post-content', '.entry-content', '.article-content', '.article-body',
  '.story-body', '.story-content', '.content-body', '.post-body', '.blog-content',
  '.post-control', '.post-inner', '.entry-body', '.td-post-content',
  '#article-body', '#story-body', '#content-body',
  '.main-content', '#main-content', '.page-content', '#page-content',
]

// Elements whose closest ancestor is one of these tags are treated as noise
// when scoring candidates from the live document.
const NOISE_ANCESTORS = 'nav, header, footer, aside'

function extractPageText(): string {
  // --- Tier 1: Readability ---
  // Pre-clean the clone to remove ads/noise before Readability parses it.
  try {
    const docClone = document.cloneNode(true) as Document
    SAFE_NOISE_TAGS.forEach((sel) => {
      try { docClone.querySelectorAll(sel).forEach((el) => el.remove()) } catch {}
    })
    const article = new Readability(docClone).parse()
    if (article?.textContent) {
      const text = article.textContent.trim()
      if (text.length > 300) return cleanExtracted(text)
    }
  } catch { /* fall through */ }

  // --- Tier 2a: well-known content selectors on the LIVE document ---
  // innerText works correctly on live DOM elements (reflects visible rendered text).
  for (const sel of CONTENT_SELECTORS) {
    try {
      const el = document.querySelector(sel) as HTMLElement | null
      if (!el) continue
      // Skip if the element itself is fixed/sticky (unlikely for content, but guard anyway)
      const pos = window.getComputedStyle(el).position
      if (pos === 'fixed' || pos === 'sticky') continue
      const text = el.innerText.trim()
      if (text.length > 300) return cleanExtracted(text)
    } catch { /* invalid selector, skip */ }
  }

  // --- Tier 2b: paragraph-density scoring on the LIVE document ---
  // score = pCount × ln(wordCount) — higher means richer prose content.
  // Skip elements inside nav/header/footer/aside AND fixed/sticky overlays (ads, banners).
  const candidates = Array.from(document.querySelectorAll('div, section, article, main'))
    .filter((el) => !el.closest(NOISE_ANCESTORS))
    .filter((el) => {
      const pos = window.getComputedStyle(el).position
      return pos !== 'fixed' && pos !== 'sticky'
    })
    .map((el) => {
      const h      = el as HTMLElement
      const pCount = el.querySelectorAll('p, h2, h3, h4, li').length
      const text   = h.innerText  // accurate on live DOM
      const words  = text.split(/\s+/).filter(Boolean).length
      const score  = pCount > 0 ? pCount * Math.log(words + 1) : 0
      return { el, text, score }
    })
    .filter((c) => c.score > 2 && c.text.trim().length > 200)
    .sort((a, b) => b.score - a.score)

  if (candidates[0]) return cleanExtracted(candidates[0].text)

  // --- Tier 3: minimal-clone fallback ---
  const clone = document.body.cloneNode(true) as HTMLElement
  // Remove elements with inline position:fixed/sticky (floating banners set these inline)
  clone.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    if (el.style.position === 'fixed' || el.style.position === 'sticky') el.remove()
  })
  SAFE_NOISE_TAGS.forEach((sel) => {
    try { clone.querySelectorAll(sel).forEach((el) => el.remove()) } catch {}
  })
  return cleanExtracted(clone.textContent || '')
}

function cleanExtracted(text: string): string {
  const lines = text
    .replace(/#[\w\p{L}\p{N}]+/gu, '')  // strip hashtags (ASCII and Unicode)
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map(l => l.trim())

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface PageData { text: string; title: string; url: string }
interface VoiceInfo { name: string; lang: string; default: boolean }

// TTS state — runs in page context where speechSynthesis works reliably
let keepAliveTimer: ReturnType<typeof setInterval> | null = null

function ttsSpeak(text: string, voiceName?: string) {
  window.speechSynthesis.cancel()
  if (keepAliveTimer) clearInterval(keepAliveTimer)

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.95
  utterance.pitch = 1
  utterance.volume = 1

  if (voiceName) {
    const voice = window.speechSynthesis.getVoices().find((v) => v.name === voiceName)
    if (voice) utterance.voice = voice
  }

  utterance.onend = () => {
    if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null }
    chrome.runtime.sendMessage({ type: 'TTS_EVENT', event: 'end' }).catch(() => {})
  }
  utterance.onerror = () => {
    if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null }
    chrome.runtime.sendMessage({ type: 'TTS_EVENT', event: 'error' }).catch(() => {})
  }

  window.speechSynthesis.speak(utterance)

  // Chrome bug workaround: speechSynthesis pauses after ~15s if not nudged
  keepAliveTimer = setInterval(() => {
    if (!window.speechSynthesis.speaking) {
      clearInterval(keepAliveTimer!)
      keepAliveTimer = null
      return
    }
    window.speechSynthesis.pause()
    window.speechSynthesis.resume()
  }, 10000)
}

chrome.runtime.onMessage.addListener(
  (message: { type: string; text?: string; voiceName?: string }, _sender, sendResponse) => {

    if (message.type === 'GET_PAGE_TEXT') {
      sendResponse({
        text: extractPageText(),
        title: document.title || '',
        url: window.location.href || '',
      } as PageData)
      return true
    }

    if (message.type === 'GET_VOICES') {
      let responded = false
      const deliver = () => {
        if (responded) return
        responded = true
        const voices = window.speechSynthesis.getVoices()
        sendResponse(voices.map((v): VoiceInfo => ({ name: v.name, lang: v.lang, default: v.default })))
      }
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        deliver()
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', deliver, { once: true })
        setTimeout(deliver, 2000) // timeout fallback — uses same guard to prevent double-response
      }
      return true
    }

    if (message.type === 'TTS_SPEAK' && message.text) {
      ttsSpeak(message.text, message.voiceName)
      sendResponse({ ok: true })
      return true
    }

    if (message.type === 'TTS_PAUSE') {
      window.speechSynthesis.pause()
      if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null }
      sendResponse({ ok: true })
      return true
    }

    if (message.type === 'TTS_RESUME') {
      window.speechSynthesis.resume()
      keepAliveTimer = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(keepAliveTimer!); keepAliveTimer = null; return
        }
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }, 10000)
      sendResponse({ ok: true })
      return true
    }

    if (message.type === 'TTS_STOP') {
      window.speechSynthesis.cancel()
      if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null }
      sendResponse({ ok: true })
      return true
    }

    return true
  }
)

// ---- Floating action button (draggable) ----

function injectFab() {
  if (document.getElementById('wg-fab')) return

  const POS_KEY = 'wg-fab-pos'
  let savedPos = { right: 24, bottom: 24 }
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (raw) savedPos = JSON.parse(raw)
  } catch { /* ignore */ }

  const btn = document.createElement('button')
  btn.id = 'wg-fab'
  btn.title = 'Open WebGist'
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="20" height="20">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>`

  btn.style.cssText = [
    'position:fixed',
    `bottom:${savedPos.bottom}px`,
    `right:${savedPos.right}px`,
    'z-index:2147483647',
    'width:44px', 'height:44px', 'border-radius:50%',
    'background:#4f46e5', 'border:none', 'cursor:grab',
    'box-shadow:0 2px 14px rgba(79,70,229,.55)',
    'display:flex', 'align-items:center', 'justify-content:center', 'padding:0',
    'user-select:none', '-webkit-user-select:none',
    'transition:box-shadow .15s',
  ].join(';')

  // ---- Drag logic ----
  let dragging = false
  let moved = false
  let startX = 0, startY = 0
  let startRight = 0, startBottom = 0

  function onMouseMove(e: MouseEvent) {
    const dx = startX - e.clientX
    const dy = startY - e.clientY
    if (!moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    moved = true
    dragging = true
    btn.style.cursor = 'grabbing'
    btn.style.transition = 'none'
    const newRight  = Math.max(8, Math.min(window.innerWidth  - 52, startRight  + dx))
    const newBottom = Math.max(8, Math.min(window.innerHeight - 52, startBottom + dy))
    btn.style.right  = newRight  + 'px'
    btn.style.bottom = newBottom + 'px'
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    btn.style.cursor = 'grab'
    btn.style.transition = 'box-shadow .15s'
    if (dragging) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify({
          right:  parseInt(btn.style.right),
          bottom: parseInt(btn.style.bottom),
        }))
      } catch { /* ignore */ }
    }
    // reset for next interaction
    dragging = false
  }

  btn.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return
    moved = false
    dragging = false
    startX = e.clientX
    startY = e.clientY
    startRight  = parseInt(btn.style.right)  || savedPos.right
    startBottom = parseInt(btn.style.bottom) || savedPos.bottom
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    e.preventDefault()
  })

  btn.addEventListener('click', () => {
    if (moved) return   // was a drag, not a click
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' })
  })

  btn.addEventListener('mouseenter', () => {
    if (!dragging) btn.style.boxShadow = '0 4px 20px rgba(79,70,229,.75)'
  })
  btn.addEventListener('mouseleave', () => {
    if (!dragging) btn.style.boxShadow = '0 2px 14px rgba(79,70,229,.55)'
  })

  const attach = () => document.body?.appendChild(btn)
  if (document.body) attach()
  else document.addEventListener('DOMContentLoaded', attach)
}

injectFab()
