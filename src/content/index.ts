// Content script: extracts visible page text and provides the floating action button
import { Readability } from '@mozilla/readability'

// Guard against double-injection (e.g. scripting API re-inject on already-open tabs)
declare global { interface Window { __wgLoaded?: boolean } }
if (window.__wgLoaded) {
  // Already running — skip re-initialisation
} else {
window.__wgLoaded = true

// ---- Noise removal ----

const SAFE_NOISE_TAGS = [
  // Core non-content elements
  'script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'video', 'audio',
  'nav', 'header', 'footer', 'aside', 'form',

  // Standard hidden attribute
  '[hidden]',

  // ARIA non-content roles
  '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
  '[role="contentinfo"]', '[role="search"]', '[role="dialog"]',
  '[role="alertdialog"]', '[role="status"]', '[role="toolbar"]',
  '[aria-hidden="true"]', '[aria-modal="true"]',

  // Ads — generic
  'ins.adsbygoogle',
  '[data-ad]', '[data-advertisement]', '[data-ad-unit]', '[data-ad-slot]',
  '[id^="div-gpt-ad"]', '[id^="google_ads"]', '[id^="google-ads"]',
  '[class*="google-ad"]', '[class*="ad-container"]', '[class*="ad-banner"]',
  '[class*="display-ad"]',

  // Cookie / consent notices
  '[id*="cookie"]',   '[class*="cookie"]',
  '[id*="consent"]',  '[class*="consent"]',
  '[id*="gdpr"]',     '[class*="gdpr"]',
  '[id*="privacy-notice"]', '[class*="privacy-notice"]',
  '[class*="cc-window"]', '[id*="onetrust"]', '[class*="onetrust"]',
  '[id*="cookielaw"]', '[class*="cookielaw"]',

  // Popups / modals / overlays
  '[class*="modal"]',   '[id*="modal"]',
  '[class*="popup"]',   '[id*="popup"]',
  '[class*="overlay"]', '[class*="lightbox"]',
  '[class*="drawer"]',  '[class*="offcanvas"]',

  // Chat & support widgets
  '[id*="intercom"]',  '[class*="intercom"]',
  '[id*="crisp"]',     '[class*="crisp"]',
  '[id*="drift"]',     '[class*="drift"]',
  '[id*="zendesk"]',   '[class*="zendesk"]',
  '[id*="hubspot"]',   '[class*="hs-"]',
  '[id*="livechat"]',  '[class*="livechat"]',
  '[id*="tawk"]',      '[class*="tawk"]',
  '#launcher',

  // Newsletter / subscribe / signup CTAs
  '[class*="newsletter"]',
  '[class*="subscribe-"]', '[id*="subscribe"]',
  '[class*="email-capture"]',
  '[class*="signup-form"]',

  // Social sharing toolbars
  '[class*="share-bar"]',   '[class*="sharebar"]',
  '[class*="social-share"]', '[class*="social-links"]',
  '[class*="addthis"]',     '[id*="addthis"]',
  '[class*="shareaholic"]',

  // Comment sections
  '[id="comments"]',      '[id="disqus_thread"]',
  '.comments',            '#comments',
  '[class*="comment-section"]', '[class*="comments-section"]',
  '[class*="comment-list"]',

  // Related / recommended / "you may also like"
  '[class*="related-"]',    '[class*="recommended-"]',
  '[class*="more-stories"]', '[class*="you-might"]',
  '[class*="also-like"]',   '[class*="suggested"]',

  // Sticky/notification/announcement bars
  '[class*="sticky-bar"]',       '[class*="notification-bar"]',
  '[class*="announcement-bar"]', '[class*="top-bar"]',
  '[class*="floating-bar"]',     '[class*="cookie-bar"]',

  // Breadcrumbs & pagination
  '[class*="breadcrumb"]', '[aria-label="breadcrumb"]',
  '[class*="pagination"]', '[aria-label*="pagination"]',

  // Author bios & tag clouds
  '[class*="author-bio"]', '[class*="tag-cloud"]',
  '[class*="tag-list"]',

  // Datetime / publish-date elements
  // <time> is machine-readable dates — never prose content
  'time',
  '[class*="timestamp"]',    '[id*="timestamp"]',
  '[class*="post-date"]',    '[class*="pub-date"]',
  '[class*="posted-date"]',  '[class*="article-date"]',
  '[class*="entry-date"]',   '[class*="dateline"]',

  // Post / entry meta blocks (date + author lines above/below articles)
  '[class*="post-meta"]',    '[class*="entry-meta"]',
  '[class*="article-meta"]', '[class*="story-meta"]',

  // Author / user profile snippets (bio cards, member widgets)
  '[class*="author-info"]',  '[class*="author-meta"]',
  '[class*="author-card"]',  '[class*="author-box"]',
  '[class*="user-info"]',    '[class*="user-meta"]',
  '[class*="user-card"]',    '[class*="member-info"]',
  '[class*="profile-info"]', '[class*="profile-meta"]',
  '[class*="byline"]',

  // Follower / engagement counts
  '[class*="follower"]',     '[class*="follow-count"]',
  '[class*="stat-count"]',   '[class*="-stats"]',
]

// ---- Content selectors — ordered most-specific first ----

const CONTENT_SELECTORS = [
  // Semantic HTML
  'article', 'main', '[role="main"]', '[itemprop="articleBody"]',

  // Platform-specific (high confidence)
  '#mw-content-text .mw-parser-output',         // Wikipedia
  '.gh-content',                                 // Ghost CMS
  '.available-content',                          // Substack
  '.meteredContent',                             // Medium (metered)
  '#readme .markdown-body', '.markdown-body',    // GitHub README
  '.s-prose',                                    // Stack Overflow
  '.article-body-wrapper', '.blog-content-wrapper', // Dev.to / Hashnode
  '.notion-page-content',                        // Notion exports

  // Common CMS / WordPress / news
  '.post-content', '.entry-content', '.article-content', '.article-body',
  '.story-body', '.story-content', '.content-body', '.post-body', '.blog-content',
  '.post-control', '.post-inner', '.entry-body', '.td-post-content',
  '.article__body', '.article__content', '.story__body',
  '.RichTextArticleBody', '.article-text', '.article-page',
  '.post__content', '.post__body',
  '.wp-block-post-content',

  // ID-based fallbacks
  '#article-body', '#story-body', '#content-body',
  '.main-content', '#main-content', '.page-content', '#page-content',
]

// Noise ancestor tags for density-scoring filter
const NOISE_ANCESTORS = 'nav, header, footer, aside'

// ---- Helpers ----

function removeHiddenFromClone(root: Document): void {
  // Remove elements styled invisible via inline style
  root.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    const s = el.style
    if (
      s.display === 'none' ||
      s.visibility === 'hidden' ||
      s.opacity === '0' ||
      s.position === 'fixed' ||
      s.position === 'sticky' ||
      // Off-screen trick (common for hidden content)
      (s.position === 'absolute' && (parseInt(s.left || '0') < -500 || parseInt(s.top || '0') < -500))
    ) {
      el.remove()
    }
  })
}

// ---- Main extractor ----

function extractPageText(): string {
  // --- Tier 1: Readability ---
  try {
    const docClone = document.cloneNode(true) as Document
    SAFE_NOISE_TAGS.forEach((sel) => {
      try { docClone.querySelectorAll(sel).forEach((el) => el.remove()) } catch {}
    })
    removeHiddenFromClone(docClone)
    const article = new Readability(docClone, { charThreshold: 200 }).parse()
    if (article?.textContent) {
      const text = article.textContent.trim()
      if (text.length > 200) return cleanExtracted(text)
    }
  } catch { /* fall through */ }

  // --- Tier 2a: well-known content selectors on the LIVE document ---
  for (const sel of CONTENT_SELECTORS) {
    try {
      const el = document.querySelector(sel) as HTMLElement | null
      if (!el) continue
      const pos = window.getComputedStyle(el).position
      if (pos === 'fixed' || pos === 'sticky') continue
      const text = el.innerText.trim()
      if (text.length > 200) return cleanExtracted(text)
    } catch { /* invalid selector */ }
  }

  // --- Tier 2b: paragraph-density scoring on the LIVE document ---
  const candidates = Array.from(document.querySelectorAll('div, section, article, main'))
    .filter((el) => !el.closest(NOISE_ANCESTORS))
    .filter((el) => {
      const pos = window.getComputedStyle(el).position
      return pos !== 'fixed' && pos !== 'sticky'
    })
    .map((el) => {
      const h      = el as HTMLElement
      const pCount = el.querySelectorAll('p, h2, h3, h4, li').length
      const text   = h.innerText
      const words  = text.split(/\s+/).filter(Boolean).length
      const score  = pCount > 0 ? pCount * Math.log(words + 1) : 0
      return { el, text, score }
    })
    .filter((c) => c.score > 2 && c.text.trim().length > 200)
    .sort((a, b) => b.score - a.score)

  if (candidates[0]) return cleanExtracted(candidates[0].text)

  // --- Tier 3: minimal-clone fallback ---
  const clone = document.body.cloneNode(true) as HTMLElement
  clone.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    if (el.style.position === 'fixed' || el.style.position === 'sticky') el.remove()
  })
  SAFE_NOISE_TAGS.forEach((sel) => {
    try { clone.querySelectorAll(sel).forEach((el) => el.remove()) } catch {}
  })
  return cleanExtracted(clone.textContent || '')
}

// Short single-token lines that are almost certainly nav/UI labels
const UI_NOISE_RE = /^(share|tweet|follow|subscribe|sign up|log in|sign in|register|close|accept|decline|cookie|menu|search|home|back|next|prev|previous|more|load more|read more|show more|skip|cancel|ok|yes|no|reply|report|edit|delete|save|submit|send)$/i

function isMetadataLine(line: string): boolean {
  // "62/M/Nashville, TN" — age / gender / city pattern
  if (/^\d{1,3}\/[A-Za-z]\//.test(line)) return true
  // "38 followers" / "1.6k followers" / "230 following"
  if (/^\d[\d.,]*[kKmM]?\s+(follower|following|subscriber|view|like)/i.test(line)) return true
  // Standalone short date lines: "May 1, 2020" / "Aug 4, 2019 at 10:28 AM CDT"
  if (line.length < 60 && /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i.test(line)) return true
  // ISO / numeric dates alone: "2024-03-15" or "15/03/2024"
  if (line.length < 30 && /^\d{1,4}[-/]\d{1,2}[-/]\d{2,4}$/.test(line)) return true
  return false
}

function cleanExtracted(text: string): string {
  return text
    .replace(/#[\w\p{L}\p{N}]+/gu, '')   // strip hashtags
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (l.length === 0) return true        // keep blank separators
      if (l.length < 3)   return false       // drop lone chars
      if (UI_NOISE_RE.test(l)) return false
      if (isMetadataLine(l))   return false  // drop date/follower/age lines
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---- Types ----

interface PageData { text: string; title: string; url: string }

// ---- Message listener ----

chrome.runtime.onMessage.addListener(
  (message: { type: string; target?: string }, _sender, sendResponse) => {
    if (message.target === 'offscreen') return false

    if (message.type === 'GET_PAGE_TEXT') {
      sendResponse({
        text: extractPageText(),
        title: document.title || '',
        url: window.location.href || '',
      } as PageData)
      return true
    }

    if (message.type === 'TOGGLE_PANEL') {
      togglePanel()
      return false
    }

    return false
  }
)

// ---- Side panel (iframe injected into page) ----

let panelHost: HTMLDivElement | null = null
let panelBackdrop: HTMLDivElement | null = null
let panelOpen = false

function injectPanel() {
  if (panelHost) return

  // Transparent backdrop — covers page behind panel, click to close
  panelBackdrop = document.createElement('div')
  panelBackdrop.style.cssText = [
    'position:fixed', 'top:0', 'left:0',
    'width:100%', 'height:100%',
    'z-index:2147483645',
    'display:none',
  ].join(';')
  panelBackdrop.addEventListener('click', closePanel)
  document.body.appendChild(panelBackdrop)

  panelHost = document.createElement('div')
  panelHost.id = 'wg-panel-host'
  panelHost.style.cssText = [
    'position:fixed', 'top:0', 'right:0',
    'width:420px', 'height:100vh',
    'z-index:2147483646',
    'transform:translateX(100%)',
    'transition:transform 0.25s cubic-bezier(0.4,0,0.2,1)',
    'box-shadow:-4px 0 28px rgba(0,0,0,0.45)',
    'display:flex', 'flex-direction:column',
  ].join(';')

  const iframe = document.createElement('iframe')
  iframe.src = chrome.runtime.getURL('popup/index.html')
  iframe.style.cssText = 'width:100%;flex:1;border:none;display:block;'

  panelHost.appendChild(iframe)
  document.body.appendChild(panelHost)

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelOpen) closePanel()
  })
}

function openPanel() {
  injectPanel()
  panelOpen = true
  panelHost!.style.transform = 'translateX(0)'
  panelBackdrop!.style.display = 'block'
  const fab = document.getElementById('wg-fab')
  if (fab) { fab.style.right = '430px'; fab.style.transition = 'right 0.25s cubic-bezier(0.4,0,0.2,1)' }
}

function closePanel() {
  if (!panelHost) return
  panelOpen = false
  panelHost.style.transform = 'translateX(100%)'
  panelBackdrop!.style.display = 'none'
  const fab = document.getElementById('wg-fab')
  if (fab) fab.style.right = '24px'
}

function togglePanel() {
  if (panelOpen) closePanel()
  else openPanel()
}

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
    if (moved) return
    togglePanel()
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

} // end guard
