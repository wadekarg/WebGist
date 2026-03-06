// Offscreen document — handles TTS with automatic fallback so it works on all platforms
// Tier 1: Web Speech API (works with system voices OR Google online voice if connected)
// Tier 2: Google Translate TTS (free, no API key, works without any system TTS engine)

let keepAliveTimer: ReturnType<typeof setInterval> | null = null
let currentAudio: HTMLAudioElement | null = null
let isPlayingAudio = false       // true when using the audio-element fallback
let isSpeechPausedByUser = false // prevents keep-alive from auto-resuming a user-requested pause
let isAudioPausedByUser  = false // same guard for audio elements
let currentSpeakId = 0           // incremented on every ttsSpeak call to abort stale continuations

function broadcast(msg: object) {
  chrome.runtime.sendMessage(msg).catch(() => {})
}

// --- Voice loading ---

function pollForVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) { resolve(voices); return }

    let resolved = false

    const onChanged = () => {
      if (resolved) return
      resolved = true
      window.speechSynthesis.removeEventListener('voiceschanged', onChanged)
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', onChanged)

    setTimeout(() => {
      if (resolved) return
      resolved = true
      window.speechSynthesis.removeEventListener('voiceschanged', onChanged)
      resolve(window.speechSynthesis.getVoices())
    }, timeoutMs)
  })
}

// --- Tier 1: Web Speech API ---

function stopWebSpeech() {
  isSpeechPausedByUser = false
  window.speechSynthesis.cancel()
  if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null }
}

// Split text into utterance-safe chunks.
// Chrome silently skips large portions of text when given a single long utterance.
// Speaking each chunk as its own utterance ensures every sentence is read.
function splitForSpeech(text: string, maxChars = 200): string[] {
  const result: string[] = []
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    if (line.length <= maxChars) { result.push(line); continue }

    // Split at sentence boundaries: punctuation NOT preceded by a digit
    // (avoids splitting "1." "2." numbered list markers)
    const parts = line.split(/(?<=[^\d\s][.!?])\s+(?=[A-Z"'])/)
    let buf = ''
    for (const part of parts) {
      if (buf && (buf + ' ' + part).length > maxChars) {
        result.push(buf)
        buf = part
      } else {
        buf = buf ? buf + ' ' + part : part
      }
    }
    if (buf) result.push(buf)
  }

  return result.filter(s => s.trim().length > 0)
}

// Speak a single chunk as one utterance. Resolves when done or interrupted.
function speakChunk(
  text: string,
  voice: SpeechSynthesisVoice | null,
  speed: number,
  onStarted?: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate  = speed
    utterance.pitch = 1
    utterance.volume = 1
    if (voice) utterance.voice = voice

    utterance.onstart  = () => onStarted?.()
    utterance.onend    = () => resolve()
    utterance.onerror  = (e) => {
      // interrupted / canceled = user pressed stop — treat as normal end
      if (e.error === 'interrupted' || e.error === 'canceled') resolve()
      else reject(new Error(e.error ?? 'speech-error'))
    }
    utterance.onpause  = () => broadcast({ type: 'TTS_EVENT', event: 'pause' })
    utterance.onresume = () => broadcast({ type: 'TTS_EVENT', event: 'resume' })

    window.speechSynthesis.speak(utterance)
  })
}

async function ttsViaWebSpeech(
  text: string,
  voices: SpeechSynthesisVoice[],
  voiceName: string | undefined,
  langCode: string,
  speed: number,
  speakId: number
): Promise<void> {
  const chunks = splitForSpeech(text)
  if (chunks.length === 0) throw new Error('speech-silent-fail')

  // Select voice once for all chunks
  let voice: SpeechSynthesisVoice | null = null
  if (voiceName) {
    voice = voices.find(v => v.name === voiceName) ?? null
  } else {
    const langPrefix = langCode.split('-')[0].toLowerCase()
    const isEnglish  = langPrefix === 'en'

    if (isEnglish) {
      const googleOnline = voices.find(v => v.name.toLowerCase().includes('google') && !v.localService)
      const anyOnline    = voices.find(v => !v.localService && v.lang.startsWith('en'))
      const anyEnglish   = voices.find(v => v.lang.startsWith('en'))
      voice = googleOnline ?? anyOnline ?? anyEnglish ?? voices[0] ?? null
    } else {
      // For non-English: require a matching system voice — if none, throw so we
      // fall through to Google Translate TTS which handles all languages correctly.
      const match = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix))
      if (!match) throw new Error('no-matching-voice')
      voice = match
    }
  }

  let started = false

  // Silent-fail: if the first chunk doesn't start within 3 s, abort
  const silentFailTimer = setTimeout(() => {
    if (!started) stopWebSpeech()
  }, 3000)

  try {
    for (let i = 0; i < chunks.length; i++) {
      if (speakId !== currentSpeakId) return   // stopped or superseded

      // If user paused between chunks, wait until resumed or stopped
      while (isSpeechPausedByUser && speakId === currentSpeakId) {
        await new Promise(r => setTimeout(r, 80))
      }
      if (speakId !== currentSpeakId) return

      await speakChunk(chunks[i], voice, speed, i === 0 ? () => {
        started = true
        clearTimeout(silentFailTimer)
        broadcast({ type: 'TTS_EVENT', event: 'start' })

        // Keep-alive spans all chunks
        let nudgeTick = 0
        keepAliveTimer = setInterval(() => {
          if (window.speechSynthesis.paused) {
            if (!isSpeechPausedByUser) { window.speechSynthesis.resume(); nudgeTick = 0 }
            return
          }
          nudgeTick++
          if (nudgeTick >= 10 && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause()
            window.speechSynthesis.resume()
            nudgeTick = 0
          }
        }, 1000)
      } : undefined)
    }
  } finally {
    clearTimeout(silentFailTimer)
    if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null }
    if (!started) throw new Error('speech-silent-fail')
  }
}

// --- Tier 2: Google Translate TTS ---

function splitIntoChunks(text: string, maxLen = 150): string[] {
  // Reuse splitForSpeech with a tighter limit suitable for Google TTS URLs
  const sentences = splitForSpeech(text, maxLen)

  // Drop chunks with fewer than 3 real letters (lone punctuation, "1.", etc.)
  return sentences.filter(
    (c) => c.replace(/[^\p{L}]/gu, '').length > 2
  )
}

async function playChunk(url: string, speed = 1.0): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url)
    audio.playbackRate = speed
    audio.addEventListener('loadeddata', () => { audio.playbackRate = speed })
    currentAudio = audio

    // Auto-resume if the browser pauses the audio unexpectedly (e.g. tab switch).
    // Only resume if THIS chunk is still the active one — prevents replaying finished chunks.
    audio.addEventListener('pause', () => {
      if (isPlayingAudio && !isAudioPausedByUser) {
        setTimeout(() => {
          if (isPlayingAudio && !isAudioPausedByUser && currentAudio === audio) {
            audio.play().catch(() => {})
          }
        }, 200)
      }
    })

    audio.onended = () => { currentAudio = null; resolve() }
    audio.onerror = () => { currentAudio = null; reject(new Error('audio-error')) }
    audio.play().catch(reject)
  })
}

async function ttsViaGoogleTTS(text: string, langCode = 'en', speed = 1.0): Promise<void> {
  isPlayingAudio = true
  const chunks = splitIntoChunks(text, 100)

  try {
    for (const chunk of chunks) {
      if (!isPlayingAudio) break
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(langCode)}&q=${encodeURIComponent(chunk)}`
      try {
        await playChunk(url, speed)
      } catch {
        // Skip failed chunk (network blip, empty audio, etc.) and keep going
      }
    }
  } finally {
    isPlayingAudio = false
    currentAudio = null
  }
}

// --- Main TTS entry ---

async function ttsSpeak(text: string, voiceName?: string, langCode = 'en', speed = 1.0) {
  // Give this call a unique ID. Any async continuation that checks speakId === currentSpeakId
  // after an await will bail out if a newer ttsSpeak() has started in the meantime.
  // This prevents the race where cancelling Tier 1 causes its onerror to fall through to
  // Tier 2 at the same time a new Tier 1 is starting.
  const speakId = ++currentSpeakId

  stopWebSpeech()
  stopAudio()

  // Tier 1: Web Speech API — only if system voices are available
  const voices = await pollForVoices(2000)
  if (speakId !== currentSpeakId) return  // superseded

  if (voices.length > 0) {
    try {
      await ttsViaWebSpeech(text, voices, voiceName, langCode, speed, speakId)
      if (speakId !== currentSpeakId) return  // superseded
      broadcast({ type: 'TTS_EVENT', event: 'end' })
      return
    } catch {
      if (speakId !== currentSpeakId) return  // superseded — do NOT fall through to Tier 2
    }
  }

  // Tier 2: Google Translate TTS (works without any OS TTS engine)
  broadcast({ type: 'TTS_EVENT', event: 'start' })
  try {
    await ttsViaGoogleTTS(text, langCode, speed)
    if (speakId !== currentSpeakId) return
    broadcast({ type: 'TTS_EVENT', event: 'end' })
  } catch {
    broadcast({ type: 'TTS_EVENT', event: 'error' })
  }
}

function stopAudio() {
  isAudioPausedByUser = false
  isPlayingAudio = false
  if (currentAudio) { currentAudio.pause(); currentAudio = null }
}

// --- Voice list ---

async function getVoices(): Promise<{ name: string; lang: string; default: boolean }[]> {
  const voices = await pollForVoices(2000)
  return voices.map((v) => ({ name: v.name, lang: v.lang, default: v.default }))
}

// --- Message listener ---

chrome.runtime.onMessage.addListener(
  (
    message: {
      type: string
      target?: string
      text?: string
      voiceName?: string
      langCode?: string
      speed?: number
    },
    _sender,
    sendResponse
  ) => {
    if (message.target !== 'offscreen') return false

    if (message.type === 'TTS_SPEAK' && message.text) {
      ttsSpeak(message.text, message.voiceName, message.langCode ?? 'en', message.speed ?? 1.0)
      sendResponse({ ok: true })
      return true
    }

    if (message.type === 'TTS_PAUSE') {
      if (isPlayingAudio) {
        isAudioPausedByUser = true
        currentAudio?.pause()
        broadcast({ type: 'TTS_EVENT', event: 'pause' })
      } else {
        isSpeechPausedByUser = true
        window.speechSynthesis.pause()
        broadcast({ type: 'TTS_EVENT', event: 'pause' })
      }
      sendResponse({ ok: true })
      return true
    }

    if (message.type === 'TTS_RESUME') {
      if (isPlayingAudio) {
        isAudioPausedByUser = false
        currentAudio?.play()
        broadcast({ type: 'TTS_EVENT', event: 'resume' })
      } else {
        isSpeechPausedByUser = false
        window.speechSynthesis.resume()
      }
      sendResponse({ ok: true })
      return true
    }

    if (message.type === 'TTS_STOP') {
      stopWebSpeech()
      stopAudio()
      sendResponse({ ok: true })
      return true
    }

    if (message.type === 'GET_VOICES') {
      getVoices().then((voices) => sendResponse(voices))
      return true
    }

    if (message.type === 'GET_TTS_STATE') {
      const speaking = window.speechSynthesis.speaking && !window.speechSynthesis.paused
      sendResponse({
        isPlaying: isPlayingAudio || speaking,
        isPaused:  isPlayingAudio ? !!(currentAudio?.paused) : window.speechSynthesis.paused,
      })
      return true
    }

    if (message.type === 'TTS_SET_SPEED') {
      const spd = message.speed ?? 1.0
      if (isPlayingAudio && currentAudio) currentAudio.playbackRate = spd
      // Web Speech API: can't change rate mid-utterance, no-op
      sendResponse({ ok: true })
      return true
    }

    return false
  }
)
