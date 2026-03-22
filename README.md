# WebGist — AI Webpage Summarizer for Chrome

[![Hits](https://hits.sh/github.com/wadekarg/WebGist.svg?style=for-the-badge&label=Hits&color=3b82f6&labelColor=1e293b)](https://hits.sh/github.com/wadekarg/WebGist/)

WebGist is a Chrome extension that summarizes any webpage using your choice of AI provider. It also translates summaries into 84 languages, reads them aloud with text-to-speech, exports them to PDF or Markdown, and saves them to a searchable history — all without sending your data to any third-party service beyond the AI provider you choose.

---

## Screenshots

### AI Summary + Floating Button
![WebGist popup showing an AI summary of the System Design Roadmap page](docs/screenshot-summary.png)

### Translation + Read Aloud + Export
![WebGist popup showing translation to French and the Read Aloud controls](docs/screenshot-translate.png)

### PDF Export
![WebGist PDF print dialog showing the formatted summary and French translation](docs/screenshot-export.png)

---

## Features

| Feature | Details |
|---------|---------|
| **AI Summary** | 5 built-in modes: Key Points, Brief, ELI5, Actions, Pros & Cons |
| **Custom Prompts** | Create your own summary modes with custom instructions |
| **Streaming** | Responses appear word-by-word in real time |
| **Full Page** | Extract clean article text — no API key needed |
| **Translation** | 84 languages via Google Translate, no API key needed |
| **Read Aloud** | Text-to-speech for original or translated text, 5 speed levels |
| **PDF Export** | Download a formatted PDF of the summary and translation |
| **Markdown Export** | Copy summary as formatted Markdown |
| **History** | Save, search, and tag up to 50 summaries |
| **13 AI Providers** | Including Ollama for free local AI — no API key needed |
| **Keyboard Shortcuts** | Alt+G to open, Alt+S to summarize instantly |
| **Context Menu** | Right-click selected text → "Summarize with WebGist" |
| **Multi-tab** | Summarize content from multiple selected tabs together |
| **Auto-summarize** | Optionally summarize as soon as the panel opens |
| **Provider Fallback** | If your primary provider fails, fallback to another automatically |
| **Summary Comparison** | Compare previous and current summaries side by side |
| **Offline Cache** | Cached summaries load instantly on revisit, with resync |
| **Token Tracking** | See daily token usage per provider |
| **Dark / Light Theme** | Toggle between dark and light mode |
| **Session Cache** | Summary survives popup close/reopen within the same tab |
| **Floating Button** | Draggable button on every page — click to open WebGist |
| **Provider Health** | Green/red indicator shows if your provider is reachable |
| **Setup Guides** | Step-by-step instructions for each provider, right in Settings |

---

## Supported AI Providers

All cloud providers offer a **free tier** — no credit card required. Ollama runs entirely on your machine for free.

| Provider | Default Model | Free Tier |
|----------|--------------|-----------|
| **Ollama (Local)** | Your choice | Completely free — runs on your machine |
| **Google Gemini** | gemini-2.0-flash | 15 requests/min, 1M tokens/day |
| **Groq** | llama-3.3-70b-versatile | 30 requests/min, ultra-fast |
| **DeepSeek** | deepseek-chat | 5M free tokens on signup |
| **Cerebras** | llama-3.3-70b | Free tier, extremely fast inference |
| **SambaNova** | Meta-Llama-3.3-70B | Persistent free tier, 20 RPM |
| **Together AI** | Llama-3.3-70B-Turbo-Free | Permanently free models |
| **NVIDIA NIM** | llama-3.3-70b-instruct | 5,000 free credits |
| **Moonshot (Kimi)** | moonshot-v1-128k | Free credits on signup, 128k context |
| **Mistral** | mistral-small-latest | 1 request/sec |
| **Cohere** | command-r | 20 requests/min (trial key) |
| **OpenRouter** | llama-3.3-70b-instruct:free | Multiple free models |
| **Anthropic** | claude-haiku-4-5 | Limited free tier |

---

## Installation

WebGist is not yet on the Chrome Web Store. Load it manually in developer mode:

1. **Download or clone this repository**
   ```bash
   git clone https://github.com/wadekarg/WebGist.git
   cd WebGist
   ```

2. **Install dependencies and build**
   ```bash
   npm install
   npm run build
   ```
   This creates a `dist/` folder — that is the extension.

3. **Load into Chrome**
   - Open Chrome and go to `chrome://extensions`
   - Enable **Developer mode** (toggle in the top-right corner)
   - Click **Load unpacked**
   - Select the `dist/` folder inside the project

4. The WebGist icon appears in your toolbar. Pin it for easy access.

---

## Setup

### Option A: Use Ollama (Free, Local, No API Key)

1. Download and install [Ollama](https://ollama.com/download)
2. Open a terminal and run: `ollama pull gemma3:4b`
3. In WebGist Settings, select **Ollama (Local)** as your provider
4. Click **Refresh Models** and select your model
5. Click **Save Settings** — done!

### Option B: Use a Cloud Provider (Free Tier)

1. Open WebGist → **Settings** tab
2. Select your **Provider** from the dropdown
3. Expand **"How to set up"** for step-by-step instructions
4. Click the signup link, get your free API key
5. Paste your **API key** and click **Save Settings**

Recommended for beginners: **Google Gemini** — the free tier is generous and setup takes under a minute at [aistudio.google.com](https://aistudio.google.com/apikey).

---

## How to Use

### AI Summary

1. Navigate to any webpage
2. Click the WebGist icon, the floating button, or press **Alt+G**
3. Select a summary mode (Key Points, Brief, ELI5, Actions, Pros & Cons, or a custom prompt)
4. Choose summary length: **Short**, **Medium**, or **Long**
5. Click **AI Summary** (or press **Alt+S** to open and summarize in one step)

The summary streams in word-by-word. You can copy it, save to history, or export.

### Context Menu

Select any text on a webpage → right-click → **"Summarize with WebGist"**. The panel opens and summarizes your selection directly.

### Multi-tab Summarization

1. Ctrl+Click to select multiple tabs in Chrome
2. Open WebGist and click **Multi-tab**
3. Get a combined summary highlighting common themes and differences

### Full Page

Click **Full Page** to extract and display the clean article text without any AI processing. **No API key required.**

### Translate Summary

After generating a summary, the Translate panel appears. Select a language (84 available, searchable) and click **Translate**.

### Read Aloud

After generating a summary, click **Play** in the Read Aloud panel. Toggle between original and translated text. Adjust voice and speed (0.75× to 2×).

### Export

- **Markdown** — Click "Markdown" to copy formatted Markdown to clipboard
- **PDF** — Click "Download" to open a print-ready page and save as PDF

### History

- Click the **bookmark icon** to save a summary
- Open **History** tab to search, tag, and manage saved summaries
- Filter by tags, search by title/URL/content
- Click **Load summary** to restore any entry

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+G` | Open/close WebGist panel |
| `Alt+S` | Open panel and start summarizing |

You can customize these in `chrome://extensions/shortcuts`.

---

## Optional: Trafilatura Local Server (Best Extraction Quality)

For the highest-quality text extraction:

```bash
pip install trafilatura fastapi uvicorn
python webgist_server.py
```

The server runs on `http://127.0.0.1:7777`. When running, WebGist automatically uses it for superior content extraction.

---

## Privacy

WebGist is designed with privacy first:

- **No analytics or tracking** — zero telemetry
- **API keys stored locally** — in Chrome's own storage, never on any external server
- **Page content stays local** — only sent to your chosen AI provider when you trigger a summary
- **Ollama is fully local** — nothing leaves your machine
- **History and cache stored locally** — never uploaded

See the full policy at [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

---

## Project Structure

```
src/
├── popup/              # React UI (side panel)
│   ├── App.tsx         # Main application state and logic
│   └── components/     # Header, SummaryPanel, TranslationPanel,
│                       # AudioControls, ExportPanel, HistoryPanel,
│                       # ProviderSettings
├── background/
│   └── service-worker.ts   # AI API relay, streaming, context menu,
│                           # keyboard shortcuts, health checks
├── content/
│   └── index.ts        # Page text extraction + floating button + side panel
├── offscreen/
│   └── tts.ts          # Text-to-speech engine
├── export/
│   └── index.ts        # PDF relay page
└── utils/
    ├── providers.ts    # 13 AI provider implementations + streaming + health
    ├── storage.ts      # Chrome storage (settings, history, cache, tokens)
    ├── googleTranslate.ts  # Translation via Google Translate
    └── pdf.ts          # PDF template generation

webgist_server.py       # Optional local extraction server (Trafilatura)
```

---

## Tech Stack

- **React 18** + TypeScript — popup UI
- **Tailwind CSS** — styling with CSS custom property theme system
- **Vite** — build system
- **@mozilla/readability** — article extraction fallback
- **Trafilatura** (Python, optional) — best-in-class content extraction
- **Web Speech API** — native text-to-speech
- **Google Translate TTS** — TTS fallback (free, no key)
- **Chrome Manifest V3** — extension platform

---

## Building from Source

```bash
npm install       # install dependencies
npm run build     # production build → dist/
npm run dev       # watch mode for development
```

After each build, go to `chrome://extensions` → click the **reload** button on the WebGist card to apply changes.

---

## License

MIT — see [LICENSE](LICENSE) for details.
