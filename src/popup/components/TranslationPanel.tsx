import React, { useState, useRef, useEffect } from 'react'
import { Languages, AlertCircle, Copy, CheckCheck, Search, X } from 'lucide-react'

interface TranslationPanelProps {
  summary: string
  translatedSummary: string
  isTranslating: boolean
  translateError: string
  onTranslate: (langCode: string, langName: string) => void
}

const LANGUAGES = [
  { code: 'af', name: 'Afrikaans' },
  { code: 'sq', name: 'Albanian' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'hy', name: 'Armenian' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'eu', name: 'Basque' },
  { code: 'be', name: 'Belarusian' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'bg', name: 'Bulgarian', native: 'Български' },
  { code: 'ca', name: 'Catalan' },
  { code: 'zh', name: 'Chinese (Simplified)', native: '中文' },
  { code: 'zh-tw', name: 'Chinese (Traditional)', native: '繁體中文' },
  { code: 'hr', name: 'Croatian' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'et', name: 'Estonian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'gl', name: 'Galician' },
  { code: 'ka', name: 'Georgian' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ht', name: 'Haitian Creole' },
  { code: 'he', name: 'Hebrew', native: 'עברית' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ga', name: 'Irish' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'ms', name: 'Malay' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mt', name: 'Maltese' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'mn', name: 'Mongolian' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fa', name: 'Persian', native: 'فارسی' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'sr', name: 'Serbian' },
  { code: 'si', name: 'Sinhala' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'sw', name: 'Swahili' },
  { code: 'sv', name: 'Swedish' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'th', name: 'Thai', native: 'ภาษาไทย' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'uz', name: 'Uzbek' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'cy', name: 'Welsh' },
  { code: 'yi', name: 'Yiddish' },
]

export default function TranslationPanel({
  summary,
  translatedSummary,
  isTranslating,
  translateError,
  onTranslate,
}: TranslationPanelProps) {
  const [selectedLang, setSelectedLang] = useState(LANGUAGES.find((l) => l.code === 'es')!)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Match against both the English name and the native script (e.g. "中文", "Español")
  const filtered = search.trim()
    ? LANGUAGES.filter((l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.native ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : LANGUAGES

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  function selectLang(lang: typeof LANGUAGES[0]) {
    setSelectedLang(lang)
    setOpen(false)
    setSearch('')
  }

  function handleTranslate() {
    onTranslate(selectedLang.code, selectedLang.name)
  }

  function handleCopy() {
    if (!translatedSummary) return
    const doCopy = (text: string): Promise<void> => {
      if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text).catch(() => {
          const ta = document.createElement('textarea')
          ta.value = text
          ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
          return Promise.resolve()
        })
      }
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return Promise.resolve()
    }
    doCopy(translatedSummary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!summary) return null

  return (
    <div className="px-4 pb-3">
      <div className="bg-gray-800/40 border border-violet-800/20 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Languages size={14} className="text-violet-400" />
          <span className="text-gray-300 text-xs font-medium">Translate Summary</span>
        </div>

        <div className="flex gap-2">
          {/* Searchable language picker */}
          <div className="relative flex-1" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="w-full flex items-center justify-between bg-gray-700/60 border border-gray-600/60
                         rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none
                         hover:border-violet-600/50 transition-colors"
            >
              <span>
                {selectedLang.name}
                {selectedLang.native && (
                  <span className="text-gray-400 ml-1.5">{selectedLang.native}</span>
                )}
              </span>
              <Search size={11} className="text-gray-400 flex-shrink-0 ml-1" />
            </button>

            {open && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0
                              bg-gray-800 border border-gray-600/60 rounded-xl shadow-2xl shadow-black/60
                              overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-2 px-2.5 py-2 border-b border-gray-700/60">
                  <Search size={11} className="text-gray-400 flex-shrink-0" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search language..."
                    className="flex-1 bg-transparent text-white text-xs placeholder-gray-500
                               focus:outline-none min-w-0"
                  />
                  {search && (
                    <button onClick={() => setSearch('')}>
                      <X size={11} className="text-gray-500 hover:text-gray-300" />
                    </button>
                  )}
                </div>

                {/* Language list */}
                <div className="max-h-44 overflow-y-auto py-1">
                  {filtered.length === 0 ? (
                    <p className="text-gray-500 text-xs px-3 py-2">No results</p>
                  ) : (
                    filtered.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => selectLang(lang)}
                        className={`w-full flex items-center justify-between px-3 py-1.5
                                    text-xs text-left transition-colors
                                    ${selectedLang.code === lang.code
                                      ? 'bg-violet-700/30 text-violet-300'
                                      : 'text-gray-200 hover:bg-gray-700/60'
                                    }`}
                      >
                        <span>{lang.name}</span>
                        {lang.native && (
                          <span className="text-gray-500 text-[10px]">{lang.native}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0
              ${isTranslating
                ? 'text-teal-300 cursor-not-allowed'
                : 'text-white'
              }`}
            style={
              isTranslating
                ? { background: 'var(--accent-muted)' }
                : { background: 'linear-gradient(to right, var(--grad-from), var(--grad-to))' }
            }
          >
            {isTranslating ? (
              <>
                <span className="w-3 h-3 border-2 border-teal-300/30 border-t-teal-200 rounded-full animate-spin" />
                Translating...
              </>
            ) : 'Translate'}
          </button>
        </div>

        {translateError && (
          <div className="flex items-start gap-1.5 mt-2 bg-red-950/30 border border-red-700/30 rounded-lg px-2.5 py-2">
            <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300 text-[11px]">{translateError}</p>
          </div>
        )}

        {translatedSummary && !isTranslating && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-violet-400 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                {selectedLang.name}
                {selectedLang.native && (
                  <span className="text-violet-600 font-normal normal-case tracking-normal">
                    {selectedLang.native}
                  </span>
                )}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-200 text-[11px] transition-colors"
              >
                {copied ? (
                  <><CheckCheck size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                ) : (
                  <><Copy size={11} />Copy</>
                )}
              </button>
            </div>
            <div className="bg-violet-950/20 border border-violet-800/20 rounded-lg p-2.5 max-h-40 overflow-y-auto">
              <p className="text-gray-200 text-xs leading-relaxed whitespace-pre-wrap">
                {translatedSummary}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
