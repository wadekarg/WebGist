#!/usr/bin/env python3
"""
WebGist local extraction server — uses Trafilatura for best-in-class content extraction.

Setup (one-time):
    pip install trafilatura fastapi uvicorn

Run:
    python webgist_server.py

The extension will automatically use this server when it's running.
Falls back to Jina AI Reader → Readability if the server is not running.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import trafilatura

app = FastAPI(title="WebGist Extraction Server", version="1.0.0")

# Allow requests from the Chrome extension (chrome-extension://* origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


class ExtractRequest(BaseModel):
    html: str
    url: Optional[str] = ""


@app.post("/extract")
async def extract_content(req: ExtractRequest):
    """Extract clean article text from raw HTML using Trafilatura."""
    text = trafilatura.extract(
        req.html,
        url=req.url or None,
        include_tables=True,
        include_comments=False,
        include_links=False,
        no_fallback=False,
        favor_recall=True,   # Capture more content, fewer false negatives
    )

    if not text or not text.strip():
        return {"text": "", "error": "No content extracted"}

    return {"text": text.strip(), "error": None}


@app.get("/health")
async def health():
    """Health check — used by the extension to detect if the server is running."""
    return {"status": "ok", "engine": "trafilatura"}


if __name__ == "__main__":
    import uvicorn
    print("=" * 55)
    print("  WebGist extraction server")
    print("  Running on http://127.0.0.1:7777")
    print("  Keep this terminal open while using WebGist.")
    print("=" * 55)
    uvicorn.run(app, host="127.0.0.1", port=7777, log_level="warning")
