import React, { useState } from 'react'
import { Eye, EyeOff, Save, CheckCircle } from 'lucide-react'
import { PROVIDERS } from '../../utils/providers'
import { Settings, saveSettings } from '../../utils/storage'

interface ProviderSettingsProps {
  settings: Settings
  onSettingsChange: (s: Settings) => void
}

export default function ProviderSettings({ settings, onSettingsChange }: ProviderSettingsProps) {
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedProvider = PROVIDERS.find((p) => p.id === settings.providerId) ?? PROVIDERS[0]

  const currentApiKey = settings.apiKeys[settings.providerId] ?? ''

  function handleProviderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const provider = PROVIDERS.find((p) => p.id === e.target.value)
    if (provider) {
      onSettingsChange({
        ...settings,
        providerId: provider.id,
        model: provider.defaultModel,
      })
    }
  }

  function handleModelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onSettingsChange({ ...settings, model: e.target.value })
  }

  function handleApiKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    onSettingsChange({
      ...settings,
      apiKeys: { ...settings.apiKeys, [settings.providerId]: e.target.value },
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save settings:', err)
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

      {/* Provider Select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-300 text-xs font-medium">Provider</label>
        <select
          value={settings.providerId}
          onChange={handleProviderChange}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                     focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                     appearance-none cursor-pointer"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {/* Free tier note */}
        <p className="text-indigo-400 text-[11px] bg-indigo-950/40 border border-indigo-800/30 rounded-md px-2 py-1.5">
          {selectedProvider.freeNote}
        </p>
      </div>

      {/* Model Select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-300 text-xs font-medium">Model</label>
        <select
          value={settings.model}
          onChange={handleModelChange}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                     focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                     appearance-none cursor-pointer"
        >
          {selectedProvider.models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
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
          <>
            <CheckCircle size={15} />
            Saved!
          </>
        ) : saving ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save size={15} />
            Save Settings
          </>
        )}
      </button>
    </div>
  )
}