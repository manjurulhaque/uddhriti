/**
 * AI-Assisted Author Identification, Semantic Search, and Alias Resolution Engine
 *
 * Provides:
 * 1. Intelligent author identification from quotation text (canonical patterns + Gemini 1.5 Flash).
 * 2. Smart typo-tolerant fuzzy matching (Damerau-Levenshtein distance).
 * 3. Curatorial alias and pseudonym resolution (e.g. Samuel Clemens -> Mark Twain, MLK -> Martin Luther King Jr.).
 * 4. Semantic attribute/role search (e.g. "Roman stoic emperor", "author of 1984").
 */

export interface AuthorRecord {
  id: string
  name: string
  slug?: string
  profession?: string | null
  nationality?: string | null
  birthYear?: number | null
  deathYear?: number | null
  quoteCount?: number
}

export type AuthorMatchType =
  | "exact"
  | "alias"
  | "token"
  | "fuzzy"
  | "detected_from_quote"
  | "semantic"

export interface AuthorMatch {
  id: string
  name: string
  slug?: string
  confidence: number // 0.00 to 1.00
  matchType: AuthorMatchType
  matchedAlias?: string
  rationale?: string
  profession?: string | null
  nationality?: string | null
  birthYear?: number | null
  deathYear?: number | null
  quoteCount?: number
}

export interface DetectAuthorResult {
  detectedAuthor: AuthorMatch | null
  candidates: AuthorMatch[]
  suggestedAuthorName?: string
  confidence: number
  rationale?: string
  provider: "gemini" | "heuristic"
}

export interface SemanticSearchResult {
  matches: AuthorMatch[]
  provider: "gemini" | "heuristic"
  rationale?: string
}

/**
 * Normalizes text for clean comparison: lowercases, strips accents/diacritics,
 * handles ligatures/special Latin letters (ø, æ, œ, ß, ł), removes punctuation, collapses whitespace.
 */
export function normalizeAuthorName(name: string): string {
  if (!name) return ""
  return name
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ß/g, "ss")
    .replace(/ł/g, "l")
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents: é -> e, etc.
    .replace(/[^a-z0-9\s]/g, " ")     // strip non-alphanumeric
    .replace(/\s+/g, " ")            // collapse whitespace
    .trim()
}

/**
 * Damerau-Levenshtein distance algorithm for typo detection (including adjacent transpositions).
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  const la = a.length
  const lb = b.length
  if (!la) return lb
  if (!lb) return la

  const dp: number[][] = Array.from({ length: la + 1 }, () => new Array<number>(lb + 1).fill(0))

  for (let i = 0; i <= la; i++) dp[i][0] = i
  for (let j = 0; j <= lb; j++) dp[0][j] = j

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      )

      // Adjacent Transposition (Damerau)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1)
      }
    }
  }

  return dp[la][lb]
}

/**
 * Calculates normalized string similarity between 0.0 (completely distinct) and 1.0 (exact match).
 */
export function calculateSimilarity(a: string, b: string): number {
  const normA = normalizeAuthorName(a)
  const normB = normalizeAuthorName(b)
  if (normA === normB) return 1.0
  const maxLen = Math.max(normA.length, normB.length)
  if (maxLen === 0) return 1.0
  const dist = levenshteinDistance(normA, normB)
  return Math.max(0, 1 - dist / maxLen)
}

/**
 * Curatorial dictionary of known author aliases, pen names, birth names,
 * honorifics, and historical misspellings.
 * Key: normalized alias. Value: target canonical author name.
 */
export const AUTHOR_ALIASES: Record<string, string> = {
  // Pseudonyms and Birth Names
  "samuel clemens": "Mark Twain",
  "samuel langhorne clemens": "Mark Twain",
  "eric blair": "George Orwell",
  "eric arthur blair": "George Orwell",
  "francois marie arouet": "Voltaire",
  "arouet": "Voltaire",
  "marian evans": "George Eliot",
  "mary ann evans": "George Eliot",
  "charles lutwidge dodgson": "Lewis Carroll",
  "charles dodgson": "Lewis Carroll",
  "clive staples lewis": "C. S. Lewis",
  "cs lewis": "C. S. Lewis",
  "c s lewis": "C. S. Lewis",
  "john ronald reuel tolkien": "J. R. R. Tolkien",
  "jrr tolkien": "J. R. R. Tolkien",
  "j r r tolkien": "J. R. R. Tolkien",
  "thomas stearns eliot": "T. S. Eliot",
  "ts eliot": "T. S. Eliot",
  "t s eliot": "T. S. Eliot",
  "herbert george wells": "H. G. Wells",
  "hg wells": "H. G. Wells",
  "h g wells": "H. G. Wells",
  "francis scott fitzgerald": "F. Scott Fitzgerald",
  "scott fitzgerald": "F. Scott Fitzgerald",
  "george bernard shaw": "George Bernard Shaw",
  "bernard shaw": "George Bernard Shaw",
  "gbs": "George Bernard Shaw",
  "chloe ardelia wofford": "Toni Morrison",
  "marguerite annie johnson": "Maya Angelou",
  "adeline virginia stephen": "Virginia Woolf",
  "el hajj malik el shabazz": "Malcolm X",
  "malcolm little": "Malcolm X",
  "philip kindred dick": "Philip K. Dick",
  "pkd": "Philip K. Dick",
  "nassim taleb": "Nassim Nicholas Taleb",

  // Civil Rights, Statespeople, Leaders
  "mlk": "Martin Luther King Jr.",
  "martin luther king": "Martin Luther King Jr.",
  "dr king": "Martin Luther King Jr.",
  "martin luther king junior": "Martin Luther King Jr.",
  "bapu": "Mahatma Gandhi",
  "gandhiji": "Mahatma Gandhi",
  "mohandas gandhi": "Mahatma Gandhi",
  "mohandas karamchand gandhi": "Mahatma Gandhi",
  "ghandi": "Mahatma Gandhi",
  "mahatma ghandi": "Mahatma Gandhi",
  "madiba": "Nelson Mandela",
  "abe lincoln": "Abraham Lincoln",
  "honest abe": "Abraham Lincoln",
  "ben franklin": "Benjamin Franklin",
  "fdr": "Franklin D. Roosevelt",
  "franklin roosevelt": "Franklin D. Roosevelt",
  "teddy roosevelt": "Theodore Roosevelt",
  "tr": "Theodore Roosevelt",
  "jfk": "John F. Kennedy",
  "winston churchill": "Winston Churchill",
  "sir winston churchill": "Winston Churchill",

  // Classical & Stoic Thinkers
  "marc aurel": "Marcus Aurelius",
  "marcus aurelius antoninus": "Marcus Aurelius",
  "senica": "Seneca",
  "seneca the younger": "Seneca",
  "lucius annaeus seneca": "Seneca",
  "epiktetos": "Epictetus",
  "aristoteles": "Aristotle",
  "platon": "Plato",
  "sokrates": "Socrates",
  "marcus tullius cicero": "Cicero",
  "publius vergilius maro": "Virgil",
  "publius ovidius naso": "Ovid",
  "quintus horatius flaccus": "Horace",

  // Eastern Philosophy & Spiritual Figures
  "the buddha": "Gautama Buddha",
  "buddha": "Gautama Buddha",
  "siddhartha gautama": "Gautama Buddha",
  "shakyamuni": "Gautama Buddha",
  "shakyamuni buddha": "Gautama Buddha",
  "confucious": "Confucius",
  "kongzi": "Confucius",
  "kong fuzi": "Confucius",
  "laozi": "Lao Tzu",
  "lao tze": "Lao Tzu",
  "lao tsu": "Lao Tzu",
  "sunzi": "Sun Tzu",
  "sun wu": "Sun Tzu",
  "chuang tzu": "Zhuangzi",
  "zhuang tzu": "Zhuangzi",
  "mengzi": "Mencius",
  "rumi": "Rumi",
  "jalal al din muhammad rumi": "Rumi",
  "jalaluddin rumi": "Rumi",
  "mevlana": "Rumi",
  "khalil gibran": "Kahlil Gibran",
  "narendranath datta": "Swami Vivekananda",
  "swami vivekanand": "Swami Vivekananda",
  "gurudev": "Rabindranath Tagore",
  "rabindranath thakur": "Rabindranath Tagore",
  "tenzin gyatso": "Dalai Lama",
  "14th dalai lama": "Dalai Lama",
  "bhagwan shree rajneesh": "Osho",
  "jaggi vasudev": "Sadhguru",
  "mukunda lal ghosh": "Paramahansa Yogananda",
  "venkataraman iyer": "Ramana Maharshi",
  "aurobindo ghose": "Sri Aurobindo",
  "adi shankaracharya": "Adi Shankara",
  "shankara": "Adi Shankara",
  "kautilya": "Chanakya",
  "vishnugupta": "Chanakya",

  // European Philosophers & Authors
  "nietzche": "Friedrich Nietzsche",
  "neitzsche": "Friedrich Nietzsche",
  "dostoyevsky": "Fyodor Dostoevsky",
  "dostoievsky": "Fyodor Dostoevsky",
  "fyodor dostoyevsky": "Fyodor Dostoevsky",
  "tolstoi": "Leo Tolstoy",
  "lev tolstoy": "Leo Tolstoy",
  "soren kierkegaard": "Søren Kierkegaard",
  "the bard": "William Shakespeare",
  "shakespeare": "William Shakespeare",
  "niccolo machiavelli": "Niccolò Machiavelli",
  "machiavelli": "Niccolò Machiavelli",
  "rene descartes": "René Descartes",
  "descartes": "René Descartes",
  "spinoza": "Baruch Spinoza",
  "benedict de spinoza": "Baruch Spinoza",
  "schopenhauer": "Arthur Schopenhauer",
  "sartre": "Jean-Paul Sartre",
  "camus": "Albert Camus",
  "wilde": "Oscar Wilde",
  "emerson": "Ralph Waldo Emerson",
  "thoreau": "Henry David Thoreau",
  "gabo": "Gabriel García Márquez",
  "gabriel garcia marquez": "Gabriel García Márquez",
}

/**
 * High-profile canonical quote patterns mapped directly to historical authors.
 */
interface CanonicalQuoteEntry {
  pattern: RegExp
  authorKeywords: string[]
  primaryCitation?: string
}

export const CANONICAL_QUOTE_PATTERNS: CanonicalQuoteEntry[] = [
  // Stoics
  {
    pattern: /power over your mind.*not outside events/i,
    authorKeywords: ["marcus aurelius"],
    primaryCitation: "Meditations IV, 3",
  },
  {
    pattern: /waste no more time arguing.*good man.*be one/i,
    authorKeywords: ["marcus aurelius"],
    primaryCitation: "Meditations X, 16",
  },
  {
    pattern: /happiness of your life depends upon the quality/i,
    authorKeywords: ["marcus aurelius"],
    primaryCitation: "Meditations III, 9",
  },
  {
    pattern: /it is not death that a man should fear.*never begin to live/i,
    authorKeywords: ["marcus aurelius"],
    primaryCitation: "Meditations XII, 1",
  },
  {
    pattern: /suffer more often in imagination than in reality/i,
    authorKeywords: ["seneca"],
    primaryCitation: "Letters to Lucilius XIII",
  },
  {
    pattern: /luck is what happens when preparation meets opportunity/i,
    authorKeywords: ["seneca"],
    primaryCitation: "Moral Essays",
  },
  {
    pattern: /difficulties strengthen the mind.*labor does the body/i,
    authorKeywords: ["seneca"],
    primaryCitation: "Moral Essays",
  },
  {
    pattern: /not worried by real problems so much as by his imagined anxieties/i,
    authorKeywords: ["epictetus"],
    primaryCitation: "Enchiridion V",
  },
  {
    pattern: /not what happens to you.*how you react to it/i,
    authorKeywords: ["epictetus"],
    primaryCitation: "Discourses",
  },
  // Leaders & Activists
  {
    pattern: /be the change.*wish to see in the world/i,
    authorKeywords: ["mahatma gandhi", "gandhi"],
    primaryCitation: "Attributed to Mahatma Gandhi",
  },
  {
    pattern: /live as if you were to die tomorrow.*learn as if you were to live forever/i,
    authorKeywords: ["mahatma gandhi", "gandhi"],
    primaryCitation: "Selected Writings",
  },
  {
    pattern: /eye for an eye.*whole world blind/i,
    authorKeywords: ["mahatma gandhi", "gandhi"],
    primaryCitation: "Attributed to Mahatma Gandhi",
  },
  {
    pattern: /darkness cannot drive out darkness.*light can do that/i,
    authorKeywords: ["martin luther king jr", "martin luther king"],
    primaryCitation: "Strength to Love (1963)",
  },
  {
    pattern: /injustice anywhere is a threat to justice everywhere/i,
    authorKeywords: ["martin luther king jr", "martin luther king"],
    primaryCitation: "Letter from Birmingham Jail (1963)",
  },
  {
    pattern: /arc of the moral universe is long.*bends toward justice/i,
    authorKeywords: ["martin luther king jr", "martin luther king"],
    primaryCitation: "Where Do We Go from Here (1967)",
  },
  {
    pattern: /it always seems impossible until it.*done/i,
    authorKeywords: ["nelson mandela"],
    primaryCitation: "Long Walk to Freedom",
  },
  {
    pattern: /give me six hours to chop down a tree.*first four sharpening the axe/i,
    authorKeywords: ["abraham lincoln"],
    primaryCitation: "Commonly attributed to Abraham Lincoln",
  },
  {
    pattern: /test a man.*character.*give him power/i,
    authorKeywords: ["abraham lincoln"],
    primaryCitation: "Attributed to Abraham Lincoln",
  },
  {
    pattern: /success is not final.*failure is not fatal/i,
    authorKeywords: ["winston churchill"],
    primaryCitation: "Commonly attributed to Winston Churchill",
  },
  {
    pattern: /if you are going through hell.*keep going/i,
    authorKeywords: ["winston churchill"],
    primaryCitation: "Commonly attributed to Winston Churchill",
  },
  // Visionaries & Scientists
  {
    pattern: /stay hungry.*stay foolish/i,
    authorKeywords: ["steve jobs"],
    primaryCitation: "Stanford Commencement Address (2005)",
  },
  {
    pattern: /time is limited.*don't waste it living someone else's life/i,
    authorKeywords: ["steve jobs"],
    primaryCitation: "Stanford Commencement Address (2005)",
  },
  {
    pattern: /two things are infinite.*universe and human stupidity/i,
    authorKeywords: ["albert einstein"],
    primaryCitation: "Attributed to Albert Einstein",
  },
  {
    pattern: /in the middle of difficulty lies opportunity/i,
    authorKeywords: ["albert einstein"],
    primaryCitation: "Maxims and Reflections",
  },
  {
    pattern: /imagination is more important than knowledge/i,
    authorKeywords: ["albert einstein"],
    primaryCitation: "Cosmic Religion (1930)",
  },
  // Philosophers
  {
    pattern: /to live is to suffer.*to survive is to find some meaning/i,
    authorKeywords: ["friedrich nietzsche"],
    primaryCitation: "Twilight of the Idols / Ecce Homo",
  },
  {
    pattern: /he who has a why to live can bear almost any how/i,
    authorKeywords: ["friedrich nietzsche"],
    primaryCitation: "Twilight of the Idols (1889)",
  },
  {
    pattern: /that which does not kill us makes us stronger/i,
    authorKeywords: ["friedrich nietzsche"],
    primaryCitation: "Twilight of the Idols (1889)",
  },
  {
    pattern: /unexamined life is not worth living/i,
    authorKeywords: ["socrates"],
    primaryCitation: "Plato's Apology (38a)",
  },
  {
    pattern: /i know that i know nothing/i,
    authorKeywords: ["socrates"],
    primaryCitation: "Plato's Apology",
  },
  {
    pattern: /we are what we repeatedly do.*excellence.*not an act/i,
    authorKeywords: ["aristotle"],
    primaryCitation: "The Story of Philosophy (Will Durant)",
  },
  {
    pattern: /mark of an educated mind to be able to entertain a thought/i,
    authorKeywords: ["aristotle"],
    primaryCitation: "Nicomachean Ethics",
  },
  // Literature & Eastern Wisdom
  {
    pattern: /twenty years from now you will be more disappointed/i,
    authorKeywords: ["mark twain"],
    primaryCitation: "Attributed to Mark Twain",
  },
  {
    pattern: /side of the majority.*pause and reflect/i,
    authorKeywords: ["mark twain"],
    primaryCitation: "Notebook (1904)",
  },
  {
    pattern: /to be yourself in a world that is constantly trying to make you something else/i,
    authorKeywords: ["ralph waldo emerson"],
    primaryCitation: "Self-Reliance (1841)",
  },
  {
    pattern: /do not go where the path may lead.*go instead where there is no path/i,
    authorKeywords: ["ralph waldo emerson"],
    primaryCitation: "Poems & Essays",
  },
  {
    pattern: /be yourself.*everyone else is already taken/i,
    authorKeywords: ["oscar wilde"],
    primaryCitation: "Attributed to Oscar Wilde",
  },
  {
    pattern: /all in the gutter.*some of us are looking at the stars/i,
    authorKeywords: ["oscar wilde"],
    primaryCitation: "Lady Windermere's Fan (1892)",
  },
  {
    pattern: /journey of a thousand miles begins with a single step/i,
    authorKeywords: ["lao tzu", "laozi"],
    primaryCitation: "Tao Te Ching, Chapter 64",
  },
  {
    pattern: /knowing others is intelligence.*knowing yourself is true wisdom/i,
    authorKeywords: ["lao tzu", "laozi"],
    primaryCitation: "Tao Te Ching, Chapter 33",
  },
  {
    pattern: /when i let go of what i am.*i become what i might be/i,
    authorKeywords: ["lao tzu", "laozi"],
    primaryCitation: "Tao Te Ching",
  },
  {
    pattern: /does not matter how slowly you go as long as you do not stop/i,
    authorKeywords: ["confucius"],
    primaryCitation: "Analects",
  },
  {
    pattern: /greatest glory is not in never falling.*rising every time we fall/i,
    authorKeywords: ["confucius"],
    primaryCitation: "Analects",
  },
  {
    pattern: /wound is the place where the light enters you/i,
    authorKeywords: ["rumi"],
    primaryCitation: "Masnavi",
  },
  {
    pattern: /yesterday i was clever.*change the world.*today i am wise.*change myself/i,
    authorKeywords: ["rumi"],
    primaryCitation: "Selected Poems",
  },
]

/**
 * Searches and ranks authors locally with alias resolution and typo tolerance.
 * Operates synchronously in milliseconds across thousands of records.
 */
export function matchAuthorsLocal(
  query: string,
  authors: AuthorRecord[],
  limit = 25
): AuthorMatch[] {
  const trimmed = query.trim()
  if (!trimmed) {
    // Return authors sorted by popularity (quoteCount) or name
    return [...authors]
      .sort((a, b) => (b.quoteCount || 0) - (a.quoteCount || 0) || a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((author) => ({
        id: author.id,
        name: author.name,
        slug: author.slug,
        confidence: 1.0,
        matchType: "exact",
        profession: author.profession,
        nationality: author.nationality,
        birthYear: author.birthYear,
        deathYear: author.deathYear,
        quoteCount: author.quoteCount,
      }))
  }

  const normQuery = normalizeAuthorName(trimmed)
  const queryTokens = normQuery.split(/\s+/).filter(Boolean)
  const matchesMap = new Map<string, AuthorMatch>()

  // 1. Alias Resolution
  const targetCanonicalFromAlias = AUTHOR_ALIASES[normQuery]
  let aliasTargetNorm = targetCanonicalFromAlias ? normalizeAuthorName(targetCanonicalFromAlias) : null

  // Also check if any alias starts with or matches query
  const matchingAliases = Object.entries(AUTHOR_ALIASES).filter(([alias]) => {
    return alias === normQuery || alias.startsWith(normQuery) || (normQuery.length >= 4 && alias.includes(normQuery))
  })

  // 2. Iterate through authors and score
  for (const author of authors) {
    const normName = normalizeAuthorName(author.name)
    const authorTokens = normName.split(/\s+/).filter(Boolean)

    let matchType: AuthorMatchType | null = null
    let confidence = 0.0
    let matchedAlias: string | undefined
    let rationale: string | undefined

    // A. Direct exact match
    if (normName === normQuery) {
      matchType = "exact"
      confidence = 1.0
      rationale = "Exact name match"
    }
    // B. Direct alias match
    else if (aliasTargetNorm && (normName === aliasTargetNorm || normName.includes(aliasTargetNorm))) {
      matchType = "alias"
      confidence = 0.99
      matchedAlias = targetCanonicalFromAlias
      rationale = `Direct alias for "${targetCanonicalFromAlias}"`
    }
    // C. Starts with prefix match
    else if (normName.startsWith(normQuery)) {
      matchType = "token"
      confidence = 0.94
      rationale = `Name starts with "${trimmed}"`
    }
    // D. Token matching (e.g. "aurelius" matching "marcus aurelius")
    else {
      const allTokensPresent = queryTokens.length > 0 && queryTokens.every((qt) =>
        authorTokens.some((at) => at === qt || at.startsWith(qt))
      )

      if (allTokensPresent) {
        matchType = "token"
        confidence = 0.88
        rationale = "Full token overlap"
      } else if (normName.includes(normQuery)) {
        matchType = "token"
        confidence = 0.82
        rationale = "Substring match"
      }
    }

    // E. Matching via auxiliary alias list
    if (!matchType && matchingAliases.length > 0) {
      for (const [alias, canonicalTarget] of matchingAliases) {
        const normTarget = normalizeAuthorName(canonicalTarget)
        if (normName === normTarget || normName.includes(normTarget)) {
          matchType = "alias"
          confidence = 0.92
          matchedAlias = alias
          rationale = `Matched known alias "${alias}"`
          break
        }
      }
    }

    // F. Typo / Fuzzy distance match
    if (!matchType && normQuery.length >= 3) {
      const wholeSimilarity = calculateSimilarity(normName, normQuery)

      // Also check token-level fuzzy match (e.g. "ghandi" vs "gandhi" in "mahatma gandhi")
      let bestTokenSim = 0
      for (const at of authorTokens) {
        if (at.length >= 3) {
          const sim = calculateSimilarity(at, normQuery)
          if (sim > bestTokenSim) bestTokenSim = sim
        }
      }

      const effectiveSim = Math.max(wholeSimilarity, bestTokenSim)
      if (effectiveSim >= 0.72) {
        matchType = "fuzzy"
        confidence = Math.round(effectiveSim * 100) / 100
        rationale = `Fuzzy typo match (${Math.round(effectiveSim * 100)}%)`
      }
    }

    if (matchType) {
      matchesMap.set(author.id, {
        id: author.id,
        name: author.name,
        slug: author.slug,
        confidence,
        matchType,
        matchedAlias,
        rationale,
        profession: author.profession,
        nationality: author.nationality,
        birthYear: author.birthYear,
        deathYear: author.deathYear,
        quoteCount: author.quoteCount,
      })
    }
  }

  // Sort: confidence DESC -> quoteCount DESC -> name ASC
  return Array.from(matchesMap.values())
    .sort((a, b) => {
      if (Math.abs(b.confidence - a.confidence) > 0.05) {
        return b.confidence - a.confidence
      }
      const bQuotes = b.quoteCount || 0
      const aQuotes = a.quoteCount || 0
      if (bQuotes !== aQuotes) {
        return bQuotes - aQuotes
      }
      return a.name.localeCompare(b.name)
    })
    .slice(0, limit)
}

/**
 * Finds the single best author from DB matching a target name or keyword.
 */
export function findMatchingDbAuthor(
  targetName: string,
  authors: AuthorRecord[]
): AuthorMatch | null {
  const matches = matchAuthorsLocal(targetName, authors, 1)
  return matches.length > 0 ? matches[0] : null
}

/**
 * Detects the author of a quotation directly from its content.
 * 1. Checks deterministic canonical database first.
 * 2. If GEMINI_API_KEY is present and canonical pattern does not match, queries Gemini 1.5 Flash.
 * 3. Gracefully maps recognized author back to database author records.
 */
export async function detectAuthorFromQuoteContent(
  content: string,
  authors: AuthorRecord[]
): Promise<DetectAuthorResult> {
  const trimmed = content.trim()
  if (!trimmed) {
    return {
      detectedAuthor: null,
      candidates: [],
      confidence: 0,
      rationale: "Empty quotation content",
      provider: "heuristic",
    }
  }

  // 1. Check Canonical Patterns (deterministic locus classicus)
  for (const entry of CANONICAL_QUOTE_PATTERNS) {
    if (entry.pattern.test(trimmed)) {
      for (const keyword of entry.authorKeywords) {
        const dbAuthor = findMatchingDbAuthor(keyword, authors)
        if (dbAuthor) {
          const match: AuthorMatch = {
            ...dbAuthor,
            confidence: 0.98,
            matchType: "detected_from_quote",
            rationale: entry.primaryCitation
              ? `Canonical match from ${entry.primaryCitation}`
              : "Recognized canonical quotation",
          }
          return {
            detectedAuthor: match,
            candidates: [match],
            suggestedAuthorName: dbAuthor.name,
            confidence: 0.98,
            rationale: match.rationale,
            provider: "heuristic",
          }
        }
      }
    }
  }

  // 2. Query Gemini 1.5 Flash if API key is configured
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (apiKey) {
    try {
      const prompt = `You are an expert quotation attribution specialist and literary historian.
Identify the author of the following quotation:

"${trimmed}"

Return a strictly valid JSON object with:
1. "authorName": Standard full name of the author (e.g. "Marcus Aurelius", "Mark Twain", "Virginia Woolf", "Albert Einstein"). If unknown, specify "Unknown".
2. "confidence": Number between 0.00 and 1.00 representing attribution certainty.
3. "rationale": Short explanation (max 20 words) citing the specific work, speech, or historical context.
4. "alternativeNames": Array of aliases, pseudonyms, or variant spellings (e.g. ["Samuel Clemens", "Mark Twain"]).

Return ONLY the raw JSON object without markdown fences.`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const parsed = JSON.parse(text)
          const suggestedAuthorName = typeof parsed.authorName === "string" ? parsed.authorName.trim() : ""
          const confidence =
            typeof parsed.confidence === "number" && !isNaN(parsed.confidence)
              ? Math.max(0, Math.min(1, parsed.confidence))
              : 0.8
          const rationale = typeof parsed.rationale === "string" ? parsed.rationale : undefined
          const alternativeNames: string[] = Array.isArray(parsed.alternativeNames)
            ? parsed.alternativeNames.filter((n: unknown) => typeof n === "string")
            : []

          if (suggestedAuthorName && suggestedAuthorName.toLowerCase() !== "unknown") {
            // Find in dbAuthors
            const candidates: AuthorMatch[] = []

            // A. Search with suggested primary name
            const primaryMatches = matchAuthorsLocal(suggestedAuthorName, authors, 5)
            for (const m of primaryMatches) {
              candidates.push({
                ...m,
                matchType: "detected_from_quote",
                confidence: Math.min(confidence, m.confidence),
                rationale: rationale || `AI identified as ${suggestedAuthorName}`,
              })
            }

            // B. Search with alternative names
            for (const alt of alternativeNames) {
              const altMatches = matchAuthorsLocal(alt, authors, 3)
              for (const m of altMatches) {
                if (!candidates.some((c) => c.id === m.id)) {
                  candidates.push({
                    ...m,
                    matchType: "detected_from_quote",
                    confidence: Math.min(confidence, m.confidence * 0.95),
                    rationale: `AI matched alternate name "${alt}"`,
                  })
                }
              }
            }

            const detectedAuthor = candidates.length > 0 ? candidates[0] : null

            return {
              detectedAuthor,
              candidates,
              suggestedAuthorName,
              confidence,
              rationale,
              provider: "gemini",
            }
          }
        }
      }
    } catch {
      // Graceful fallback to heuristic
    }
  }

  // 3. Heuristic fallback when not recognized in canon and Gemini is unavailable
  return {
    detectedAuthor: null,
    candidates: [],
    confidence: 0,
    rationale: "Quotation author could not be conclusively determined from text alone.",
    provider: "heuristic",
  }
}

/**
 * Performs semantic / conceptual author search.
 * When local search produces zero or low-confidence results, or when explicitly requested,
 * queries Gemini 1.5 Flash to resolve descriptive prompts (e.g. "Roman stoic emperor", "author of 1984").
 */
export async function semanticSearchAuthors(
  query: string,
  authors: AuthorRecord[],
  limit = 20,
  useAI = false
): Promise<SemanticSearchResult> {
  const trimmed = query.trim()
  if (!trimmed) {
    const local = matchAuthorsLocal("", authors, limit)
    return { matches: local, provider: "heuristic" }
  }

  // First run high-speed local matching
  const localMatches = matchAuthorsLocal(trimmed, authors, limit)

  // If local match returned strong results or AI is not requested and we have >= 3 matches, return local
  if (!useAI && localMatches.length >= 3 && localMatches[0].confidence >= 0.8) {
    return { matches: localMatches, provider: "heuristic" }
  }

  // If AI is requested or local match is poor/empty, try Gemini semantic author resolution
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (apiKey) {
    try {
      const prompt = `You are a helpful quotation research librarian.
The user is searching for an author using the following query:
"${trimmed}"

Identify up to 5 best matching notable authors, philosophers, poets, or historical figures.
Return a valid JSON object with:
1. "candidateNames": Array of strings representing standard full author names in English (e.g. ["Marcus Aurelius", "Seneca", "Epictetus"]).
2. "rationale": Concise 1-sentence explanation of why these match the query.

Return ONLY the JSON object without markdown fences.`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const parsed = JSON.parse(text)
          const candidateNames: string[] = Array.isArray(parsed.candidateNames)
            ? parsed.candidateNames.filter((n: unknown) => typeof n === "string")
            : []
          const rationale: string = typeof parsed.rationale === "string" ? parsed.rationale : ""

          const combinedMatches: AuthorMatch[] = []
          const seenIds = new Set<string>()

          // Map candidate names to DB authors
          for (let i = 0; i < candidateNames.length; i++) {
            const name = candidateNames[i]
            const found = matchAuthorsLocal(name, authors, 3)
            for (const m of found) {
              if (!seenIds.has(m.id)) {
                seenIds.add(m.id)
                combinedMatches.push({
                  ...m,
                  matchType: "semantic",
                  confidence: Math.max(0.7, 0.95 - i * 0.05),
                  rationale: rationale || `AI semantic match for "${trimmed}"`,
                })
              }
            }
          }

          // Merge in any local matches that weren't already added
          for (const m of localMatches) {
            if (!seenIds.has(m.id)) {
              seenIds.add(m.id)
              combinedMatches.push(m)
            }
          }

          if (combinedMatches.length > 0) {
            return {
              matches: combinedMatches.slice(0, limit),
              provider: "gemini",
              rationale,
            }
          }
        }
      }
    } catch {
      // Fall through to local matches
    }
  }

  return {
    matches: localMatches,
    provider: "heuristic",
  }
}
