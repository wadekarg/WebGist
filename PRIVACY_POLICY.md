# Privacy Policy — WebGist Chrome Extension

**Last updated: March 16, 2026** · **Version 1.0.0**

WebGist is a Chrome browser extension that summarizes webpages using AI. This policy explains clearly what data is collected, what is not collected, and how any data that leaves your device is handled.

---

## Summary

| Question | Answer |
|----------|--------|
| Do we collect personal data? | **No** |
| Do we track your browsing? | **No** |
| Is your data sold to third parties? | **No** |
| Is your API key sent to our servers? | **No — it never leaves your device** |
| Is page content sent anywhere? | **Only to the AI provider you choose, only when you click "AI Summary"** |
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

This data is synced across devices signed into the same Chrome profile via Chrome Sync. It is subject to [Google's Chrome Sync privacy policy](https://policies.google.com/privacy). You can clear it at any time by removing the extension or clearing extension data in Chrome settings.

### History (`chrome.storage.local`)
- Page titles and URLs of pages you have explicitly saved
- The summary text and optional translation you saved
- Timestamps

History is stored only on the device where you used WebGist. It is never uploaded or synced. You can clear it any time from the History tab inside the extension.

### Session Cache (`chrome.storage.session`)
- A temporary per-tab cache of the most recent summary, so it survives the popup closing and reopening within the same browser session
- This data is automatically cleared when the browser closes

### Floating Button Position (`localStorage`)
- The screen coordinates of the draggable floating button, stored per-website to remember where you placed it

---

## 3. Data Sent to Third-Party Services

WebGist interacts with external services **only when you explicitly trigger an action**. Nothing is sent automatically in the background.

### 3a. AI Provider (when you click "AI Summary")

The text content extracted from the current webpage, along with your summary instructions, is sent to the AI provider you configured (e.g., Google Gemini, Groq, Anthropic). Your API key is included in the request as an authentication header.

- The request goes **directly from your browser to the provider's API** — it does not pass through any WebGist server
- What is sent: page text (up to ~15,000 characters), page title, URL, and your summary mode instructions
- What is NOT sent: your identity, your browsing history, or any data from other tabs

Each provider has their own privacy policy:

| Provider | Privacy Policy |
|----------|---------------|
| Google Gemini | https://policies.google.com/privacy |
| Groq | https://groq.com/privacy-policy |
| Mistral | https://mistral.ai/privacy |
| Cohere | https://cohere.com/privacy |
| OpenRouter | https://openrouter.ai/privacy |
| Anthropic | https://www.anthropic.com/privacy |
| Cerebras | https://cerebras.ai/privacy |

### 3b. Jina AI Reader (when you click "Full Page")

When you use Full Page mode and the local Trafilatura server is not running, WebGist may send the current page URL to [Jina AI Reader](https://jina.ai) (`r.jina.ai`) to fetch a clean version of the page content. Jina is a free public service. Only the URL is sent — not your identity or any personal data. See [Jina's privacy policy](https://jina.ai/legal#privacy-policy).

### 3c. Google Translate (when you click "Translate")

When you translate a summary, the summary text is sent to Google's Translate API (`translate.googleapis.com`). No personal information is included. See [Google's Privacy Policy](https://policies.google.com/privacy).

### 3d. Google Translate TTS (when you use Read Aloud)

If your system has no text-to-speech engine installed, WebGist uses Google Translate TTS (`translate.google.com/translate_tts`) to read text aloud. Text chunks are sent in small segments. No personal information is included.

### 3e. Trafilatura Local Server (optional)

If you run `webgist_server.py`, page HTML is sent to `http://127.0.0.1:7777` — a server running **on your own machine**. This data never leaves your device.

---

## 4. Permissions Used

WebGist requests the following Chrome permissions:

| Permission | Why it's needed |
|------------|----------------|
| `activeTab` | Read the content of the tab you are currently viewing, when you click a button |
| `scripting` | Inject the content extraction script into the active tab |
| `storage` | Save settings, history, and session cache locally |
| `offscreen` | Run text-to-speech in a background context so audio continues when the popup closes |
| `downloads` | (Reserved for future use; not actively used) |
| `tabs` | Read the current tab's URL and title for the summary and history |

**Host permissions** (`<all_urls>`, `http://127.0.0.1:7777/*`) are required to:
- Inject the floating action button on all pages
- Communicate with the optional local extraction server

WebGist does **not** read the content of tabs in the background. Content is only extracted when you explicitly click "AI Summary" or "Full Page".

---

## 5. Children's Privacy

WebGist does not knowingly collect any information from children under 13 years of age. The extension does not include any features directed at children.

---

## 6. Changes to This Policy

If this policy is updated, the "Last updated" date at the top of this document will be changed. Significant changes will be noted in the release notes.

---

## 7. Contact

If you have questions about this privacy policy, please open an issue on the GitHub repository:

**https://github.com/wadekarg/WebGist/issues**

---

*WebGist is an open-source project. You can audit every line of code to verify these claims.*
