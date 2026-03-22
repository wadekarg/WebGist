# Privacy Policy — WebGist Chrome Extension

**Last updated: March 21, 2026** · **Version 1.0.1**

WebGist is a Chrome browser extension that summarizes webpages using AI. This policy explains clearly what data is collected, what is not collected, and how any data that leaves your device is handled.

---

## Summary

| Question | Answer |
|----------|--------|
| Do we collect personal data? | **No** |
| Do we track your browsing? | **No** |
| Is your data sold to third parties? | **No** |
| Is your API key sent to our servers? | **No — it never leaves your device** |
| Is page content sent anywhere? | **Only to the AI provider you choose, only when you trigger a summary** |
| Do we use analytics or crash reporting? | **No** |

---

## 1. Data We Do NOT Collect

WebGist does not have a backend server. There is no account system, no sign-up, and no remote database. The extension author has no access to anything on your device.

Specifically, we do **not** collect:

- Your identity or personal information
- Your browsing history or visited URLs
- Your API keys or credentials
- The content of pages you visit
- Usage statistics, click events, or any telemetry
- Crash reports or error logs

---

## 2. Data Stored Locally on Your Device

WebGist stores the following data **only on your device** using Chrome's built-in storage APIs:

### Settings (`chrome.storage.sync`)
- Your chosen AI provider and model
- Your API keys (one per provider, if entered)
- Custom prompt definitions (label + prompt text)
- Preferences: auto-summarize toggle, summary length, fallback provider order, theme choice

This data is synced across devices signed into the same Chrome profile via Chrome Sync. It is subject to [Google's Chrome Sync privacy policy](https://policies.google.com/privacy). You can clear it at any time by removing the extension or clearing extension data in Chrome settings.

### History (`chrome.storage.local`)
- Page titles and URLs of pages you have explicitly saved
- The summary text and optional translation you saved
- Tags you have added to saved summaries
- Timestamps, summary mode, and provider used

History is stored only on the device where you used WebGist. It is never uploaded or synced. You can clear it any time from the History tab inside the extension.

### Token Usage (`chrome.storage.local`)
- Approximate token counts per AI provider per day, used to show your daily usage
- Automatically pruned after 30 days
- Never sent anywhere — this is purely a local counter

### Summary Cache (`chrome.storage.local`)
- Cached summaries keyed by URL and summary mode, so revisiting a page can show the previous summary instantly
- Up to 100 entries, oldest evicted first
- You can clear the cache from Settings at any time

### Session Cache (`chrome.storage.session`)
- A temporary per-tab cache of the most recent summary, so it survives the popup closing and reopening within the same browser session
- This data is automatically cleared when the browser closes or the tab is closed

### Floating Button Position (`localStorage`)
- The screen coordinates of the draggable floating button, stored per-website to remember where you placed it

---

## 3. Data Sent to Third-Party Services

WebGist interacts with external services **only when you explicitly trigger an action** — by clicking a button, using a keyboard shortcut, or selecting "Summarize with WebGist" from the right-click menu. Nothing is sent automatically in the background (unless you enable auto-summarize, which triggers on panel open).

### 3a. AI Provider (when you trigger a summary)

The text content extracted from the current webpage, along with your summary instructions, is sent to the AI provider you configured. Your API key is included in the request as an authentication header.

- The request goes **directly from your browser to the provider's API** — it does not pass through any WebGist server
- What is sent: page text (up to ~15,000–60,000 characters depending on provider), page title, URL, and your summary instructions
- What is NOT sent: your identity, your browsing history, or any data from other tabs
- When using **multi-tab summarization**, text is extracted from each selected tab and sent together

Each provider has their own privacy policy:

| Provider | Privacy Policy |
|----------|---------------|
| Ollama (Local) | Runs entirely on your machine — no data leaves your device |
| Google Gemini | https://policies.google.com/privacy |
| Groq | https://groq.com/privacy-policy |
| DeepSeek | https://platform.deepseek.com/privacy |
| Cerebras | https://cerebras.ai/privacy |
| SambaNova | https://sambanova.ai/legal/privacy-policy |
| Together AI | https://www.together.ai/privacy |
| NVIDIA NIM | https://www.nvidia.com/en-us/about-nvidia/privacy-policy |
| Moonshot (Kimi) | https://platform.moonshot.cn/docs/privacy |
| Mistral | https://mistral.ai/privacy |
| Cohere | https://cohere.com/privacy |
| OpenRouter | https://openrouter.ai/privacy |
| Anthropic | https://www.anthropic.com/privacy |

### 3b. Ollama (Local AI)

If you use Ollama as your AI provider, all AI processing happens **entirely on your machine** at `http://localhost:11434`. No page content, API keys, or personal data is sent to any external server. Ollama is a separate application you install yourself — WebGist simply sends requests to it on localhost.

### 3c. Jina AI Reader (when you click "Full Page")

When you use Full Page mode and the local Trafilatura server is not running, WebGist may send the current page URL to [Jina AI Reader](https://jina.ai) (`r.jina.ai`) to fetch a clean version of the page content. Jina is a free public service. Only the URL is sent — not your identity or any personal data. See [Jina's privacy policy](https://jina.ai/legal#privacy-policy).

### 3d. Google Translate (when you click "Translate")

When you translate a summary, the summary text is sent to Google's Translate API (`translate.googleapis.com`). No personal information is included. See [Google's Privacy Policy](https://policies.google.com/privacy).

### 3e. Google Translate TTS (when you use Read Aloud)

If your system has no text-to-speech engine installed, WebGist uses Google Translate TTS (`translate.google.com/translate_tts`) to read text aloud. Text chunks are sent in small segments. No personal information is included.

### 3f. Trafilatura Local Server (optional)

If you run `webgist_server.py`, page HTML is sent to `http://127.0.0.1:7777` — a server running **on your own machine**. This data never leaves your device.

### 3g. Provider Health Check

When you select an AI provider in Settings, WebGist may send a lightweight request (e.g., listing available models) to verify the provider is reachable and your API key is valid. No page content is included in these checks.

---

## 4. Permissions Used

WebGist requests the following Chrome permissions:

| Permission | Why it's needed |
|------------|----------------|
| `activeTab` | Read the content of the tab you are currently viewing, when you trigger a summary |
| `scripting` | Inject the content extraction script into the active tab |
| `storage` | Save settings, history, token usage, summary cache, and session data locally |
| `offscreen` | Run text-to-speech in a background context so audio continues when the popup closes |
| `tabs` | Read the current tab's URL and title for the summary and history |
| `contextMenus` | Show "Summarize with WebGist" in the right-click menu when you select text |

**Host permissions** are limited to the specific API endpoints used:

- AI provider APIs (Gemini, Groq, DeepSeek, Cerebras, SambaNova, Together AI, NVIDIA, Moonshot, Mistral, Cohere, OpenRouter, Anthropic)
- Google Translate (`translate.googleapis.com`, `translate.google.com`)
- Jina AI Reader (`r.jina.ai`)
- Local servers (`127.0.0.1:7777` for Trafilatura, `localhost:11434` for Ollama)

WebGist does **not** request `<all_urls>` host permission. Content is only extracted when you explicitly trigger a summary or extraction.

---

## 5. Context Menu and Keyboard Shortcuts

WebGist registers a right-click context menu item ("Summarize with WebGist") that appears when you select text on any webpage. It also registers keyboard shortcuts (Alt+G, Alt+S). These features only activate when you use them — they do not monitor your browsing or keystrokes in the background.

---

## 6. Children's Privacy

WebGist does not knowingly collect any information from children under 13 years of age. The extension does not include any features directed at children.

---

## 7. Changes to This Policy

If this policy is updated, the "Last updated" date at the top of this document will be changed. Significant changes will be noted in the release notes.

---

## 8. Contact

If you have questions about this privacy policy, please open an issue on the GitHub repository:

**https://github.com/wadekarg/WebGist/issues**

---

*WebGist is an open-source project. You can audit every line of code to verify these claims.*
