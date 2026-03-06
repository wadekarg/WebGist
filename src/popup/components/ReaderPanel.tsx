import React, { useState, useEffect } from 'react'
import { BookOpen, AlertCircle } from 'lucide-react'
import AudioControls from './AudioControls'
import TranslationPanel from './TranslationPanel'
import ExportPanel from './ExportPanel'

interface ReaderPanelProps {
  status: 'idle' | 'extracting' | 'ready' | 'error'
  errorMsg: string
  text: string
  title: string
  url: string
  translation: string
  translatedLang: string
  translatedLangCode: string   // BCP 47 code, e.g. 'es'
  isTranslating: boolean
  translateProgress: number
  translateError: string
  onReadPage: () => void
  onTextChange: (text: string) => void
  onTranslate: (langCode: string, langName: string) => void
}

function wordCount(text: string) { return text.trim().split(/\s+/).filter(Boolean).length }
function readingMins(text: string) { return Math.ceil(wordCount(text) / 200) }

export default function ReaderPanel({
  status, errorMsg, text, title, url,
  translation, translatedLang, translatedLangCode,
  isTranslating, translateProgress, translateError,
  onReadPage, onTextChange, onTranslate,
}: ReaderPanelProps) {
  const isReady = status === 'ready' && text.length > 0
  const hasTranslation = !!translation && !!translatedLang

  // Which text the "Read Aloud" player is reading right now.
  // Default to 'translation' so that when translation first arrives, ttsText is
  // immediately correct on the very first render — no async effect lag.
  const [readSource, setReadSource] = useState<'original' | 'translation'>('translation')

  // Reset to 'translation' whenever the active language changes (new translation or cleared)
  useEffect(() => {
    setReadSource('translation')
  }, [translatedLangCode])

  // The exact text and lang that AudioControls will read — determined HERE, not inside AudioControls.
  // ttsLang must also gate on hasTranslation: langCode gets set at translation-start (before the
  // await), so without the hasTranslation check AudioControls would see langCode='es' while
  // ttsText is still the original English text.
  const ttsText = readSource === 'translation' && hasTranslation ? translation : text
  const ttsLang = readSource === 'translation' && hasTranslation && translatedLangCode
    ? translatedLangCode : undefined

  return (
    <div className="flex flex-col gap-0">

      {/* Extract button */}
      <div className="px-4 pt-4 pb-3">
        <button
          onClick={onReadPage}
          disabled={status === 'extracting'}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
            text-sm font-semibold transition-all
            ${status === 'extracting'
              ? 'bg-teal-900/50 text-teal-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-lg shadow-teal-900/30'
            }`}
        >
          {status === 'extracting' ? (
            <>
              <span className="w-4 h-4 border-2 border-teal-300/30 border-t-teal-200 rounded-full animate-spin" />
              Extracting page...
            </>
          ) : (
            <>
              <BookOpen size={15} />
              {isReady ? 'Re-extract Page' : 'Extract & Read Page'}
            </>
          )}
        </button>
        {!isReady && status !== 'extracting' && (
          <p className="text-gray-600 text-[11px] text-center mt-2">
            Reads the current page aloud — no AI or API key needed
          </p>
        )}
      </div>

      {/* Error */}
      {status === 'error' && (
        <div className="mx-4 mb-3 flex items-start gap-2 bg-red-950/30 border border-red-700/30 rounded-xl px-3 py-2.5">
          <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300 text-xs">{errorMsg}</p>
        </div>
      )}

      {/* Editable text + stats */}
      {isReady && (
        <div className="px-4 pb-3">
          <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-gray-500 text-[10px] truncate flex-1">{url.replace(/^https?:\/\//, '')}</span>
              <span className="text-gray-600 text-[10px] flex-shrink-0">{wordCount(text).toLocaleString()} words</span>
              <span className="text-gray-600 text-[10px] flex-shrink-0">~{readingMins(text)} min</span>
            </div>
            <textarea
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              className="w-full h-36 bg-transparent text-gray-300 text-[11px] leading-relaxed
                         resize-none focus:outline-none placeholder-gray-600 overflow-y-auto"
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {/* Source toggle — only shown when a translation exists */}
      {isReady && hasTranslation && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <span className="text-gray-600 text-[10px]">Reading:</span>
          <div className="flex items-center bg-gray-900/50 border border-gray-700/40 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setReadSource('original')}
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium transition-all
                ${readSource === 'original' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >Original</button>
            <button
              onClick={() => setReadSource('translation')}
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium transition-all
                ${readSource === 'translation' ? 'bg-violet-700/60 text-violet-200' : 'text-gray-500 hover:text-gray-300'}`}
            >{translatedLang}</button>
          </div>
        </div>
      )}

      {/* TTS controls — receives the already-resolved text and lang */}
      {isReady && (
        <AudioControls text={ttsText} langCode={ttsLang} />
      )}

      {/* Translation */}
      {isReady && (
        <>
          {isTranslating && translateProgress > 0 && translateProgress < 100 && (
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2 text-[11px] text-violet-400">
                <span className="w-3 h-3 border-2 border-violet-300/30 border-t-violet-300 rounded-full animate-spin flex-shrink-0" />
                Translating page… {translateProgress}%
              </div>
            </div>
          )}
          <TranslationPanel
            summary={text}
            translatedSummary={translation}
            isTranslating={isTranslating}
            translateError={translateError}
            onTranslate={onTranslate}
          />
        </>
      )}

      {/* Export */}
      {isReady && (
        <ExportPanel
          summary={text}
          translatedSummary={translation}
          translatedLang={translatedLang}
          pageTitle={title}
          pageUrl={url}
        />
      )}
    </div>
  )
}
