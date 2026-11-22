import crypto from "crypto"

export function normalizeQuoteContent(content: string): string {
  return content.trim().replace(/\s+/g, " ").toLowerCase()
}

export function hashQuoteContent(content: string): string {
  return crypto
    .createHash("sha256")
    .update(normalizeQuoteContent(content))
    .digest("hex")
}

export function cleanTextForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'") // curly single quotes
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"') // curly double quotes
    .replace(/[\u2013\u2014]/g, "-") // em/en dashes
    .replace(/[^a-z0-9\s]/gi, " ") // replace punctuation with space
    .replace(/\s+/g, " ")
    .trim()
}

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
  "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
  "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
  "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
  "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
  "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
  "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
  "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
  "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
  "they're", "they've", "this", "those", "through", "to", "too", "under",
  "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're",
  "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
  "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with",
  "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
  "your", "yours", "yourself", "yourselves"
])

export function findSignificantKeywords(content: string, limit = 4): string[] {
  const cleaned = cleanTextForComparison(content)
  const words = cleaned.split(" ").filter((w) => w.length > 0)

  const significant = words.filter((w) => w.length >= 4 && !STOP_WORDS.has(w))

  if (significant.length === 0) {
    return Array.from(new Set(words.filter((w) => w.length >= 3))).slice(0, limit)
  }

  // Deduplicate and prioritize longer distinctive words
  const uniqueWords = Array.from(new Set(significant))
  uniqueWords.sort((a, b) => b.length - a.length)

  return uniqueWords.slice(0, limit)
}

export function calculateQuoteSimilarity(str1: string, str2: string): number {
  const s1 = cleanTextForComparison(str1)
  const s2 = cleanTextForComparison(str2)

  if (s1 === s2) return 1.0
  if (s1.length < 2 || s2.length < 2) return 0.0

  // Substring containment check
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length)
    const maxLen = Math.max(s1.length, s2.length)
    const containmentScore = minLen / maxLen
    if (containmentScore >= 0.8) {
      return containmentScore
    }
  }

  // Character bigrams Dice coefficient
  const bigrams1 = new Map<string, number>()
  for (let i = 0; i < s1.length - 1; i++) {
    const bigram = s1.substring(i, i + 2)
    bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1)
  }

  let intersection = 0
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.substring(i, i + 2)
    const count = bigrams1.get(bigram) || 0
    if (count > 0) {
      bigrams1.set(bigram, count - 1)
      intersection++
    }
  }

  const totalBigrams = s1.length - 1 + (s2.length - 1)
  const dice = totalBigrams > 0 ? (2.0 * intersection) / totalBigrams : 0

  // Word token Jaccard similarity
  const words1 = new Set(s1.split(" ").filter((w) => w.length >= 3))
  const words2 = new Set(s2.split(" ").filter((w) => w.length >= 3))

  let commonWords = 0
  for (const w of words1) {
    if (words2.has(w)) commonWords++
  }

  const unionWords = new Set([...words1, ...words2]).size
  const wordJaccard = unionWords > 0 ? commonWords / unionWords : 0

  return Math.max(dice, wordJaccard * 0.75 + dice * 0.25)
}

