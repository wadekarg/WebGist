import React, { useState, useRef, useEffect } from 'react'
import { Eye, EyeOff, Save, CheckCircle, ChevronDown, Check } from 'lucide-react'
import { PROVIDERS } from '../../utils/providers'
import { Settings, saveSettings } from '../../utils/storage'

interface DropdownProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function Dropdown({ value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#1f2937',
          border: open ? '1px solid #6366f1' : '1px solid #4b5563',
          borderRadius: '8px',
          padding: '8px 12px',
          color: 'white',
          fontSize: '13px',
          cursor: 'pointer',
          boxShadow: open ? '0 0 0 1px #6366f1' : 'none',
          outline: 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? value}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            marginLeft: '8px',
            color: '#9ca3af',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#1f2937',
            border: '1px solid #4b5563',
            borderRadius: '8px',
            zIndex: 50,
            maxHeight: '180px',
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: opt.value === value ? '#312e81' : 'transparent',
                border: 'none',
                color: opt.value === value ? 'white' : '#d1d5db',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = '#374151'
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {opt.label}
              </span>
              {opt.value === value && <Check size={13} style={{ flexShrink: 0, color: '#818cf8' }} />}
            </button>
          ))}
        </div>
      )}
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
    if (provider) {
      onSettingsChange({ ...settings, providerId: provider.id, model: provider.defaultModel })
    }
  }

  function handleModelChange(value: string) {
    onSettingsChange({ ...settings, model: value })
  }

  function handleApiKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    onSettingsChange({
      ...settings,
      apiKeys: { ...settings.apiKeys, [settings.providerId]: e.target.value },
    })
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
    mistral: 'https://console.mistral.ai/api-keys/',
    cohere: 'https://dashboard.cohere.com/api-keys',
    openrouter: 'https://openrouter.ai/settings/keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
    cerebras: 'https://cloud.cerebras.ai/platform',
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-white font-semibold text-sm mb-0.5">AI Provider Settings</h2>
        <p className="text-gray-400 text-xs">Configure your AI provider and API key</p>
      </div>

      {/* Provider */}
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-300 text-xs font-medium">Provider</label>
        <Dropdown
          value={settings.providerId}
          options={PROVIDERS.map((p) => ({ value: p.id, label: p.name }))}
          onChange={handleProviderChange}
        />
        <p className="text-indigo-400 text-[11px] bg-indigo-950/40 border border-indigo-800/30 rounded-md px-2 py-1.5">
          {selectedProvider.freeNote}
        </p>
      </div>

      {/* Model */}
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-300 text-xs font-medium">Model</label>
        <Dropdown
          value={settings.model}
          options={selectedProvider.models.map((m) => ({ value: m, label: m }))}
          onChange={handleModelChange}
        />
      </div>

      {/* API Key */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-gray-300 text-xs font-medium">API Key</label>
          <a
            href={apiKeyLinks[settings.providerId] ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 text-[11px] hover:text-indigo-300 underline"
          >
            Get free API key
          </a>
        </div>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={currentApiKey}
            onChange={handleApiKeyChange}
            placeholder={`Enter your ${selectedProvider.name} API key`}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-white text-sm
                       placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p className="text-gray-500 text-[11px]">
          Your API key is stored locally in Chrome storage and never sent anywhere except the AI provider's API.
        </p>
      </div>

      {saveError && <p className="text-red-400 text-xs px-1">{saveError}</p>}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || !currentApiKey.trim()}
        className={`
          flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium
          transition-all duration-150
          ${saved
            ? 'bg-emerald-600 text-white'
            : currentApiKey.trim()
            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white'
            : 'bg-gray-700/60 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {saved ? (
          <><CheckCircle size={15} />Saved!</>
        ) : saving ? (
          <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
        ) : (
          <><Save size={15} />Save Settings</>
        )}
      </button>
    </div>
  )
}
