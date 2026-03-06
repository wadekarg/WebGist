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
    freeNote: 'Gemini 2.0 Flash — 15 RPM, 1M tokens/day',
    models: ['gemini-2.0-flash'],
    defaultModel: 'gemini-2.0-flash',
  },
  {
    id: 'groq',
    name: 'Groq',
    freeNote: 'Llama 3.3 70B — 30 RPM, very fast',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    defaultModel: 'llama-3.3-70b-versatile',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    freeNote: 'Mistral Small — 1 req/sec free tier',
    models: ['mistral-small-latest'],
    defaultModel: 'mistral-small-latest',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    freeNote: 'Command R — 20 RPM trial key',
    models: ['command-r'],
    defaultModel: 'command-r',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    freeNote: 'Multiple free models available',
    models: [
      'meta-llama/llama-3.3-70b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
    ],
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    freeNote: 'Claude Haiku — limited free tier',
    models: ['claude-haiku-4-5-20251001'],
    defaultModel: 'claude-haiku-4-5-20251001',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    freeNote: 'Llama 3.3 70B — free tier, ultra-fast inference',
    models: ['llama-3.3-70b', 'llama3.1-8b'],
    defaultModel: 'llama-3.3-70b',
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
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Gemini API error ${res.status}: ${err}`)
      }
      const data = await res.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }

    case 'groq': {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Groq API error ${res.status}: ${err}`)
      }
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    }

    case 'mistral': {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Mistral API error ${res.status}: ${err}`)
      }
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    }

    case 'cohere': {
      const res = await fetch('https://api.cohere.ai/v2/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Cohere API error ${res.status}: ${err}`)
      }
      const data = await res.json()
      return data.message?.content?.[0]?.text ?? data.text ?? ''
    }

    case 'openrouter': {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/webgist',
          'X-Title': 'WebGist',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`OpenRouter API error ${res.status}: ${err}`)
      }
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    }

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
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Anthropic API error ${res.status}: ${err}`)
      }
      const data = await res.json()
      return data.content?.[0]?.text ?? ''
    }

    case 'cerebras': {
      const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Cerebras API error ${res.status}: ${err}`)
      }
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    }

    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}
