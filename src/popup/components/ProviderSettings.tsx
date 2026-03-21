import React, { useState, useRef, useEffect } from 'react'
import { Eye, EyeOff, Save, CheckCircle } from 'lucide-react'
import { PROVIDERS } from '../../utils/providers'
import { Settings, saveSettings } from '../../utils/storage'

interface DropdownProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function Dropdown({ label, value, options, onChange }: DropdownProps) {
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
      <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</label>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-white cursor-pointer"
          style={{
            background: '#111827',
            border: open ? '1px solid #6366f1' : '1px solid #374151',
            outline: 'none',
          }}
        >
          <span className="truncate text-left">{selected?.label ?? value}</span>
          <span style={{ color: '#6366f1', fontSize: '12px', flexShrink: 0, fontWeight: 'bold' }}>
            {open ? '▲' : '▼'}
          </span>
        </button>

        {open && (
          <div
            className="absolute left-0 right-0 rounded-lg overflow-hidden"
            style={{
              top: 'calc(100% + 4px)',
              background: '#111827',
              border: '1px solid #374151',
              zIndex: 100,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
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
                  background: opt.value === value ? '#1e1b4b' : 'transparent',
                  color: opt.value === value ? '#a5b4fc' : '#d1d5db',
                  border: 'none',
                  borderBottom: '1px solid #1f2937',
                }}
                onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = '#1f2937' }}
                onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span className="truncate">{opt.label}</span>
                {opt.value === value && <span style={{ color: '#6366f1', fontSize: '11px', flexShrink: 0 }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
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

  const selectedProvider = PROVIDERS.find((p) => p.id === settings.providerId) ?? PROVIDERS[0]
  const currentApiKey = settings.apiKeys[settings.providerId] ?? ''

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
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const apiKeyLinks: Record<string, string> = {
    gemini: 'https://aistudio.google.com/app/apikey',
    groq: 'https://console.groq.com/keys',
    deepseek: 'https://platform.deepseek.com/api_keys',
    cerebras: 'https://cloud.cerebras.ai/platform',
    sambanova: 'https://cloud.sambanova.ai/apis',
    together: 'https://api.together.xyz/settings/api-keys',
    nvidia: 'https://build.nvidia.com/settings/api-keys',
    moonshot: 'https://platform.moonshot.ai/console/api-keys',
    mistral: 'https://console.mistral.ai/api-keys/',
    cohere: 'https://dashboard.cohere.com/api-keys',
    openrouter: 'https://openrouter.ai/settings/keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
  }

  return (
    <div className="flex flex-col gap-5 p-4">

      {/* Header */}
      <div className="border-b border-gray-800 pb-3">
        <h2 className="text-white font-semibold text-sm">AI Provider Settings</h2>
        <p className="text-gray-500 text-xs mt-0.5">Choose a provider and enter your API key</p>
      </div>

      {/* Provider dropdown */}
      <Dropdown
        label="Provider"
        value={settings.providerId}
        options={PROVIDERS.map(p => ({ value: p.id, label: p.name }))}
        onChange={handleProviderChange}
      />

      {/* Free note */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: '#0f172a', border: '1px solid #1e3a5f' }}>
        <span style={{ color: '#60a5fa', fontSize: '11px' }}>ℹ</span>
        <p className="text-blue-300 text-[11px] leading-relaxed">{selectedProvider.freeNote}</p>
      </div>

      {/* Model dropdown */}
      <Dropdown
        label="Model"
        value={settings.model}
        options={selectedProvider.models.map(m => ({ value: m, label: m }))}
        onChange={handleModelChange}
      />

      {/* API Key */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">API Key</label>
          <a
            href={apiKeyLinks[settings.providerId] ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 text-[11px] hover:text-indigo-300"
          >
            Get free key →
          </a>
        </div>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={currentApiKey}
            onChange={handleApiKeyChange}
            placeholder={`Paste ${selectedProvider.name} API key…`}
            className="w-full rounded-lg px-3 py-2.5 pr-10 text-white text-sm placeholder-gray-600
                       focus:outline-none"
            style={{
              background: '#111827',
              border: '1px solid #374151',
            }}
            onFocus={e => (e.currentTarget.style.border = '1px solid #6366f1')}
            onBlur={e => (e.currentTarget.style.border = '1px solid #374151')}
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

      {saveError && <p className="text-red-400 text-xs">{saveError}</p>}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || !currentApiKey.trim()}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all"
        style={{
          background: saved
            ? '#059669'
            : currentApiKey.trim()
            ? 'linear-gradient(to right, #7c3aed, #4f46e5)'
            : '#1f2937',
          color: currentApiKey.trim() || saved ? 'white' : '#6b7280',
          cursor: currentApiKey.trim() ? 'pointer' : 'not-allowed',
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

    </div>
  )
}
