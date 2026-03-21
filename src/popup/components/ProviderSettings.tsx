import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Eye, EyeOff, Save, CheckCircle, Trash2 } from 'lucide-react'
import { PROVIDERS } from '../../utils/providers'
import {
  Settings,
  saveSettings,
  getTokenUsage,
  clearSummaryCache,
  TokenUsageEntry,
} from '../../utils/storage'

interface DropdownProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  suffix?: React.ReactNode
}

function Dropdown({ label, value, options, onChange, suffix }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</label>
        {suffix}
      </div>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-white cursor-pointer"
          style={{
            background: 'var(--bg-input)',
            border: open ? '1px solid var(--border-focus)' : '1px solid var(--border-strong)',
            outline: 'none',
          }}
        >
          <span className="truncate text-left">{selected?.label ?? (value || 'Select...')}</span>
          <span style={{ color: 'var(--accent)', fontSize: '12px', flexShrink: 0, fontWeight: 'bold' }}>
            {open ? '▲' : '▼'}
          </span>
        </button>

        {open && (
          <div
            className="absolute left-0 right-0 rounded-lg overflow-hidden"
            style={{
              top: 'calc(100% + 4px)',
              background: 'var(--dd-bg)',
              border: '1px solid var(--dd-border)',
              zIndex: 100,
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '180px',
              overflowY: 'auto',
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left cursor-pointer"
                style={{
                  background: opt.value === value ? 'var(--dd-active-bg)' : 'transparent',
                  color: opt.value === value ? 'var(--dd-active-text)' : 'var(--text-secondary)',
                  border: 'none',
                  borderBottom: '1px solid var(--dd-sep)',
                }}
                onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'var(--dd-hover)' }}
                onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span className="truncate">{opt.label}</span>
                {opt.value === value && <span style={{ color: 'var(--accent)', fontSize: '11px', flexShrink: 0 }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Health status indicator ---

type HealthStatus = 'idle' | 'checking' | 'reachable' | 'unreachable'

function HealthDot({ status }: { status: HealthStatus }) {
  if (status === 'idle') return null
  if (status === 'checking') {
    return (
      <span
        className="inline-block w-2.5 h-2.5 border-2 border-gray-500 border-t-indigo-400 rounded-full animate-spin"
        title="Checking..."
      />
    )
  }
  if (status === 'reachable') {
    return <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: 'var(--ok-dot)' }} title="Reachable" />
  }
  return <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: 'var(--err-text)' }} title="Unreachable" />
}

// --- Toggle switch ---

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-gray-300 text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
        style={{ background: checked ? 'var(--accent)' : 'var(--border-strong)' }}
      >
        <span
          className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(3px)', background: 'var(--text-on-accent)' }}
        />
      </button>
    </label>
  )
}

interface ProviderSettingsProps {
  settings: Settings
  onSettingsChange: (s: Settings) => void
}

export default function ProviderSettings({ settings, onSettingsChange }: ProviderSettingsProps) {
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('idle')
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [ollamaRefreshing, setOllamaRefreshing] = useState(false)
  const [tokenUsage, setTokenUsage] = useState<TokenUsageEntry[]>([])
  const [cacheCleared, setCacheCleared] = useState(false)

  const selectedProvider = PROVIDERS.find((p) => p.id === settings.providerId) ?? PROVIDERS[0]
  const isOllama = settings.providerId === 'ollama'
  const currentApiKey = settings.apiKeys[settings.providerId] ?? ''

  // Load token usage on mount
  useEffect(() => {
    getTokenUsage().then(setTokenUsage)
  }, [])

  // Ping provider on provider change or after save
  const pingProvider = useCallback((providerId: string, apiKey: string) => {
    const provider = PROVIDERS.find(p => p.id === providerId)
    if (!provider) return
    // Only ping if we have an API key, or it's Ollama
    if (providerId !== 'ollama' && !apiKey.trim()) {
      setHealthStatus('idle')
      return
    }
    setHealthStatus('checking')
    chrome.runtime.sendMessage(
      { type: 'PING_PROVIDER', providerId, apiKey },
      (response) => {
        if (chrome.runtime.lastError) {
          setHealthStatus('unreachable')
          return
        }
        setHealthStatus(response?.ok ? 'reachable' : 'unreachable')
      }
    )
  }, [])

  // Ping on provider change
  useEffect(() => {
    const key = settings.apiKeys[settings.providerId] ?? ''
    pingProvider(settings.providerId, key)
    // Reset guide when switching providers
    setGuideOpen(false)
  }, [settings.providerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Ollama models when selecting Ollama
  useEffect(() => {
    if (isOllama) {
      refreshOllamaModels()
    }
  }, [isOllama]) // eslint-disable-line react-hooks/exhaustive-deps

  function refreshOllamaModels() {
    setOllamaRefreshing(true)
    chrome.runtime.sendMessage({ type: 'GET_OLLAMA_MODELS' }, (response) => {
      setOllamaRefreshing(false)
      if (chrome.runtime.lastError) {
        setOllamaModels([])
        return
      }
      const models: string[] = response?.models ?? []
      setOllamaModels(models)
      // Auto-select first model if none selected
      if (models.length > 0 && !settings.model) {
        onSettingsChange({ ...settings, model: models[0] })
      }
    })
  }

  function handleProviderChange(value: string) {
    const provider = PROVIDERS.find((p) => p.id === value)
    if (provider) onSettingsChange({ ...settings, providerId: provider.id, model: provider.defaultModel })
  }

  function handleModelChange(value: string) {
    onSettingsChange({ ...settings, model: value })
  }

  function handleApiKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    onSettingsChange({ ...settings, apiKeys: { ...settings.apiKeys, [settings.providerId]: e.target.value } })
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      await saveSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      // Ping after save
      const key = settings.apiKeys[settings.providerId] ?? ''
      pingProvider(settings.providerId, key)
      // Refresh token usage
      getTokenUsage().then(setTokenUsage)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleClearCache() {
    await clearSummaryCache()
    setCacheCleared(true)
    setTimeout(() => setCacheCleared(false), 2000)
  }

  function handleAutoSummarizeToggle(v: boolean) {
    onSettingsChange({ ...settings, autoSummarize: v })
  }

  function handleFallbackToggle(providerId: string, enabled: boolean) {
    const fallbacks = enabled
      ? [...settings.fallbackProviders, providerId]
      : settings.fallbackProviders.filter(id => id !== providerId)
    onSettingsChange({ ...settings, fallbackProviders: fallbacks })
  }

  // Model options: for Ollama, use dynamically fetched models; for others, use static list
  const modelOptions = isOllama
    ? ollamaModels.map(m => ({ value: m, label: m }))
    : selectedProvider.models.map(m => ({ value: m, label: m }))

  // Providers with API keys configured (excluding current primary) for fallback list
  const fallbackCandidates = PROVIDERS.filter(
    p => p.id !== settings.providerId && (settings.apiKeys[p.id]?.trim() || p.id === 'ollama')
  )

  // Today's token usage, filtered to > 0
  const today = new Date().toISOString().slice(0, 10)
  const todayUsage = tokenUsage
    .filter(e => e.date === today && e.tokens > 0)
    .map(e => ({
      ...e,
      providerName: PROVIDERS.find(p => p.id === e.providerId)?.name ?? e.providerId,
    }))

  // Setup guide link text and URL
  const setupLinkText = isOllama ? 'Download Ollama →' : 'Get free key →'
  const setupLinkUrl = isOllama
    ? selectedProvider.setupGuide.signupUrl
    : selectedProvider.setupGuide.keyUrl

  // Whether save button should be enabled
  const canSave = isOllama ? !!settings.model : !!currentApiKey.trim()

  return (
    <div className="flex flex-col gap-5 p-4">

      {/* Header */}
      <div className="border-b border-gray-800 pb-3">
        <h2 className="text-white font-semibold text-sm">AI Provider Settings</h2>
        <p className="text-gray-500 text-xs mt-0.5">Choose a provider and enter your API key</p>
      </div>

      {/* Provider dropdown with health indicator */}
      <Dropdown
        label="Provider"
        value={settings.providerId}
        options={PROVIDERS.map(p => ({ value: p.id, label: p.name }))}
        onChange={handleProviderChange}
        suffix={<HealthDot status={healthStatus} />}
      />

      {/* Free note */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg wg-info-box">
        <span style={{ color: 'var(--info-text)', fontSize: '11px' }}>ℹ</span>
        <p className="text-blue-300 text-[11px] leading-relaxed">{selectedProvider.freeNote}</p>
      </div>

      {/* Model dropdown (with Ollama refresh button) */}
      <Dropdown
        label="Model"
        value={settings.model}
        options={modelOptions}
        onChange={handleModelChange}
        suffix={
          isOllama ? (
            <button
              type="button"
              onClick={refreshOllamaModels}
              disabled={ollamaRefreshing}
              className="text-indigo-400 text-[11px] hover:text-indigo-300 flex items-center gap-1"
            >
              {ollamaRefreshing ? (
                <>
                  <span className="inline-block w-2.5 h-2.5 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Detecting...
                </>
              ) : (
                'Refresh Models'
              )}
            </button>
          ) : undefined
        }
      />

      {/* Ollama: show status when no models found */}
      {isOllama && ollamaModels.length === 0 && !ollamaRefreshing && (
        <p className="text-yellow-500 text-[11px] -mt-3">
          No models detected. Is Ollama running? Pull a model and click "Refresh Models".
        </p>
      )}

      {/* API Key (hidden for Ollama) */}
      {!isOllama && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">API Key</label>
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={currentApiKey}
              onChange={handleApiKeyChange}
              placeholder={`Paste ${selectedProvider.name} API key…`}
              className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm wg-input"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-gray-600 text-[11px]">
            Stored locally — never leaves your browser except to the AI provider.
          </p>
        </div>
      )}

      {/* Setup guide (collapsible) */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setGuideOpen(o => !o)}
          className="flex items-center gap-1.5 text-gray-400 text-xs hover:text-gray-300 transition-colors"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <span style={{ color: 'var(--accent)', fontSize: '10px', fontWeight: 'bold' }}>
            {guideOpen ? '▲' : '▼'}
          </span>
          How to set up {selectedProvider.name}
        </button>

        {guideOpen && (
          <div
            className="rounded-lg px-3 py-2.5 flex flex-col gap-2 wg-info-box"
          >
            <ol className="flex flex-col gap-1.5 pl-0 m-0" style={{ listStyle: 'none', counterReset: 'step' }}>
              {selectedProvider.setupGuide.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-gray-400">
                  <span
                    className="flex-shrink-0 font-semibold"
                    style={{ color: 'var(--text-accent)', minWidth: '14px' }}
                  >
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            {setupLinkUrl && (
              <a
                href={setupLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 text-[11px] hover:text-indigo-300 font-medium mt-0.5"
              >
                {setupLinkText}
              </a>
            )}
          </div>
        )}
      </div>

      {saveError && <p className="text-red-400 text-xs">{saveError}</p>}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || !canSave}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all"
        style={{
          background: saved
            ? 'var(--ok-dot)'
            : canSave
            ? `linear-gradient(to right, var(--grad-from), var(--grad-to))`
            : 'var(--bg-tertiary)',
          color: canSave || saved ? 'var(--text-on-accent)' : 'var(--text-muted)',
          cursor: canSave ? 'pointer' : 'not-allowed',
        }}
      >
        {saved ? (
          <><CheckCircle size={15} /> Saved!</>
        ) : saving ? (
          <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
        ) : (
          <><Save size={15} /> Save Settings</>
        )}
      </button>

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* Auto-summarize toggle */}
      <Toggle
        checked={settings.autoSummarize}
        onChange={handleAutoSummarizeToggle}
        label="Auto-summarize when panel opens"
      />

      {/* Fallback providers */}
      {fallbackCandidates.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">Fallback order</label>
          <p className="text-gray-600 text-[11px] -mt-1">
            If the primary provider fails, try these in order.
          </p>
          <div className="flex flex-col gap-1">
            {fallbackCandidates.map(p => {
              const checked = settings.fallbackProviders.includes(p.id)
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-800/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleFallbackToggle(p.id, e.target.checked)}
                    className="accent-indigo-500 w-3.5 h-3.5"
                  />
                  <span className="text-gray-300 text-xs">{p.name}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Token usage today */}
      {todayUsage.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">Usage today</label>
          {todayUsage.map(u => (
            <p key={u.providerId} className="text-gray-500 text-[11px]">
              {u.providerName}: {u.tokens.toLocaleString()} tokens today
            </p>
          ))}
        </div>
      )}

      {/* Clear cache */}
      <button
        type="button"
        onClick={handleClearCache}
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs transition-colors"
        style={{
          background: cacheCleared ? 'var(--ok-bg)' : 'transparent',
          border: '1px solid var(--border-strong)',
          color: cacheCleared ? 'var(--ok-text)' : 'var(--text-muted)',
          cursor: 'pointer',
        }}
      >
        {cacheCleared ? (
          <>
            <CheckCircle size={12} /> Cache cleared
          </>
        ) : (
          <>
            <Trash2 size={12} /> Clear summary cache
          </>
        )}
      </button>

    </div>
  )
}
