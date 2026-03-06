const STOPWORDS = new Set([
  'a','an','the','and','or','but','if','in','on','at','to','for','of','with','by',
  'from','as','is','are','was','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','must','can','not','no',
  'this','that','these','those','it','its','i','you','he','she','we','they','their',
  'them','his','her','our','your','my','so','yet','nor','than','then','into','also',
  'just','more','some','any','all','when','where','who','which','what','how','about',
  'after','before','between','both','each','few','many','other','over','such','up',
])

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? []).filter(w => !STOPWORDS.has(w))
}

// Cosine-like similarity: shared words / (log(|A|+1) + log(|B|+1))
function similarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setB = new Set(b)
  const shared = a.filter(w => setB.has(w)).length
  return shared / (Math.log(a.length + 1) + Math.log(b.length + 1))
}

// Iterative PageRank on the sentence similarity graph
function textRank(words: string[][], iterations = 30, damping = 0.85): number[] {
  const n = words.length
  if (n === 0) return []

  // Build normalised adjacency matrix (column-stochastic)
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) matrix[i][j] = similarity(words[i], words[j])
    }
  }
  // Normalise each column so scores sum to 1
  for (let j = 0; j < n; j++) {
    const colSum = matrix.reduce((s, row) => s + row[j], 0)
    if (colSum > 0) matrix.forEach(row => { row[j] /= colSum })
  }

  // Power iteration
  let scores = Array(n).fill(1 / n)
  for (let iter = 0; iter < iterations; iter++) {
    const next = Array(n).fill((1 - damping) / n)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        next[i] += damping * matrix[i][j] * scores[j]
      }
    }
    scores = next
  }
  return scores
}

export function extractiveSummary(text: string, numPoints = 8, mode = 'keypoints'): string {
  if (mode === 'brief') numPoints = 3

  // Split into sentences, filter trivially short/long ones
  const sentences = (text.replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+/g) ?? [])
    .map(s => s.trim())
    .filter(s => {
      const wc = s.split(/\s+/).filter(Boolean).length
      return wc >= 6 && wc <= 80
    })

  if (sentences.length === 0) return text.slice(0, 2000)
  if (sentences.length <= numPoints) {
    if (mode === 'brief') return sentences.join(' ')
    return sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')
  }

  const words = sentences.map(tokenize)
  const scores = textRank(words)

  // Slight boost for sentences in the first 20% (lead bias)
  const boosted = scores.map((sc, i) =>
    i < sentences.length * 0.2 ? sc * 1.3 : sc
  )

  const top = boosted
    .map((sc, i) => ({ sc, i }))
    .sort((a, b) => b.sc - a.sc)
    .slice(0, numPoints)
    .sort((a, b) => a.i - b.i)   // restore original reading order

  if (mode === 'brief') return top.map(t => sentences[t.i]).join(' ')
  return top.map((t, n) => `${n + 1}. ${sentences[t.i]}`).join('\n')
}
