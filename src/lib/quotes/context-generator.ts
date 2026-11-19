/**
 * AI-Assisted Context Suggestion Engine
 *
 * Generates structured, humanized, and SEO-optimized context drafts (meaning, historical
 * context, and modern relevance) for quotations. When GEMINI_API_KEY is configured, it
 * leverages Google Gemini with strict anti-AI guardrails and search-intent prompt constraints.
 * Otherwise, it executes a deterministic semantic heuristic synthesizer that incorporates
 * author biographies, philosophical traditions, and thematic categories.
 */

import { callGeminiGenerateContent, callGeminiStreamGenerateContent } from "@/lib/gemini"

export interface QuoteContextDraftInput {
  content: string
  authorName?: string | null
  categoryName?: string | null
  sourceTitle?: string | null
}

export interface QuoteContextDraft {
  meaning: string
  historicalContext: string
  modernRelevance: string
}

export interface ContextGenerationResult {
  draft: QuoteContextDraft
  provider: "gemini" | "heuristic"
}

// Banned robotic clichés and subtle AI tells for post-generation sanitization
export const BANNED_AI_CONTEXT_WORDS: RegExp[] = [
  /\bat\s+its\s+core\b/gi,
  /\bserves?\s+as\s+a\s+reminder\b/gi,
  /\bserving\s+as\s+a\s+reminder\b/gi,
  /\ba\s+powerful\s+reminder\b/gi,
  /\ba\s+poignant\s+reminder\b/gi,
  /\ba\s+timeless\s+reminder\b/gi,
  /\bstands?\s+as\s+a\s+testament\b/gi,
  /\bis\s+a\s+testament\s+to\b/gi,
  /\btestament(?:\s+to)?\b/gi,
  /\bdelv(?:e|es|ing)\b/gi,
  /\brich\s+tapestry\b/gi,
  /\btapestry\b/gi,
  /\bbeacon(?:s)?\b/gi,
  /\bmultifaceted\b/gi,
  /\bcornerstone(?:s)?\b/gi,
  /\bin\s+the\s+realm\s+of\b/gi,
  /\brealm(?:s)?\b/gi,
  /\bsheds?\s+light\s+on\b/gi,
  /\bit\s+is\s+important\s+to\s+remember\b/gi,
  /\bit\s+is\s+worth\s+noting\b/gi,
  /\breminds\s+us\s+that\b/gi,
  /\bprofound\s+reminder\b/gi,
  /\bnavigate\s+the\s+complexities\b/gi,
  /\bplays?\s+a\s+crucial\s+role\b/gi,
  /\bin\s+our\s+contemporary,\s+hyper-connected\s+era\b/gi,
  /\bin\s+today's\s+fast-paced\s+world\b/gi,
  /\bin\s+conclusion\b/gi,
]

export const BANNED_AI_CONTEXT_PHRASES = [
  "at its core",
  "serves as a reminder",
  "serve as a reminder",
  "serving as a reminder",
  "a powerful reminder",
  "a poignant reminder",
  "a timeless reminder",
  "stands as a testament",
  "is a testament to",
  "testament to",
  "delve into",
  "delves into",
  "delving into",
  "rich tapestry",
  "beacon of",
  "multifaceted",
  "cornerstone of",
  "in the realm of",
  "sheds light on",
  "shed light on",
  "it is important to remember",
  "it is worth noting",
  "reminds us that",
  "profound reminder",
  "navigate the complexities",
  "plays a crucial role",
  "in today's fast-paced world",
  "in conclusion",
] as const

/**
 * Detects whether a piece of context text contains any known robotic AI clichés
 */
export function detectBannedContextCliches(text: string): string[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const found: string[] = []
  for (const phrase of BANNED_AI_CONTEXT_PHRASES) {
    if (lower.includes(phrase) && !found.includes(phrase)) {
      found.push(phrase)
    }
  }
  return found
}

/**
 * Strips robotic AI phrases, formulaic opening filler, and syntactical repetition,
 * ensuring high-quality, humanized prose.
 */
export function sanitizeHumanContextText(text: string): string {
  if (!text) return ""

  let cleaned = text.trim()

  // Clean common formulaic opening clauses
  cleaned = cleaned.replace(
    /^(?:at its core,?\s*|this quote speaks directly to\s*|this quotation speaks directly to\s*)/i,
    ""
  )
  cleaned = cleaned.replace(/^(?:in essence,?\s*|fundamentally,?\s*|essentially,?\s*)/i, "")
  cleaned = cleaned.replace(
    /^(?:serving as a testament to\s*|as a reminder that\s*|standing as a testament to\s*)/i,
    ""
  )
  cleaned = cleaned.replace(
    /^(?:this quotation explores profound insights concerning\s*|this quote explores profound insights concerning\s*)/i,
    ""
  )

  // Strip banned AI vocabulary
  for (const pattern of BANNED_AI_CONTEXT_WORDS) {
    cleaned = cleaned.replace(pattern, "")
  }

  // Clean whitespace and punctuation artifacts left after removals
  cleaned = cleaned
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s*,(\s*,)+/g, ",")
    .replace(/[ \t]+,/g, ",")
    .replace(/\b(a|an|the)\s+of\b/gi, "of")
    .replace(/\b(a|an)\s+(a|an)\b/gi, "a")
    .replace(/\bthe\s+the\b/gi, "the")
    .replace(/\s*([.?!])\s*([.?!])+/g, "$1")
    .replace(/\s+\./g, ".")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/([ \t]*\r?\n){3,}/g, "\n\n")
    .trim()

  // Ensure leading character is uppercase
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  return cleaned
}

/**
 * Extracts a concise, high-intent SEO snippet (sentence 1, <= 160 chars)
 * suitable for Google Featured Snippets and search engine meta descriptions.
 */
export function extractSeoGoldenSnippet(meaning: string): string {
  if (!meaning) return ""
  const clean = sanitizeHumanContextText(meaning).replace(/\s+/g, " ").trim()

  // Match sentence 1 ending in period, question mark, or exclamation point
  const match = clean.match(/^([^.?!]+[.?!])/)
  if (match && match[1]) {
    const s1 = match[1].trim()
    if (s1.length <= 160) {
      return s1
    }
  }

  // If sentence 1 exceeds 160 chars or has no terminal punctuation, truncate cleanly at word boundary
  if (clean.length <= 160) return clean
  const truncated = clean.slice(0, 157)
  const lastSpace = truncated.lastIndexOf(" ")
  const boundary = lastSpace > 90 ? lastSpace : 157
  return `${clean.slice(0, boundary).trim()}...`
}

// Known author traditions and eras for high-fidelity heuristic enrichment
const AUTHOR_KNOWLEDGE_BASE: Record<
  string,
  { era: string; tradition: string; bioContext: string }
> = {
  "marcus aurelius": {
    era: "c. 121 – 180 AD, Roman Empire",
    tradition: "Stoic Philosophy",
    bioContext:
      "Roman Emperor and Stoic philosopher. Recorded personal reflections in his private journals ('Meditations') during military campaigns along the Danube frontier, focusing on duty, mortality, and emotional fortitude.",
  },
  seneca: {
    era: "c. 4 BC – 65 AD, Roman Empire",
    tradition: "Roman Stoicism",
    bioContext:
      "Statesman, dramatist, and advisor to Emperor Nero. His epistolary works explore the brevity of life, anger management, and the practical cultivation of tranquility amidst political peril.",
  },
  epictetus: {
    era: "c. 50 – 135 AD, Greco-Roman",
    tradition: "Stoic Philosophy",
    bioContext:
      "Born a slave in Hierapolis (modern Turkey), he gained freedom and taught philosophy in Rome and Greece. Emphasized the core dichotomy between what is strictly within our control and what is external.",
  },
  "ralph waldo emerson": {
    era: "1803 – 1882, United States",
    tradition: "Transcendentalism",
    bioContext:
      "American essayist, lecturer, and poet who championed individualism, self-reliance, and spiritual communion with nature during the 19th-century New England cultural renaissance.",
  },
  "henry david thoreau": {
    era: "1817 – 1862, United States",
    tradition: "Transcendentalism & Civil Disobedience",
    bioContext:
      "Philosopher and naturalist known for his deliberate retreat to Walden Pond and seminal writings on environmental stewardship and principled resistance to unjust state action.",
  },
  "mahatma gandhi": {
    era: "1869 – 1948, India",
    tradition: "Satyagraha (Truth-Force) & Ahimsa (Nonviolence)",
    bioContext:
      "Leader of the Indian independence movement against British colonial rule. Advanced nonviolent civil disobedience as an active spiritual force for political transformation and moral dignity.",
  },
  "friedrich nietzsche": {
    era: "1844 – 1900, Germany",
    tradition: "Existential Philosophy",
    bioContext:
      "German philosopher and cultural critic who examined master-slave morality, the affirmation of life ('amor fati'), the will to power, and the psychological overcoming of nihilism in post-Enlightenment Europe.",
  },
  "martin luther king jr.": {
    era: "1929 – 1968, United States",
    tradition: "Civil Rights & Christian Ethics",
    bioContext:
      "Baptist minister and civil rights leader who mobilized nonviolent mass protest against racial segregation and systemic inequality in America, articulating a vision of universal human dignity and moral accountability.",
  },
  "lao tzu": {
    era: "c. 6th – 4th Century BC, Ancient China",
    tradition: "Taoism",
    bioContext:
      "Legendary ancient Chinese philosopher credited with composing the Tao Te Ching. Taught Wu Wei (effortless action), harmony with natural order, simplicity, and non-contention.",
  },
  confucius: {
    era: "551 – 479 BC, Ancient China",
    tradition: "Confucianism",
    bioContext:
      "Chinese philosopher whose teachings emphasized filial piety, ritual propriety (Li), benevolence (Ren), and ethical governance during the fractured Spring and Autumn period.",
  },
  aristotle: {
    era: "384 – 322 BC, Classical Greece",
    tradition: "Aristotelian Virtue Ethics",
    bioContext:
      "Polymath and student of Plato who founded the Lyceum. Formulated the doctrine of the golden mean and eudaimonia (human flourishing achieved through cultivated rational habits).",
  },
  plato: {
    era: "c. 428 – 348 BC, Classical Greece",
    tradition: "Platonic Idealism",
    bioContext:
      "Founder of the Academy in Athens. Explored justice, truth, the world of ideal forms, and the philosopher's duty to seek truth beyond sensory illusion.",
  },
  socrates: {
    era: "c. 470 – 399 BC, Classical Greece",
    tradition: "Socratic Method & Ethical Inquiry",
    bioContext:
      "Athenian philosopher whose dialectical questioning challenged conventional wisdom, arguing that the unexamined life is not worth living.",
  },
  "viktor frankl": {
    era: "1905 – 1997, Austria",
    tradition: "Logotherapy & Existential Psychology",
    bioContext:
      "Neurologist, psychiatrist, and Holocaust survivor who argued that human beings are driven by a 'will to meaning,' capable of discovering purpose even under extreme suffering.",
  },
  "virginia woolf": {
    era: "1882 – 1941, United Kingdom",
    tradition: "Modernist Literature & Feminist Thought",
    bioContext:
      "English novelist and essayist whose pioneering stream-of-consciousness works examined the fluid nature of consciousness, social constraint, and intellectual independence.",
  },
  "james baldwin": {
    era: "1924 – 1987, United States",
    tradition: "Civil Rights & Moral Essayism",
    bioContext:
      "American essayist, novelist, and voice of moral clarity who interrogated racial oppression, systemic violence, and the psychological vulnerability required for genuine love.",
  },
  "albert einstein": {
    era: "1879 – 1955, Germany & United States",
    tradition: "Theoretical Physics & Humanist Philosophy",
    bioContext:
      "Theoretical physicist who transformed human understanding of space, time, and the cosmos, while advocating for intellectual wonder, pacifism, and humility before nature.",
  },
  "abraham lincoln": {
    era: "1809 – 1865, United States",
    tradition: "Democratic Statesmanship & Constitutional Union",
    bioContext:
      "16th President of the United States who preserved the Union during the American Civil War, advanced emancipation, and articulated enduring ideals of democratic government.",
  },
  "emily dickinson": {
    era: "1830 – 1886, United States",
    tradition: "American Poetry & Transcendental Solitude",
    bioContext:
      "American poet who lived in deliberate seclusion in Amherst, Massachusetts, writing concise, syntactically daring verses on mortality, nature, grief, and inner ecstasy.",
  },
  "simone de beauvoir": {
    era: "1908 – 1986, France",
    tradition: "Existentialism & Feminist Philosophy",
    bioContext:
      "French philosopher, writer, and feminist activist whose landmark work 'The Second Sex' investigated womanhood, existential freedom, and the ethics of ambiguity.",
  },
  "maya angelou": {
    era: "1928 – 2014, United States",
    tradition: "African American Literature & Human Rights",
    bioContext:
      "American poet, memoirist, and civil rights activist whose autobiographical writings celebrated resilient dignity, survival, and the transformative power of voice.",
  },
  "albert camus": {
    era: "1913 – 1960, France & Algeria",
    tradition: "Absurdism & Existential Ethics",
    bioContext:
      "French Algerian philosopher and novelist who formulated the philosophy of the Absurd, arguing that humans must actively defy life's meaninglessness through rebellion, freedom, and solidarity.",
  },
  "arthur schopenhauer": {
    era: "1788 – 1860, Germany",
    tradition: "Philosophical Pessimism & Aesthetics",
    bioContext:
      "German philosopher who identified the blind, insatiable 'will to live' as the root of human suffering, proposing aesthetic contemplation and ascetic compassion as avenues of relief.",
  },
}

function normalizeAuthorKey(name?: string | null): string {
  if (!name) return ""
  return name.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "")
}

function detectThematicKeywords(content: string, categoryName?: string | null): string[] {
  const normalized = `${content} ${categoryName || ""}`.toLowerCase()
  const themes: string[] = []

  if (/\b(control|mind|thought|discipline|desire|passion|peace|power|strength)\b/.test(normalized)) {
    themes.push("self-mastery")
  }
  if (/\b(action|work|labor|doing|begin|start|act|habit|deeds|discipline)\b/.test(normalized)) {
    themes.push("action")
  }
  if (/\b(fear|afraid|courage|brave|danger|bold|stand|stands|challenge|controversy)\b/.test(normalized)) {
    themes.push("courage")
  }
  if (/\b(truth|honest|lie|deceit|reality|wisdom|know|truth-force)\b/.test(normalized)) {
    themes.push("truth")
  }
  if (/\b(love|friend|heart|kindness|compassion|care|gentle|empathy)\b/.test(normalized)) {
    themes.push("compassion")
  }
  if (/\b(change|grow|transform|become|improve|renewal)\b/.test(normalized)) {
    themes.push("transformation")
  }
  if (/\b(free|freedom|liberty|chain|slave|choice|sovereignty)\b/.test(normalized)) {
    themes.push("freedom")
  }
  if (/\b(time|moment|present|today|hour|death|mortal|transient|ephemeral|waste)\b/.test(normalized)) {
    themes.push("temporality")
  }

  return themes
}

/**
 * Heuristic synthesizer generating humanized, high-quality, SEO-optimized contextual paragraphs
 */
export function generateHeuristicContextDraft(input: QuoteContextDraftInput): QuoteContextDraft {
  const content = input.content.trim()
  const authorName = input.authorName?.trim() || "Unknown Author"
  const categoryName = input.categoryName?.trim() || "General Wisdom"
  const sourceTitle = input.sourceTitle?.trim()

  const authorKey = normalizeAuthorKey(authorName)
  const matchedAuthor = Object.entries(AUTHOR_KNOWLEDGE_BASE).find(
    ([key]) => authorKey.includes(key) || key.includes(authorKey)
  )?.[1]

  const themes = detectThematicKeywords(content, categoryName)

  // 1. Meaning & Interpretation Synthesis (Sentence 1 strictly <= 160 chars for SEO Featured Snippets)
  let meaning = ""
  if (themes.includes("self-mastery")) {
    meaning =
      "This insight affirms that psychological freedom begins when one masters internal reactions rather than wrestling with external events. " +
      "By distinguishing between personal judgment and outside circumstances, the thinker isolates the true locus of human agency. " +
      "Lasting tranquility requires disciplined restraint over impulsive reactions, turning adversity into material for character."
  } else if (themes.includes("temporality")) {
    meaning =
      "This reflection highlights the urgency of the present moment and the finite nature of human existence. " +
      "Fulfillment comes not from postponing life for a distant future, but from inhabiting today with deliberate intention. " +
      "Awareness of mortality strips away trivial distractions, demanding clear moral choices before time runs out."
  } else if (themes.includes("courage")) {
    meaning =
      "This principle defines courage not as the absence of fear, but as the resolve to act rightly despite vulnerability. " +
      "Moral conviction is tested in conflict and hardship rather than during times of calm convenience. " +
      "The individual who chooses difficult integrity over easy compliance protects the dignity of the self and society."
  } else if (themes.includes("action")) {
    meaning =
      "This statement insists that authentic character is forged through deliberate action rather than passive speculation. " +
      "Intentions gain value only when translated into daily practice and persistent discipline. " +
      "By rejecting theoretical hesitation, the thinker urges direct engagement with reality to yield measurable growth."
  } else if (themes.includes("truth")) {
    meaning =
      "This insight argues that truth demands unwavering honesty with oneself and the courage to challenge comfortable illusions. " +
      "Genuine wisdom begins where intellectual pretense ends, requiring continuous examination of inherited assumptions. " +
      "Upholding clarity over convenient distortion anchors both individual integrity and meaningful community trust."
  } else if (themes.includes("compassion")) {
    meaning =
      "This passage shows that human connection thrives on active empathy and unconditional generosity of spirit. " +
      "Looking beyond self-interest reveals shared vulnerability, turning kindness into a transformative social bond. " +
      "True strength manifests in how gently one treats others, particularly when power allows indifference."
  } else if (themes.includes("freedom")) {
    meaning =
      "This quotation reveals that genuine freedom is an internal moral condition rather than the mere removal of physical restraint. " +
      "Autonomy requires freeing oneself from fear, irrational desires, and unexamined social conditioning. " +
      "Only by taking full responsibility for one's choices does a person attain lasting sovereignty over their life."
  } else if (themes.includes("transformation")) {
    meaning =
      "This reflection frames personal transformation as an intentional process of unlearning limitations and cultivating virtue. " +
      "Evolution demands confronting discomfort, acknowledging errors, and embracing the slow labor of renewal. " +
      "Character develops not by standing still, but through continuous self-overcoming and dedicated effort."
  } else {
    meaning =
      "This quotation challenges conventional assumptions, urging a clear alignment between core values and daily conduct. " +
      "By cutting through surface distractions, the passage addresses an enduring dilemma of ethical responsibility. " +
      "It offers a steady compass for self-reflection, inviting the reader to examine their own motives with rigorous clarity."
  }

  // 2. Historical Context Synthesis
  let historicalContext = ""
  if (matchedAuthor) {
    historicalContext = `${authorName} was prominent during ${matchedAuthor.era}, situated within the tradition of ${matchedAuthor.tradition}. ${matchedAuthor.bioContext}`
    if (sourceTitle) {
      historicalContext += ` This line is preserved in "${sourceTitle}", articulating the philosophical tensions and ethical inquiries of that period.`
    } else {
      historicalContext += ` This passage exemplifies the author's lifelong inquiry into resilience, personal responsibility, and moral clarity.`
    }
  } else {
    historicalContext = `Associated with ${authorName}${
      categoryName ? ` under the tradition of ${categoryName}` : ""
    }, this observation addresses an enduring human dilemma.`
    if (sourceTitle) {
      historicalContext += ` Documented in "${sourceTitle}", it reflects the cultural dialogue of its era, examining how individuals uphold integrity under social pressure.`
    } else {
      historicalContext += ` Such aphorisms historically functioned as intellectual touchstones, offering practical ethical guidance through periods of transition and uncertainty.`
    }
  }

  // 3. Modern Relevance Synthesis (Concrete contemporary grounding, zero corporate buzzwords)
  let modernRelevance = ""
  if (themes.includes("self-mastery") || themes.includes("temporality")) {
    modernRelevance =
      "Amid digital noise, notification overload, and constant pressures for external validation, this perspective acts as cognitive armor. " +
      "It directs attention away from uncontrollable distractions and back to intentional focus and mental clarity."
  } else if (themes.includes("courage") || themes.includes("freedom")) {
    modernRelevance =
      "In professional and civic environments where groupthink and risk-aversion dominate, this principle challenges individuals to practice independent judgment. " +
      "It calls for moral courage when organizational or cultural incentives encourage quiet conformity."
  } else if (themes.includes("action") || themes.includes("transformation")) {
    modernRelevance =
      "In an age prone to analysis paralysis and performative gestures, this counsel champions quiet, consistent execution. " +
      "It shifts the focus from rhetorical intentions to disciplined habits that generate substantive change."
  } else {
    modernRelevance =
      "Across modern leadership, personal relationships, and creative work, this insight provides a clear filter against superficial trends. " +
      "It demonstrates that while technology and culture change rapidly, the essential requirements of human purpose, discipline, and authentic integrity remain constant."
  }

  return {
    meaning: sanitizeHumanContextText(meaning),
    historicalContext: sanitizeHumanContextText(historicalContext),
    modernRelevance: sanitizeHumanContextText(modernRelevance),
  }
}

/**
 * Attempts to generate context via Google Gemini API if GEMINI_API_KEY is configured,
 * enforcing strict anti-AI humanization guardrails and SEO snippet constraints.
 * Falls back deterministically to the humanized heuristic synthesizer.
 */
export async function generateQuoteContextDraft(
  input: QuoteContextDraftInput
): Promise<ContextGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()

  if (apiKey) {
    try {
      const prompt = `You are a world-class literary scholar, philosophical editor, and quotation curator.
Analyze the following quotation and generate three comprehensive, humanized, SEO-optimized contextual dimensions in strict JSON:

Quotation details:
- Content: "${input.content}"
- Author: "${input.authorName || "Unknown"}"
- Category: "${input.categoryName || "General"}"
- Source: "${input.sourceTitle || "N/A"}"

DIMENSION SPECIFICATIONS:
1. "meaning" (Philosophical Interpretation & SEO Golden Snippet):
   - CRITICAL SEO REQUIREMENT: Sentence 1 MUST be a self-contained, high-intent answer explaining what the quote means in under 160 characters. Do NOT open with meta-commentary like "This quote means..." or "At its core...". State the core philosophical thesis immediately.
   - Follow with 1-2 sentences examining the underlying philosophical tension, psychological principle, or moral shift required.
2. "historicalContext" (Grounded Provenance):
   - 2-3 sentences explaining the historical era, the author's real-life circumstances (e.g. exile, military campaign, public struggle, imprisonment), and the specific primary work (${input.sourceTitle || "known writings"}) in which this thought emerged.
3. "modernRelevance" (Concrete Contemporary Application):
   - 2-3 sentences applying the wisdom to modern daily life, digital fatigue, ethical leadership, or mental resilience. Ground in specific scenarios rather than abstract platitudes.

CRITICAL ANTI-AI HUMANIZATION RULES:
- STRICTLY BANNED WORDS & CLICHÉS: DO NOT USE "at its core", "serves as a reminder", "in the realm of", "tapestry", "rich tapestry", "beacon", "testament", "multifaceted", "cornerstone", "delve", "sheds light on", "stands as a testament", "plays a crucial role", "in today's fast-paced world", "a powerful reminder", "profound reminder", "in conclusion".
- No formulaic participial openings ("Highlighting the importance of...", "Standing as..."). Use active, direct voice with dynamic cadence.

Return ONLY valid JSON with keys: "meaning", "historicalContext", "modernRelevance". No markdown formatting or extra text.`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 7500)

      const response = await callGeminiGenerateContent(apiKey, prompt, {
        temperature: 0.28,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const cleanJson = text.replace(/^```json/m, "").replace(/^```/m, "").trim()
          const parsed = JSON.parse(cleanJson)
          if (
            typeof parsed.meaning === "string" &&
            typeof parsed.historicalContext === "string" &&
            typeof parsed.modernRelevance === "string"
          ) {
            return {
              draft: {
                meaning: sanitizeHumanContextText(parsed.meaning),
                historicalContext: sanitizeHumanContextText(parsed.historicalContext),
                modernRelevance: sanitizeHumanContextText(parsed.modernRelevance),
              },
              provider: "gemini",
            }
          }
        }
      }
    } catch {
      // Fall through to heuristic synthesizer on API errors or timeouts
    }
  }

  // Graceful deterministic fallback
  return {
    draft: generateHeuristicContextDraft(input),
    provider: "heuristic",
  }
}

export type ContextDimensionField = "meaning" | "historicalContext" | "modernRelevance"

export interface StreamContextOptions {
  targetField?: ContextDimensionField
  signal?: AbortSignal
}

/**
 * Streams contextual interpretation, historical context, and modern relevance
 * in real-time using Server-Sent Events (SSE) with humanization guardrails.
 *
 * Emits:
 * - 'start': { provider, targetFields }
 * - 'delta': { field, text }
 * - 'complete': { field, fullText }
 * - 'done': { draft, provider }
 * - 'error': { message }
 */
export function streamQuoteContextDraft(
  input: QuoteContextDraftInput,
  options?: StreamContextOptions
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  const targetField = options?.targetField

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let isClosed = false
      const closeStream = () => {
        if (!isClosed) {
          isClosed = true
          try {
            controller.close()
          } catch {
            // Already closed
          }
        }
      }

      const sendEvent = (event: string, data: unknown) => {
        if (isClosed) return
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(payload))
        } catch {
          // Stream error or aborted
        }
      }

      if (options?.signal) {
        options.signal.addEventListener("abort", () => {
          closeStream()
        })
      }

      if (options?.signal?.aborted) {
        closeStream()
        return
      }

      // Helper to stream heuristic fallback smoothly
      const streamHeuristic = async () => {
        sendEvent("start", {
          provider: "heuristic",
          targetFields: targetField ? [targetField] : ["meaning", "historicalContext", "modernRelevance"],
        })

        const draft = generateHeuristicContextDraft(input)
        const fieldsToStream: ContextDimensionField[] = targetField
          ? [targetField]
          : ["meaning", "historicalContext", "modernRelevance"]

        for (const f of fieldsToStream) {
          if (options?.signal?.aborted || isClosed) break

          const fullText = draft[f]
          const chunks = fullText.match(/\S+\s*/g) || [fullText]

          let accumulated = ""
          for (const chunk of chunks) {
            if (options?.signal?.aborted || isClosed) break
            accumulated += chunk
            sendEvent("delta", { field: f, text: chunk })
            await new Promise((resolve) => setTimeout(resolve, 25))
          }

          sendEvent("complete", { field: f, fullText: accumulated.trim() })
          await new Promise((resolve) => setTimeout(resolve, 35))
        }

        if (!options?.signal?.aborted && !isClosed) {
          sendEvent("done", { draft, provider: "heuristic" })
        }
        closeStream()
      }

      if (!apiKey) {
        await streamHeuristic()
        return
      }

      // Try Gemini streaming
      try {
        let prompt: string
        if (targetField === "meaning") {
          prompt = `You are a scholarly philosophical editor and quotation curator.
Analyze the following quotation and generate a rigorous, humanized interpretation explaining the deeper message and principles (2-3 sentences).

Quotation details:
- Content: "${input.content}"
- Author: "${input.authorName || "Unknown"}"
- Category: "${input.categoryName || "General"}"
- Source: "${input.sourceTitle || "N/A"}"

CRITICAL RULES:
1. Sentence 1 MUST be a direct, self-contained SEO summary of what the quote means strictly under 160 characters. Do not use filler openings ("At its core...", "This quote means...").
2. BANNED CLICHÉS: Do NOT use "at its core", "serves as a reminder", "in the realm of", "tapestry", "beacon", "testament", "multifaceted", "cornerstone", "delve", or "sheds light on".
3. Output ONLY the raw meaning text directly with no markdown formatting, labels, or introductory phrases.`
        } else if (targetField === "historicalContext") {
          prompt = `You are a scholarly philosophical editor and quotation curator.
Analyze the following quotation and generate grounded author background, historical era, and origin context (2-3 sentences).

Quotation details:
- Content: "${input.content}"
- Author: "${input.authorName || "Unknown"}"
- Category: "${input.categoryName || "General"}"
- Source: "${input.sourceTitle || "N/A"}"

CRITICAL RULES:
1. Ground the context in historical circumstances (exile, warfare, public service) and cite the primary work "${input.sourceTitle || "writings"}" where relevant.
2. BANNED CLICHÉS: Do NOT use "at its core", "serves as a reminder", "in the realm of", "tapestry", "beacon", "testament", "multifaceted", "cornerstone", "delve", or "sheds light on".
3. Output ONLY the historical context text directly with no markdown formatting, labels, or introductory phrases.`
        } else if (targetField === "modernRelevance") {
          prompt = `You are a scholarly philosophical editor and quotation curator.
Analyze the following quotation and generate actionable contemporary applications for modern life, mental well-being, or leadership today (2-3 sentences).

Quotation details:
- Content: "${input.content}"
- Author: "${input.authorName || "Unknown"}"
- Category: "${input.categoryName || "General"}"
- Source: "${input.sourceTitle || "N/A"}"

CRITICAL RULES:
1. Provide concrete modern grounding (digital distraction, burnout, ethical leadership, independent thinking) without corporate platitudes.
2. BANNED CLICHÉS: Do NOT use "in today's fast-paced world", "serves as a reminder", "beacon", "testament", "at its core", or "realm".
3. Output ONLY the modern relevance text directly with no markdown formatting, labels, or introductory phrases.`
        } else {
          prompt = `You are a scholarly philosophical editor and quotation curator.
Analyze the following quotation and generate three comprehensive, humanized, SEO-optimized paragraphs.

Quotation details:
- Content: "${input.content}"
- Author: "${input.authorName || "Unknown"}"
- Category: "${input.categoryName || "General"}"
- Source: "${input.sourceTitle || "N/A"}"

CRITICAL RULES:
1. Under MEANING: Sentence 1 MUST directly define the meaning in under 160 characters (SEO Golden Snippet). No opening clichés.
2. BANNED CLICHÉS: Do NOT use "at its core", "serves as a reminder", "in the realm of", "tapestry", "beacon", "testament", "multifaceted", "cornerstone", "delve", "sheds light on", "stands as a testament", or "in today's fast-paced world".
3. Use active voice and avoid participial sentence openings ("Bridging...", "Standing at...").

Format your response strictly using these exact delimiters:
<<<MEANING>>>
(2-3 sentences explaining philosophical meaning and moral message; first sentence <= 160 chars)
<<<HISTORICAL_CONTEXT>>>
(2-3 sentences explaining author background, era, and historical setting)
<<<MODERN_RELEVANCE>>>
(2-3 sentences explaining contemporary everyday application and relevance)

Do not output any introductory or closing remarks outside these tags.`
        }

        const timeoutController = new AbortController()
        const timeoutId = setTimeout(() => timeoutController.abort(), 12000)

        const abortHandler = () => timeoutController.abort()
        options?.signal?.addEventListener("abort", abortHandler)

        const geminiRes = await callGeminiStreamGenerateContent(apiKey, prompt, {
          temperature: 0.28,
          signal: timeoutController.signal,
        })

        clearTimeout(timeoutId)
        options?.signal?.removeEventListener("abort", abortHandler)

        if (!geminiRes.ok || !geminiRes.body) {
          await streamHeuristic()
          return
        }

        sendEvent("start", {
          provider: "gemini",
          targetFields: targetField ? [targetField] : ["meaning", "historicalContext", "modernRelevance"],
        })

        const reader = geminiRes.body.getReader()
        const decoder = new TextDecoder()
        let sseBuffer = ""
        let pendingStreamBuffer = ""

        const collected: Record<ContextDimensionField, string> = {
          meaning: "",
          historicalContext: "",
          modernRelevance: "",
        }

        const completedFields = new Set<ContextDimensionField>()
        const markFieldComplete = (field: ContextDimensionField) => {
          if (!completedFields.has(field)) {
            completedFields.add(field)
            const cleanText = sanitizeHumanContextText(collected[field])
            sendEvent("complete", { field, fullText: cleanText })
          }
        }

        let currentField: ContextDimensionField | null = targetField || null
        const tagPattern = /<<<\s*(MEANING|HISTORICAL(?:_|\s+)CONTEXT|MODERN(?:_|\s+)RELEVANCE)\s*>>>/i

        while (true) {
          if (options?.signal?.aborted || isClosed) break

          const { done, value } = await reader.read()
          if (done) break

          sseBuffer += decoder.decode(value, { stream: true })
          const lines = sseBuffer.split("\n")
          sseBuffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine.startsWith("data:")) continue

            const jsonStr = trimmedLine.replace(/^data:\s*/, "")
            if (!jsonStr || jsonStr === "[DONE]") continue

            let textChunk = ""
            try {
              const parsed = JSON.parse(jsonStr)
              textChunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || ""
            } catch {
              continue
            }

            if (!textChunk) continue

            if (targetField) {
              collected[targetField] += textChunk
              sendEvent("delta", { field: targetField, text: textChunk })
            } else {
              pendingStreamBuffer += textChunk

              while (true) {
                const match = pendingStreamBuffer.match(tagPattern)
                if (!match || match.index === undefined) break

                const textBefore = pendingStreamBuffer.slice(0, match.index)
                if (currentField && textBefore) {
                  collected[currentField] += textBefore
                  sendEvent("delta", { field: currentField, text: textBefore })
                }
                if (currentField) {
                  markFieldComplete(currentField)
                }

                const rawTag = match[1].toUpperCase()
                if (rawTag.includes("MEANING")) {
                  currentField = "meaning"
                } else if (rawTag.includes("HISTORICAL")) {
                  currentField = "historicalContext"
                } else if (rawTag.includes("MODERN")) {
                  currentField = "modernRelevance"
                }

                pendingStreamBuffer = pendingStreamBuffer.slice(match.index + match[0].length)
              }

              // Emit safe tokens from pending buffer (leaving possible partial tags at end)
              const lastLtIndex = pendingStreamBuffer.lastIndexOf("<")
              if (lastLtIndex !== -1 && pendingStreamBuffer.length - lastLtIndex < 35) {
                const safeToEmit = pendingStreamBuffer.slice(0, lastLtIndex)
                pendingStreamBuffer = pendingStreamBuffer.slice(lastLtIndex)
                if (currentField && safeToEmit) {
                  collected[currentField] += safeToEmit
                  sendEvent("delta", { field: currentField, text: safeToEmit })
                }
              } else if (pendingStreamBuffer && lastLtIndex === -1) {
                if (currentField) {
                  collected[currentField] += pendingStreamBuffer
                  sendEvent("delta", { field: currentField, text: pendingStreamBuffer })
                }
                pendingStreamBuffer = ""
              }
            }
          }
        }

        // Flush remaining buffer at stream end
        if (!targetField && pendingStreamBuffer) {
          const finalMatch = pendingStreamBuffer.match(tagPattern)
          if (finalMatch && finalMatch.index !== undefined) {
            const textBefore = pendingStreamBuffer.slice(0, finalMatch.index)
            if (currentField && textBefore) {
              collected[currentField] += textBefore
              sendEvent("delta", { field: currentField, text: textBefore })
            }
            if (currentField) {
              markFieldComplete(currentField)
            }
            const rawTag = finalMatch[1].toUpperCase()
            if (rawTag.includes("MEANING")) currentField = "meaning"
            else if (rawTag.includes("HISTORICAL")) currentField = "historicalContext"
            else if (rawTag.includes("MODERN")) currentField = "modernRelevance"

            const textAfter = pendingStreamBuffer.slice(finalMatch.index + finalMatch[0].length)
            if (currentField && textAfter) {
              collected[currentField] += textAfter
              sendEvent("delta", { field: currentField, text: textAfter })
            }
          } else if (currentField && pendingStreamBuffer) {
            collected[currentField] += pendingStreamBuffer
            sendEvent("delta", { field: currentField, text: pendingStreamBuffer })
          }
          pendingStreamBuffer = ""
        }

        const fallback = generateHeuristicContextDraft(input)

        if (targetField) {
          const rawTarget = collected[targetField].trim()
          const sanitizedTarget = rawTarget
            ? sanitizeHumanContextText(rawTarget)
            : fallback[targetField]
          markFieldComplete(targetField)
          sendEvent("done", {
            draft: { [targetField]: sanitizedTarget },
            provider: "gemini",
          })
        } else {
          // Ensure all three dimensions have complete events exactly once
          const fields: ContextDimensionField[] = ["meaning", "historicalContext", "modernRelevance"]
          for (const f of fields) {
            if (!collected[f].trim()) {
              collected[f] = fallback[f]
              sendEvent("delta", { field: f, text: fallback[f] })
            }
            markFieldComplete(f)
          }

          sendEvent("done", {
            draft: {
              meaning: sanitizeHumanContextText(collected.meaning),
              historicalContext: sanitizeHumanContextText(collected.historicalContext),
              modernRelevance: sanitizeHumanContextText(collected.modernRelevance),
            },
            provider: "gemini",
          })
        }

        closeStream()
      } catch {
        if (!options?.signal?.aborted && !isClosed) {
          await streamHeuristic()
        } else {
          closeStream()
        }
      }
    },
  })
}
