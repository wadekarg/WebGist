# Chrome Web Store — WebGist Complete Submission Guide

Everything below is copy-paste ready. Each section maps directly to a field
or question in the Chrome Web Store Developer Dashboard.

---

## TAB 1 — STORE LISTING

### Product Name
```
WebGist
```

---

### Summary  (≤ 132 characters — shown in search results)
```
Summarize any webpage with AI. Translate to 84 languages, read aloud, export PDF. 7 free AI providers — no sign-up needed.
```
Character count: 122 / 132

---

### Detailed Description  (up to 16,000 characters)

Paste exactly as written below — Chrome renders line breaks and bullet characters correctly.

```
WebGist turns any webpage into a clear, concise summary in seconds — using your choice of AI provider. It also translates summaries into 84 languages, reads them aloud, exports to PDF, and saves them to a searchable local history. Your data never passes through any WebGist server.

━━━ AI SUMMARY — 5 MODES ━━━

Choose how you want your summary before clicking:

• Key Points — 6–8 numbered bullet points covering the most important facts
• Brief — A 3–4 sentence overview, ideal for quick scanning
• ELI5 (Explain Like I'm 5) — A plain-language explanation, great for dense or technical content
• Actions — Actionable takeaways starting with verbs, perfect for tutorials and how-tos
• Pros & Cons — A structured list, ideal for reviews and comparisons

Requires a free API key from your chosen provider (takes under 60 seconds to get).

━━━ FULL PAGE — NO AI NEEDED ━━━

Extract clean, distraction-free article text without an API key. Uses a three-tier pipeline:
1. Trafilatura (optional local server — highest accuracy, F1 ~0.96 on benchmarks)
2. Jina AI Reader (free, handles JavaScript-rendered pages)
3. Mozilla Readability (always available as offline fallback)

━━━ TRANSLATE TO 84 LANGUAGES ━━━

Instantly translate any summary into 84 languages using Google Translate — no extra API key needed. The language picker is searchable by English name or native script:
中文 · Español · العربية · हिन्दी · Français · Deutsch · 日本語 · Русский · Português · and 75 more.

━━━ READ ALOUD ━━━

Listen to your summary — or its translation — using your system's text-to-speech engine. Falls back to Google TTS automatically if no engine is installed. Audio continues playing even after the popup closes. Adjustable speed from 0.75× to 2×.

━━━ PDF EXPORT ━━━

Download a formatted PDF containing the page title, URL, date, summary, and translation. Uses the browser's built-in print dialog — no third-party PDF service or server involved.

━━━ HISTORY ━━━

Save up to 50 summaries locally on your device. Each entry stores the page title, URL, summary text, translation, and TTS language. Restore any entry to the main view in one click.

━━━ FLOATING BUTTON ━━━

A draggable WebGist button appears on every page so you can open the extension without going to the toolbar. Its position is remembered per website.

━━━ 7 AI PROVIDERS — ALL WITH FREE TIERS ━━━

You choose the provider. All seven offer a free tier — no credit card required to get started.

• Google Gemini (gemini-2.0-flash) — 15 requests/min, 1M tokens/day free
• Groq (llama-3.3-70b-versatile) — 30 requests/min, ultra-fast inference
• Mistral AI (mistral-small-latest) — 1 request/sec free
• Cohere (command-r) — 20 requests/min on trial key
• OpenRouter (llama-3.3-70b:free) — multiple free models available
• Anthropic (claude-haiku-4-5) — pay-as-you-go, low cost per token
• Cerebras (llama-3.3-70b) — free tier, extremely fast inference

━━━ PRIVACY FIRST ━━━

• No analytics, no telemetry, no crash reporting — zero tracking
• Your API key is stored only in Chrome's built-in storage, never on any external server
• Page content is only sent to the AI provider you configured, and only when you click "AI Summary"
• All history is stored locally on your device only
• The extension developer has no backend server and no access to your data
• Fully open source — every line of code is publicly auditable on GitHub

Full privacy policy: https://wadekarg.github.io/WebGist/privacy
Source code: https://github.com/wadekarg/WebGist
```

---

### Category
```
Productivity
```

---

### Language
```
English
```

---

### Website (optional — link to GitHub repo or privacy policy page)
```
https://wadekarg.github.io/WebGist/privacy
```

---

### Support URL (optional)
```
https://github.com/wadekarg/WebGist/issues
```

---

## TAB 2 — PRIVACY PRACTICES

### Single Purpose Description
This is the one-sentence description of what your extension does. Keep it clear and specific.

```
WebGist summarizes the content of the webpage the user is currently viewing using an AI provider of their choice.
```

---

### Does your extension collect any user data?

Answer each data type with **YES** or **NO**:

| Data Type | Collect? |
|---|---|
| Personally identifiable information (name, address, email, age, etc.) | **NO** |
| Health information | **NO** |
| Financial and payment information | **NO** |
| Authentication information (passwords, credentials, PINs, etc.) | **NO** |
| Personal communications (emails, texts, photos, documents) | **NO** |
| Location (precise location) | **NO** |
| Web history (list of websites visited) | **NO** |
| User activity (clicks, mouse position, scroll, keystrokes) | **NO** |
| Website content (text, images, or other content from pages the user visits) | **YES** |

---

### Website Content — Data Disclosure (shown when you select "Website content" above)

The CWS dashboard asks the following sub-questions for each data type you selected.
Answer exactly as written:

**What is this data used for?**
```
The text content of the webpage the user is actively viewing is extracted and sent to the AI provider the user has configured (e.g., Google Gemini, Groq, Anthropic) solely for the purpose of generating a summary. This only happens when the user explicitly clicks the "AI Summary" or "Full Page" button. The content is never sent to any WebGist server.
```

**Is this data collected? (i.e., does the developer store it?)**
```
No. The extension developer does not store, log, or retain any page content. The developer has no backend server.
```

**Is this data shared with third parties?**
```
Yes — page text is sent to the AI provider selected and configured by the user (one of: Google Gemini, Groq, Mistral, Cohere, OpenRouter, Anthropic, or Cerebras). The user chooses and configures this provider themselves by entering their own API key. Additionally, when the user clicks "Full Page", the current page URL may be sent to Jina AI Reader (jina.ai) to fetch a rendered version of the page. When the user clicks "Translate", the summary text is sent to Google Translate. None of these transmissions include personal information or the user's identity.
```

**Is this data used for purposes unrelated to the extension's single purpose?**
```
No.
```

**Is this data used to track users across websites or apps?**
```
No.
```

---

### Data handling certifications

Check both boxes:
- ✅ I certify that the data collection and use practices described above are accurate and complete
- ✅ I have not sold, shared, or transferred user data to third parties other than the approved use cases disclosed above

---

## TAB 3 — PERMISSIONS JUSTIFICATIONS

For each permission, paste the justification into the text field next to it in the dashboard.

---

### `activeTab`
```
Required to read the text content of the webpage the user is currently viewing. Content is only accessed when the user explicitly clicks "AI Summary" or "Full Page" — never automatically or in the background.
```

---

### `scripting`
```
Required to inject the content extraction script into the active tab to extract the readable article text for summarization. Also used to inject the floating action button that gives users quick access to the extension from any page.
```

---

### `storage`
```
Required to save three categories of data, all stored locally on the user's device only: (1) Settings — the user's chosen AI provider, model, and API key. (2) History — up to 50 summaries the user explicitly saves, including page title, URL, summary text, translation, and TTS language. (3) Session cache — a temporary per-tab cache of the most recent summary so it survives the popup closing and reopening within the same browser session.
```

---

### `offscreen`
```
Required to run the text-to-speech engine in a background offscreen document. This allows audio playback to continue after the user closes the extension popup, without interruption. Without this permission, audio would stop as soon as the popup closed.
```

---

### `tabs`
```
Required to read the URL and title of the current tab. The URL and title are included in the AI summary prompt so the AI understands the context of the page, and they are also saved alongside summaries in the history tab.
```

---

### Host permission: `<all_urls>`
```
Required for two purposes: (1) To inject the draggable floating action button on all pages, which lets users open WebGist without going to the browser toolbar. (2) To allow the content script to communicate with the optional local Trafilatura text-extraction server running on the user's own machine at 127.0.0.1:7777. The extension does not read the content of any page automatically — content is only extracted when the user explicitly clicks a button.
```

---

### Host permission: `http://127.0.0.1:7777/*`
```
Required to connect to the optional local text-extraction server (webgist_server.py) that the user may run on their own machine using Python and Trafilatura. This server runs entirely on the user's own computer and never communicates with the internet. If the server is not running, the extension automatically falls back to Jina AI Reader and Mozilla Readability — no configuration needed.
```

---

## TAB 4 — DISTRIBUTION

### Visibility
```
Public
```

### Regions
```
All regions
```

### Price
```
Free
```

---

## ASSETS UPLOAD CHECKLIST

Upload these files during submission:

| Asset | File | Size | Where to upload |
|---|---|---|---|
| Icon 128×128 | `src/icons/icon128.png` | 128×128 px | Store listing → Icon |
| Screenshot 1 | `store-assets/screenshot-summary.png` | 1280×800 px | Store listing → Screenshots |
| Screenshot 2 | `store-assets/screenshot-translate.png` | 1280×800 px | Store listing → Screenshots |
| Screenshot 3 | `store-assets/screenshot-export.png` | 1280×800 px | Store listing → Screenshots |
| Promo tile | `store-assets/promo-tile-440x280.png` | 440×280 px | Store listing → Promotional images → Small tile |
| Extension ZIP | `webgist-1.0.0.zip` | ~193 KB | Upload item → drag & drop |

**Screenshot captions** (optional but recommended — paste into the caption field under each screenshot):

Screenshot 1:
```
AI summary with 5 modes — Key Points, Brief, ELI5, Actions, Pros & Cons
```

Screenshot 2:
```
Translate to 84 languages and Read Aloud with adjustable speed
```

Screenshot 3:
```
Export a formatted PDF with your summary and translation
```

---

## SUBMISSION STEPS (in order)

1. Go to https://chrome.google.com/webstore/devconsole
   (One-time $5 developer registration fee if you haven't paid it yet)

2. Click **New Item** → drag and drop `webgist-1.0.0.zip`

3. Fill in **Store listing** tab:
   - Name, Summary, Description, Category, Language (all above)
   - Upload icon (128×128), 3 screenshots, promo tile
   - Add screenshot captions

4. Fill in **Privacy practices** tab:
   - Single purpose description
   - Check "Website content" only → answer the 5 sub-questions
   - Check both certification checkboxes

5. Fill in **Permissions** tab:
   - Paste justification for each permission listed above

6. Set **Distribution** tab:
   - Visibility: Public, All regions, Free

7. Click **Submit for review**

Review typically takes 1–7 business days for a new submission.
You will receive an email when it is approved or if there are questions.
