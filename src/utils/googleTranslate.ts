// Google Translate's unofficial endpoint caps requests at ~5000 chars;
// 4000 gives a safe margin while keeping chunk count low for typical summaries.
const MAX_CHUNK = 4000

// Split on paragraph boundaries so sentences are never cut mid-way.
// Sequential (not parallel) to avoid hitting Google's rate limit on rapid-fire requests.
function splitText(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text]

  const chunks: string[] = []
  const paras = text.split(/\n+/)
  let cur = ''

  for (const p of paras) {
    const line = p + '\n'
    if ((cur + line).length > MAX_CHUNK && cur) {
      chunks.push(cur.trim())
      cur = ''
    }
    cur += line
  }
  if (cur.trim()) chunks.push(cur.trim())
  return chunks
}

async function translateChunk(text: string, targetCode: string): Promise<string> {
  const url =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=auto&tl=${encodeURIComponent(targetCode)}&dt=t&q=${encodeURIComponent(text)}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Google Translate error: ${res.status}`)

  const data = await res.json()
  // data[0] is an array of [translated_segment, original_segment, ...]
  return (data[0] as [string, string][]).map((item) => item[0]).join('')
}

export async function googleTranslate(
  text: string,
  targetCode: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(targetCode)) {
    throw new Error(`Invalid language code: ${targetCode}`)
  }
  const chunks = splitText(text)
  const results: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(Math.round((i / chunks.length) * 100))
    results.push(await translateChunk(chunks[i], targetCode))
  }

  onProgress?.(100)
  return results.join('\n\n')
}
