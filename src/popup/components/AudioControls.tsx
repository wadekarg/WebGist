import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, Volume2, ChevronDown } from 'lucide-react'

interface VoiceInfo { name: string; lang: string; default: boolean }

interface AudioControlsProps {
  originalText: string
  translatedText?: string
  translatedLang?: string      // display name e.g. "Spanish"
  translatedLangCode?: string  // BCP-47 e.g. 'es'
}

type AudioState = 'idle' | 'playing' | 'paused'

const SPEEDS = [
  { label: '0.75×', value: 0.75 },
  { label: '1×',    value: 1.0  },
  { label: '1.25×', value: 1.25 },
  { label: '1.5×',  value: 1.5  },
  { label: '2×',    value: 2.0  },
]

// Shown only when no system voices are available (Linux/ChromeOS with no TTS engine).
// Lets the user pick a Google Translate TTS accent for English.
const EN_LOCALES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-AU', label: 'English (AU)' },
  { code: 'en-IN', label: 'English (IN)' },
]

function sendTtsMessage(type: string, text?: string, voiceName?: string, langCode?: string, speed?: number): void {
  const msg: Record<string, unknown> = { type }
  if (text)      msg.text      = text
  if (voiceName) msg.voiceName = voiceName
  if (langCode)  msg.langCode  = langCode
  if (speed)     msg.speed     = speed
  chrome.runtime.sendMessage(msg).catch(() => {})
}

function getVoicesFromOffscreen(): Promise<VoiceInfo[]> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_VOICES' }, (response) => {
      if (chrome.runtime.lastError || !Array.isArray(response)) { resolve([]); return }
      resolve(response as VoiceInfo[])
    })
  })
}

function getTtsState(): Promise<{ isPlaying: boolean; isPaused: boolean }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_TTS_STATE' }, (response) => {
      if (chrome.runtime.lastError || !response) { resolve({ isPlaying: false, isPaused: false }); return }
      resolve(response)
    })
  })
}

export default function AudioControls({
  originalText,
  translatedText,
  translatedLang,
  translatedLangCode,
}: AudioControlsProps) {
  const [audioState, setAudioState]       = useState<AudioState>('idle')
  const [voices, setVoices]               = useState<VoiceInfo[]>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [googleLocale, setGoogleLocale]   = useState('en-US')
  const [speed, setSpeed]                 = useState(1.0)
  const [ttsError, setTtsError]           = useState('')
  const [readingSource, setReadingSource] = useState<'original' | 'translated'>('original')
  const mountedRef = useRef(false)

  // Derived: what text + langCode are actually being read
  const usingTranslated = readingSource === 'translated' && !!translatedText
  const activeText  = usingTranslated ? translatedText! : originalText
  const ttsLangCode = usingTranslated && translatedLangCode ? translatedLangCode : googleLocale
  const isEnglish   = !usingTranslated

  // On mount: load voices and sync TTS state from offscreen
  useEffect(() => {
    getVoicesFromOffscreen().then((v) => setVoices(v))
    getTtsState().then(({ isPlaying, isPaused }) => {
      if (isPlaying)     setAudioState('playing')
      else if (isPaused) setAudioState('paused')
    })
  }, [])

  // Auto-select best voice for current source language
  useEffect(() => {
    if (voices.length === 0) return
    const prefix = (usingTranslated ? (translatedLangCode ?? 'en') : 'en').split('-')[0].toLowerCase()
    const match  = voices.find(v => v.lang.toLowerCase().startsWith(prefix))
    setSelectedVoice(match?.name ?? '')
  }, [usingTranslated, translatedLangCode, voices])

  // Stop TTS when source text or reading language changes (after initial mount)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    sendTtsMessage('TTS_STOP')
    setAudioState('idle')
  }, [activeText, readingSource])

  // Reset to original when translation is cleared
  useEffect(() => {
    if (!translatedText) setReadingSource('original')
  }, [translatedText])

  // Listen for TTS events from offscreen
  useEffect(() => {
    function handle(msg: { type: string; event?: string }) {
      if (msg.type !== 'TTS_EVENT') return
      if (msg.event === 'start')  { setAudioState('playing'); setTtsError('') }
      if (msg.event === 'end')    setAudioState('idle')
      if (msg.event === 'pause')  setAudioState('paused')
      if (msg.event === 'resume') setAudioState('playing')
      if (msg.event === 'error')  { setAudioState('idle'); setTtsError('Audio failed. Check your internet connection.') }
    }
    chrome.runtime.onMessage.addListener(handle)
    return () => chrome.runtime.onMessage.removeListener(handle)
  }, [])

  // Apply speed change immediately while playing
  useEffect(() => {
    if (audioState === 'playing' || audioState === 'paused') {
      sendTtsMessage('TTS_SET_SPEED', undefined, undefined, undefined, speed)
    }
  }, [speed])

  function handlePlay() {
    if (!activeText) return
    if (audioState === 'paused') { sendTtsMessage('TTS_RESUME'); setAudioState('playing'); return }
    sendTtsMessage('TTS_SPEAK', activeText, selectedVoice || undefined, ttsLangCode, speed)
    setAudioState('playing')
  }
  function handlePause() {
    if (audioState === 'playing') { sendTtsMessage('TTS_PAUSE'); setAudioState('paused') }
  }
  function handleStop() { sendTtsMessage('TTS_STOP'); setAudioState('idle') }

  if (!originalText) return null

  const hasTranslation = !!translatedText

  return (
    <div className="px-4 pb-3" onClick={() => setTtsError('')}>
      <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl overflow-hidden">

        {/* Playback row */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Volume2 size={14} className="text-teal-400" />
            <span className="text-gray-300 text-xs font-medium">Read Aloud</span>
            {audioState === 'playing' && (
              <span className="flex items-center gap-1 text-teal-400 text-[11px]">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                Reading...
              </span>
            )}
            {audioState === 'paused' && <span className="text-amber-400 text-[11px]">Paused</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={audioState === 'playing' ? handlePause : handlePlay}
              className={`p-1.5 rounded-lg transition-all
                ${audioState === 'playing'
                  ? 'bg-teal-600/20 text-teal-300 hover:bg-teal-600/30'
                  : 'text-teal-400 hover:bg-teal-900/30 hover:text-teal-300'}`}
            >
              {audioState === 'playing' ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button
              onClick={handleStop}
              disabled={audioState === 'idle'}
              className={`p-1.5 rounded-lg transition-all
                ${audioState === 'idle' ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              <Square size={15} />
            </button>
          </div>
        </div>

        {ttsError && (
          <div className="border-t border-red-900/30 px-3 py-2 bg-red-950/20">
            <p className="text-red-400 text-[10px]">{ttsError}</p>
          </div>
        )}

        {/* Options */}
        <div className="border-t border-gray-700/30 px-3 py-2 space-y-1.5">

          {/* Language source picker — only shown when translation exists */}
          {hasTranslation && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600 text-[10px] w-9 flex-shrink-0">Read</span>
              <div className="flex items-center gap-1 bg-gray-900/50 border border-gray-700/40 rounded-lg p-0.5">
                <button
                  onClick={() => setReadingSource('original')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all
                    ${readingSource === 'original'
                      ? 'bg-teal-700/60 text-teal-200'
                      : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Original
                </button>
                <button
                  onClick={() => setReadingSource('translated')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all
                    ${readingSource === 'translated'
                      ? 'bg-teal-700/60 text-teal-200'
                      : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {translatedLang ?? 'Translated'}
                </button>
              </div>
            </div>
          )}

          {/* Voice */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600 text-[10px] w-9 flex-shrink-0">Voice</span>
            {voices.length > 0 ? (
              <div className="relative flex-1 min-w-0">
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700/40 rounded-lg pl-2 pr-6 py-0.5
                             text-[10px] text-gray-300 appearance-none focus:outline-none focus:border-teal-600/50 cursor-pointer truncate"
                >
                  <option value="">System default</option>
                  {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            ) : isEnglish ? (
              <div className="relative flex-1 min-w-0">
                <select
                  value={googleLocale}
                  onChange={(e) => setGoogleLocale(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700/40 rounded-lg pl-2 pr-6 py-0.5
                             text-[10px] text-gray-300 appearance-none focus:outline-none focus:border-teal-600/50 cursor-pointer truncate"
                >
                  {EN_LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            ) : (
              <span className="text-gray-400 text-[10px]">Google Translate · {translatedLangCode}</span>
            )}
          </div>

          {/* Speed */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600 text-[10px] w-9 flex-shrink-0">Speed</span>
            <div className="flex items-center gap-0.5 bg-gray-900/50 border border-gray-700/40 rounded-lg p-0.5">
              {SPEEDS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSpeed(s.value)}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all
                    ${speed === s.value ? 'bg-teal-700/60 text-teal-200' : 'text-gray-500 hover:text-gray-300'}`}
                >{s.label}</button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
