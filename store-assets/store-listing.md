# Chrome Web Store — WebGist Listing

## Basic Info

**Name:** WebGist

**Summary (≤132 chars):**
Summarize any webpage with AI. Translate to 84 languages, read aloud, export PDF. 7 free AI providers — no sign-up needed.

**Category:** Productivity

**Language:** English

**Privacy Policy URL:** https://wadekarg.github.io/WebGist/privacy

---

## Description (store listing body)

WebGist is a Chrome extension that summarizes any webpage using your choice of AI — in seconds. It supports 7 providers with free tiers, so you can get started without entering a credit card.

**AI Summary Modes**
Choose from 5 modes before summarizing:
• Key Points — 6–8 numbered bullet points
• Brief — 3–4 sentence overview
• ELI5 — simple plain-language explanation
• Actions — actionable takeaways starting with verbs
• Pros & Cons — structured pros and cons list

**Full Page**
Extract clean, distraction-free article text without AI. No API key required. Uses Mozilla Readability or Jina AI Reader for best-in-class extraction.

**Translate Summary**
Instantly translate any summary into 84 languages via Google Translate — searchable by name or native script (中文, Español, العربية, etc.). No API key needed.

**Read Aloud**
Listen to your summary (or its translation) using your system's text-to-speech engine. Falls back to Google TTS automatically if no engine is installed. Audio continues even after the popup closes. Adjustable speed (0.75× – 2×).

**PDF Export**
Download a formatted PDF of the summary and translation. Includes page title, URL, and generation date. Works through the browser's built-in print dialog — no third-party PDF library required.

**History**
Save up to 50 summaries locally. Click any entry to restore it — including the original translation and TTS language.

**Floating Button**
A draggable WebGist button is injected into every page for instant access. Position is remembered per site.

**Supported AI Providers (all have free tiers)**
• Google Gemini — 15 req/min, 1M tokens/day
• Groq — ultra-fast Llama 3.3 inference
• Mistral AI — mistral-small-latest
• Cohere — command-r
• OpenRouter — multiple free models
• Anthropic Claude — claude-haiku
• Cerebras — extremely fast, free tier

**Privacy First**
Your API key never leaves your browser. Page content is only sent to the AI provider you configured, only when you click "AI Summary". No analytics, no tracking, no backend server.

Full privacy policy: https://wadekarg.github.io/WebGist/privacy

---

## Permission Justifications

These are required in the CWS "Permissions" section during submission:

| Permission | Justification |
|---|---|
| `activeTab` | Read the content of the page the user is currently viewing, only when they click "AI Summary" or "Full Page". |
| `scripting` | Inject the content extraction script and floating action button into the active tab. |
| `storage` | Save settings (API keys, provider choice), history (up to 50 entries), and per-tab session cache locally on the user's device. |
| `offscreen` | Run text-to-speech in a background offscreen document so audio continues playing after the popup closes. |
| `tabs` | Read the current tab's URL and title to include in the AI summary prompt and saved history entries. |
| `<all_urls>` (host permission) | Inject the floating action button on all pages the user visits. Also allows communication with the optional local Trafilatura extraction server at 127.0.0.1:7777. |
| `http://127.0.0.1:7777/*` | Optional connection to the user's own local Trafilatura text-extraction server (runs on the user's machine). Never connects to any external server at this address. |

---

## Assets Checklist

- [x] Icon 16×16 — `src/icons/icon16.png`
- [x] Icon 48×48 — `src/icons/icon48.png`
- [x] Icon 128×128 — `src/icons/icon128.png`
- [x] Screenshot 1 (1280×800) — `store-assets/screenshot-summary.png`
- [x] Screenshot 2 (1280×800) — `store-assets/screenshot-translate.png`
- [x] Screenshot 3 (1280×800) — `store-assets/screenshot-export.png`
- [x] Promotional tile 440×280 — `store-assets/promo-tile-440x280.png`
- [x] Submission ZIP — `webgist-1.0.0.zip`

---

## Submission Steps

1. Go to https://chrome.google.com/webstore/devconsole
2. Click **New Item** → upload `webgist-1.0.0.zip`
3. Fill in the listing using the text above
4. Upload screenshots from `store-assets/`
5. Upload promo tile from `store-assets/promo-tile-440x280.png`
6. Set Privacy Policy URL to `https://wadekarg.github.io/WebGist/privacy`
7. Add permission justifications (see table above)
8. Set category to **Productivity**
9. Submit for review
