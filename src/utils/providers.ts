export interface Provider {
  id: string
  name: string
  freeNote: string
  models: string[]
  defaultModel: string
}

export const PROVIDERS: Provider[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    freeNote: 'Gemini 2.0 Flash — 15 RPM, 1M tokens/day free',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    defaultModel: 'gemini-2.0-flash',
  },
  {
    id: 'groq',
    name: 'Groq',
    freeNote: 'Llama 3.3 70B — 30 RPM free tier, very fast',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'],
    defaultModel: 'llama-3.3-70b-versatile',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    freeNote: 'DeepSeek-V3 — 5M free tokens on signup, no rate limits',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    freeNote: 'Llama 3.3 70B — free tier, ultra-fast inference',
    models: ['llama-3.3-70b', 'llama3.1-8b'],
    defaultModel: 'llama-3.3-70b',
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    freeNote: 'Llama 3.3 70B — persistent free tier, 20 RPM',
    models: ['Meta-Llama-3.3-70B-Instruct', 'Meta-Llama-3.1-405B-Instruct', 'DeepSeek-R1', 'Qwen2.5-72B-Instruct'],
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
  },
  {
    id: 'together',
    name: 'Together AI',
    freeNote: 'Llama 3.3 70B & DeepSeek R1 — permanently free models',
    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free'],
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    freeNote: 'Up to 5,000 free credits — 100+ models available',
    models: ['meta/llama-3.3-70b-instruct', 'deepseek-ai/deepseek-r1', 'nvidia/llama-3.1-nemotron-70b-instruct'],
    defaultModel: 'meta/llama-3.3-70b-instruct',
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    freeNote: 'Kimi AI — free credits on signup, 128k context',
    models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
    defaultModel: 'moonshot-v1-128k',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    freeNote: 'Mistral Small — 1 req/sec free tier',
    models: ['mistral-small-latest', 'open-mistral-7b'],
    defaultModel: 'mistral-small-latest',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    freeNote: 'Command R — 20 RPM trial key',
    models: ['command-r', 'command-r-plus'],
    defaultModel: 'command-r',
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
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    freeNote: 'Claude Haiku — limited free tier via API',
    models: ['claude-haiku-4-5-20251001'],
    defaultModel: 'claude-haiku-4-5-20251001',
  },
]

export function getProviderById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

interface ApiRequestPayload {
  provider: string
  model: string
  apiKey: string
  prompt: string
}

// Helper for OpenAI-compatible providers (Bearer auth, /v1/chat/completions)
async function openAiCompat(
  baseUrl: string,
  payload: ApiRequestPayload,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${payload.apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model: payload.model,
      messages: [{ role: 'user', content: payload.prompt }],
      max_tokens: 1024,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${payload.provider} API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export async function callProviderApi(payload: ApiRequestPayload): Promise<string> {
  const { provider, model, apiKey, prompt } = payload

  switch (provider) {
    case 'gemini': {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      })
      if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`)
      const data = await res.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
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
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }),
      })
      if (!res.ok) throw new Error(`Cohere API error ${res.status}: ${await res.text()}`)
      const data = await res.json()
      return data.message?.content?.[0]?.text ?? data.text ?? ''
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
        body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
      })
      if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`)
      const data = await res.json()
      return data.content?.[0]?.text ?? ''
    }

    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}
