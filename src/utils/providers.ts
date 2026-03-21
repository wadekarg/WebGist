export interface ProviderSetupGuide {
  steps: string[]
  signupUrl: string
  keyUrl: string
}

export interface Provider {
  id: string
  name: string
  freeNote: string
  models: string[]
  defaultModel: string
  maxInputChars: number
  supportsStreaming: boolean
  setupGuide: ProviderSetupGuide
}

export const PROVIDERS: Provider[] = [
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    freeNote: 'Run AI locally — free, private, no API key needed',
    models: [],  // populated dynamically from localhost
    defaultModel: '',
    maxInputChars: 30000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Download Ollama from ollama.com/download',
        'Install and launch it (runs in background)',
        'Open a terminal and run: ollama pull gemma3:4b',
        'Come back here and click "Refresh models"',
      ],
      signupUrl: 'https://ollama.com/download',
      keyUrl: '',
    },
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    freeNote: 'Gemini 2.0 Flash — 15 RPM, 1M tokens/day free',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    defaultModel: 'gemini-2.0-flash',
    maxInputChars: 60000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Go to Google AI Studio',
        'Sign in with your Google account',
        'Click "Get API Key" → "Create API key"',
        'Copy the key and paste it above',
      ],
      signupUrl: 'https://aistudio.google.com',
      keyUrl: 'https://aistudio.google.com/apikey',
    },
  },
  {
    id: 'groq',
    name: 'Groq',
    freeNote: 'Llama 3.3 70B — 30 RPM free tier, very fast',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'],
    defaultModel: 'llama-3.3-70b-versatile',
    maxInputChars: 25000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Go to console.groq.com',
        'Sign up with Google, GitHub, or email',
        'Go to "API Keys" in the left sidebar',
        'Click "Create API Key" and copy it',
      ],
      signupUrl: 'https://console.groq.com',
      keyUrl: 'https://console.groq.com/keys',
    },
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    freeNote: 'DeepSeek-V3 — 5M free tokens on signup',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    maxInputChars: 30000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Go to platform.deepseek.com',
        'Sign up and verify your email',
        'Go to "API Keys" in the dashboard',
        'Create a new key and copy it',
      ],
      signupUrl: 'https://platform.deepseek.com',
      keyUrl: 'https://platform.deepseek.com/api_keys',
    },
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    freeNote: 'Llama 3.3 70B — free tier, ultra-fast inference',
    models: ['llama-3.3-70b', 'llama3.1-8b'],
    defaultModel: 'llama-3.3-70b',
    maxInputChars: 25000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Go to cloud.cerebras.ai',
        'Sign up for a free account',
        'Navigate to "API Keys"',
        'Generate a key and copy it',
      ],
      signupUrl: 'https://cloud.cerebras.ai',
      keyUrl: 'https://cloud.cerebras.ai/platform',
    },
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    freeNote: 'Llama 3.3 70B — persistent free tier, 20 RPM',
    models: ['Meta-Llama-3.3-70B-Instruct', 'Meta-Llama-3.1-405B-Instruct', 'DeepSeek-R1', 'Qwen2.5-72B-Instruct'],
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    maxInputChars: 25000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Go to cloud.sambanova.ai',
        'Sign up for a free account',
        'Go to "API" section in the dashboard',
        'Copy your API key',
      ],
      signupUrl: 'https://cloud.sambanova.ai',
      keyUrl: 'https://cloud.sambanova.ai',
    },
  },
  {
    id: 'together',
    name: 'Together AI',
    freeNote: 'Llama 3.3 70B & DeepSeek R1 — permanently free models',
    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free'],
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    maxInputChars: 25000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Go to api.together.xyz',
        'Sign up with Google or GitHub',
        'Go to "Settings" → "API Keys"',
        'Copy your API key',
      ],
      signupUrl: 'https://api.together.xyz',
      keyUrl: 'https://api.together.xyz/settings/api-keys',
    },
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    freeNote: 'Up to 5,000 free credits — 100+ models',
    models: ['meta/llama-3.3-70b-instruct', 'deepseek-ai/deepseek-r1', 'nvidia/llama-3.1-nemotron-70b-instruct'],
    defaultModel: 'meta/llama-3.3-70b-instruct',
    maxInputChars: 25000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Go to build.nvidia.com',
        'Sign in with your NVIDIA account (or create one)',
        'Click any model → "Get API Key"',
        'Copy the key and paste it above',
      ],
      signupUrl: 'https://build.nvidia.com',
      keyUrl: 'https://build.nvidia.com/explore/discover',
    },
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    freeNote: 'Kimi AI — free credits on signup, 128k context',
    models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
    defaultModel: 'moonshot-v1-128k',
    maxInputChars: 60000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Go to platform.moonshot.cn',
        'Sign up and verify your account',
        'Go to "API Keys" in the console',
        'Create and copy your API key',
      ],
      signupUrl: 'https://platform.moonshot.cn',
      keyUrl: 'https://platform.moonshot.cn/console/api-keys',
    },
  },
  {
    id: 'mistral',
    name: 'Mistral',
    freeNote: 'Mistral Small — 1 req/sec free tier',
    models: ['mistral-small-latest', 'open-mistral-7b'],
    defaultModel: 'mistral-small-latest',
    maxInputChars: 25000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Go to console.mistral.ai',
        'Sign up for a free account',
        'Go to "API Keys" in the sidebar',
        'Create a new key and copy it',
      ],
      signupUrl: 'https://console.mistral.ai',
      keyUrl: 'https://console.mistral.ai/api-keys',
    },
  },
  {
    id: 'cohere',
    name: 'Cohere',
    freeNote: 'Command R — 20 RPM trial key',
    models: ['command-r', 'command-r-plus'],
    defaultModel: 'command-r',
    maxInputChars: 25000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Go to dashboard.cohere.com',
        'Sign up with Google or email',
        'Go to "API Keys" in the sidebar',
        'Copy your trial API key',
      ],
      signupUrl: 'https://dashboard.cohere.com',
      keyUrl: 'https://dashboard.cohere.com/api-keys',
    },
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    freeNote: 'Multiple free models — Llama, DeepSeek, Gemma & more',
    models: [
      'meta-llama/llama-3.3-70b-instruct:free',
      'deepseek/deepseek-r1:free',
      'deepseek/deepseek-chat-v3-0324:free',
      'google/gemini-2.0-flash-exp:free',
      'mistralai/mistral-7b-instruct:free',
    ],
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    maxInputChars: 25000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Go to openrouter.ai',
        'Sign up with Google or email',
        'Go to "Keys" in the menu',
        'Create a key — free models cost nothing',
      ],
      signupUrl: 'https://openrouter.ai',
      keyUrl: 'https://openrouter.ai/keys',
    },
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    freeNote: 'Claude Haiku — limited free tier via API',
    models: ['claude-haiku-4-5-20251001'],
    defaultModel: 'claude-haiku-4-5-20251001',
    maxInputChars: 60000,
    supportsStreaming: true,
    setupGuide: {
      steps: [
        'Go to console.anthropic.com',
        'Sign up and add billing (free credits included)',
        'Go to "API Keys" in Settings',
        'Create and copy your key',
      ],
      signupUrl: 'https://console.anthropic.com',
      keyUrl: 'https://console.anthropic.com/settings/keys',
    },
  },
]

export function getProviderById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

// ---- API request types ----

export interface ApiRequestPayload {
  provider: string
  model: string
  apiKey: string
  systemPrompt: string
  userContent: string
}

export interface ApiResponse {
  text: string
  tokensUsed?: number
}

// ---- Non-streaming API calls ----

async function openAiCompat(
  baseUrl: string,
  payload: ApiRequestPayload,
  extraHeaders: Record<string, string> = {}
): Promise<ApiResponse> {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${payload.apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model: payload.model,
      messages: [
        { role: 'system', content: payload.systemPrompt },
        { role: 'user', content: payload.userContent },
      ],
      max_tokens: 1024,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${payload.provider} API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    tokensUsed: data.usage?.total_tokens,
  }
}

export async function callProviderApi(payload: ApiRequestPayload): Promise<ApiResponse> {
  const { provider, model, apiKey, systemPrompt, userContent } = payload

  switch (provider) {
    case 'ollama': {
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          stream: false,
        }),
      })
      if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`)
      const data = await res.json()
      return {
        text: data.message?.content ?? '',
        tokensUsed: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      }
    }

    case 'gemini': {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userContent }] }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      })
      if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`)
      const data = await res.json()
      return {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
        tokensUsed: data.usageMetadata?.totalTokenCount,
      }
    }

    case 'groq':
      return openAiCompat('https://api.groq.com/openai/v1/chat/completions', payload)
    case 'deepseek':
      return openAiCompat('https://api.deepseek.com/v1/chat/completions', payload)
    case 'cerebras':
      return openAiCompat('https://api.cerebras.ai/v1/chat/completions', payload)
    case 'sambanova':
      return openAiCompat('https://api.sambanova.ai/v1/chat/completions', payload)
    case 'together':
      return openAiCompat('https://api.together.xyz/v1/chat/completions', payload)
    case 'nvidia':
      return openAiCompat('https://integrate.api.nvidia.com/v1/chat/completions', payload)
    case 'moonshot':
      return openAiCompat('https://api.moonshot.ai/v1/chat/completions', payload)
    case 'mistral':
      return openAiCompat('https://api.mistral.ai/v1/chat/completions', payload)

    case 'cohere': {
      const res = await fetch('https://api.cohere.ai/v2/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          max_tokens: 1024,
        }),
      })
      if (!res.ok) throw new Error(`Cohere API error ${res.status}: ${await res.text()}`)
      const data = await res.json()
      return {
        text: data.message?.content?.[0]?.text ?? data.text ?? '',
        tokensUsed: data.meta?.tokens?.input_tokens
          ? (data.meta.tokens.input_tokens + data.meta.tokens.output_tokens)
          : undefined,
      }
    }

    case 'openrouter':
      return openAiCompat('https://openrouter.ai/api/v1/chat/completions', payload, {
        'HTTP-Referer': 'https://github.com/webgist',
        'X-Title': 'WebGist',
      })

    case 'anthropic': {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          system: systemPrompt,
          max_tokens: 1024,
          messages: [{ role: 'user', content: userContent }],
        }),
      })
      if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`)
      const data = await res.json()
      return {
        text: data.content?.[0]?.text ?? '',
        tokensUsed: data.usage
          ? (data.usage.input_tokens + data.usage.output_tokens)
          : undefined,
      }
    }

    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

// ---- Streaming API calls ----

function getStreamUrl(provider: string, model: string): { url: string; bodyExtra: Record<string, unknown> } {
  switch (provider) {
    case 'ollama': return { url: 'http://localhost:11434/api/chat', bodyExtra: { stream: true } }
    case 'gemini': return { url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, bodyExtra: {} }
    case 'groq': return { url: 'https://api.groq.com/openai/v1/chat/completions', bodyExtra: { stream: true } }
    case 'deepseek': return { url: 'https://api.deepseek.com/v1/chat/completions', bodyExtra: { stream: true } }
    case 'cerebras': return { url: 'https://api.cerebras.ai/v1/chat/completions', bodyExtra: { stream: true } }
    case 'sambanova': return { url: 'https://api.sambanova.ai/v1/chat/completions', bodyExtra: { stream: true } }
    case 'together': return { url: 'https://api.together.xyz/v1/chat/completions', bodyExtra: { stream: true } }
    case 'nvidia': return { url: 'https://integrate.api.nvidia.com/v1/chat/completions', bodyExtra: { stream: true } }
    case 'moonshot': return { url: 'https://api.moonshot.ai/v1/chat/completions', bodyExtra: { stream: true } }
    case 'mistral': return { url: 'https://api.mistral.ai/v1/chat/completions', bodyExtra: { stream: true } }
    case 'cohere': return { url: 'https://api.cohere.ai/v2/chat', bodyExtra: { stream: true } }
    case 'openrouter': return { url: 'https://openrouter.ai/api/v1/chat/completions', bodyExtra: { stream: true } }
    case 'anthropic': return { url: 'https://api.anthropic.com/v1/messages', bodyExtra: { stream: true } }
    default: throw new Error(`Unknown provider: ${provider}`)
  }
}

function buildStreamHeaders(payload: ApiRequestPayload): Record<string, string> {
  const { provider, apiKey } = payload
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  switch (provider) {
    case 'ollama': break  // no auth
    case 'gemini': headers['x-goog-api-key'] = apiKey; break
    case 'anthropic':
      headers['x-api-key'] = apiKey
      headers['anthropic-version'] = '2023-06-01'
      break
    case 'openrouter':
      headers['Authorization'] = `Bearer ${apiKey}`
      headers['HTTP-Referer'] = 'https://github.com/webgist'
      headers['X-Title'] = 'WebGist'
      break
    default:
      headers['Authorization'] = `Bearer ${apiKey}`
  }
  return headers
}

function buildStreamBody(payload: ApiRequestPayload, bodyExtra: Record<string, unknown>): string {
  const { provider, model, systemPrompt, userContent } = payload
  if (provider === 'ollama') {
    return JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      ...bodyExtra,
    })
  }
  if (provider === 'gemini') {
    return JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userContent }] }],
      generationConfig: { maxOutputTokens: 1024 },
    })
  }
  if (provider === 'anthropic') {
    return JSON.stringify({
      model,
      system: systemPrompt,
      max_tokens: 1024,
      messages: [{ role: 'user', content: userContent }],
      ...bodyExtra,
    })
  }
  // OpenAI-compatible (groq, deepseek, cerebras, etc.)
  return JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: 1024,
    ...bodyExtra,
  })
}

// Parse a single SSE chunk and extract the text delta
function parseStreamChunk(provider: string, line: string): string {
  if (!line.startsWith('data: ')) return ''
  const data = line.slice(6).trim()
  if (data === '[DONE]') return ''
  try {
    const json = JSON.parse(data)
    switch (provider) {
      case 'gemini':
        return json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      case 'anthropic':
        if (json.type === 'content_block_delta') return json.delta?.text ?? ''
        return ''
      case 'cohere':
        if (json.type === 'content-delta') return json.delta?.message?.content?.text ?? ''
        return ''
      default: // OpenAI-compatible
        return json.choices?.[0]?.delta?.content ?? ''
    }
  } catch { return '' }
}

// Parse Ollama NDJSON streaming (not SSE)
function parseOllamaChunk(line: string): string {
  try {
    const json = JSON.parse(line)
    return json.message?.content ?? ''
  } catch { return '' }
}

export async function* callProviderApiStream(
  payload: ApiRequestPayload
): AsyncGenerator<string, void, unknown> {
  const { provider } = payload
  const { url, bodyExtra } = getStreamUrl(provider, payload.model)
  const headers = buildStreamHeaders(payload)
  const body = buildStreamBody(payload, bodyExtra)

  const res = await fetch(url, { method: 'POST', headers, body })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${provider} API error ${res.status}: ${err}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const chunk = provider === 'ollama'
        ? parseOllamaChunk(trimmed)
        : parseStreamChunk(provider, trimmed)
      if (chunk) yield chunk
    }
  }
  // Flush remaining buffer
  if (buffer.trim()) {
    const chunk = provider === 'ollama'
      ? parseOllamaChunk(buffer.trim())
      : parseStreamChunk(provider, buffer.trim())
    if (chunk) yield chunk
  }
}

// ---- Health check ----

export async function pingProvider(providerId: string, apiKey: string): Promise<boolean> {
  try {
    switch (providerId) {
      case 'ollama': {
        const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) })
        return res.ok
      }
      case 'gemini': {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          { signal: AbortSignal.timeout(5000) }
        )
        return res.ok
      }
      case 'anthropic': {
        // Anthropic doesn't have a simple models endpoint; just validate key format
        return apiKey.startsWith('sk-ant-')
      }
      default: {
        // OpenAI-compatible: try /v1/models
        const urls: Record<string, string> = {
          groq: 'https://api.groq.com/openai/v1/models',
          deepseek: 'https://api.deepseek.com/v1/models',
          cerebras: 'https://api.cerebras.ai/v1/models',
          sambanova: 'https://api.sambanova.ai/v1/models',
          together: 'https://api.together.xyz/v1/models',
          nvidia: 'https://integrate.api.nvidia.com/v1/models',
          moonshot: 'https://api.moonshot.ai/v1/models',
          mistral: 'https://api.mistral.ai/v1/models',
          cohere: 'https://api.cohere.ai/v1/models',
          openrouter: 'https://openrouter.ai/api/v1/models',
        }
        const url = urls[providerId]
        if (!url) return false
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(5000),
        })
        return res.ok
      }
    }
  } catch {
    return false
  }
}

// ---- Ollama model discovery ----

export async function fetchOllamaModels(): Promise<string[]> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.models ?? []).map((m: { name: string }) => m.name)
  } catch {
    return []
  }
}
