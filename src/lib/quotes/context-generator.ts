/**
 * AI-Assisted Context Suggestion Engine
 *
 * Generates structured context drafts (meaning, historical context, and modern relevance)
 * for quotations. When GEMINI_API_KEY is configured, it leverages Google Gemini.
 * Otherwise, it executes a deterministic semantic heuristic synthesizer that incorporates
 * author biographies, philosophical traditions, and thematic categories.
 */

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
      "American essayist, lecturer, and poet who championed individualism, self-reliance, and spiritual communion with nature during 19th-century New England cultural renaissance.",
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
}

function normalizeAuthorKey(name?: string | null): string {
  if (!name) return ""
  return name.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "")
}

function detectThematicKeywords(content: string): string[] {
  const normalized = content.toLowerCase()
  const themes: string[] = []

  if (/\b(control|mind|thought|discipline|desire|passion|peace)\b/.test(normalized)) themes.push("self-mastery")
  if (/\b(action|work|labor|doing|begin|start|act|habit)\b/.test(normalized)) themes.push("action")
  if (/\b(fear|afraid|courage|brave|danger|bold)\b/.test(normalized)) themes.push("courage")
  if (/\b(truth|honest|lie|deceit|reality|wisdom|know)\b/.test(normalized)) themes.push("truth")
  if (/\b(love|friend|heart|kindness|compassion|care)\b/.test(normalized)) themes.push("compassion")
  if (/\b(change|grow|transform|become|improve)\b/.test(normalized)) themes.push("transformation")
  if (/\b(free|freedom|liberty|chain|slave|choice)\b/.test(normalized)) themes.push("freedom")
  if (/\b(time|moment|present|today|hour|death|mortal|transient|ephemeral)\b/.test(normalized)) themes.push("temporality")

  return themes
}

/**
 * Heuristic synthesizer generating comprehensive contextual paragraphs
 */
export function generateHeuristicContextDraft(input: QuoteContextDraftInput): QuoteContextDraft {
  const content = input.content.trim()
  const authorName = input.authorName?.trim() || "Unknown Author"
  const categoryName = input.categoryName?.trim() || "General Wisdom"
  const sourceTitle = input.sourceTitle?.trim()

  const authorKey = normalizeAuthorKey(authorName)
  const matchedAuthor = Object.entries(AUTHOR_KNOWLEDGE_BASE).find(([key]) =>
    authorKey.includes(key)
  )?.[1]

  const themes = detectThematicKeywords(content)
  const primaryTheme = themes[0] || "virtue and intentional living"

  // 1. Meaning & Interpretation Synthesis
  let meaning = `At its core, this quotation speaks directly to the virtue of ${primaryTheme}. `
  if (themes.includes("self-mastery")) {
    meaning += `It underscores the fundamental principle that true power resides in governing one's internal judgments and desires rather than reacting impulsively to external circumstance. `
  } else if (themes.includes("temporality")) {
    meaning += `It reflects on the fleeting nature of time and the urgency of living with clear purpose, reminding us that fulfillment is found in how consciously we inhabit the present moment. `
  } else if (themes.includes("courage")) {
    meaning += `It distinguishes authentic courage from the absence of fear, emphasizing that moral fortitude requires confronting discomfort in the service of what is right. `
  } else if (themes.includes("action")) {
    meaning += `It rejects passive contemplation in favor of deliberate, consistent action, highlighting that genuine character is demonstrated through deeds rather than rhetoric. `
  } else {
    meaning += `It encourages the reader to examine underlying assumptions, aligning thought and action with an enduring standard of integrity and clarity. `
  }
  meaning += `The author distills a nuanced human dilemma into an unambiguous moral imperative, providing a cognitive anchor for thoughtful reflection.`

  // 2. Historical Context Synthesis
  let historicalContext = ""
  if (matchedAuthor) {
    historicalContext = `${authorName} was prominent during the ${matchedAuthor.era}, situated within the tradition of ${matchedAuthor.tradition}. ${matchedAuthor.bioContext} `
    if (sourceTitle) {
      historicalContext += `This perspective emerges clearly in works such as "${sourceTitle}", reflecting the socio-philosophical tensions and moral inquiries of that era.`
    } else {
      historicalContext += `The passage captures the author's recurring inquiry into human resilience, personal responsibility, and ethical leadership.`
    }
  } else {
    historicalContext = `Associated with ${authorName}${
      categoryName ? ` within the realm of ${categoryName}` : ""
    }, this passage reflects a universal contemplative tradition. `
    if (sourceTitle) {
      historicalContext += `Recorded in "${sourceTitle}", it addresses the ethical and cultural expectations of its time, examining how individuals navigate societal pressure while preserving their values.`
    } else {
      historicalContext += `Historically, such aphorisms served as oral or literary touchstones across philosophical schools, intended to guide disciples and citizens through periods of uncertainty and moral transition.`
    }
  }

  // 3. Modern Relevance Synthesis
  let modernRelevance = `In our contemporary, hyper-connected era, this insight is especially poignant. `
  if (themes.includes("self-mastery") || themes.includes("temporality")) {
    modernRelevance += `Surrounded by digital noise, relentless notifications, and external validation traps, the quote serves as a vital safeguard against cognitive overload and reactive anxiety. It invites modern readers to reclaim mental clarity and intentional focus. `
  } else if (themes.includes("courage") || themes.includes("freedom")) {
    modernRelevance += `In modern professional, civic, and personal arenas where conformity is subtly rewarded, the advice challenges individuals to uphold psychological independence and champion ethical principles even under institutional pressure. `
  } else {
    modernRelevance += `Across leadership, personal development, and interpersonal relationships, it offers an actionable compass for cutting through superficial distractions to focus on what produces lasting fulfillment and mutual respect. `
  }
  modernRelevance += `It reminds us that while technological tools evolve rapidly, the fundamental challenges of human purpose, discipline, and authenticity remain unchanged.`

  return {
    meaning: meaning.trim(),
    historicalContext: historicalContext.trim(),
    modernRelevance: modernRelevance.trim(),
  }
}

/**
 * Attempts to generate context via Google Gemini API if GEMINI_API_KEY is configured,
 * otherwise safely falls back to the deterministic heuristic synthesizer.
 */
export async function generateQuoteContextDraft(
  input: QuoteContextDraftInput
): Promise<ContextGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()

  if (apiKey) {
    try {
      const prompt = `You are a scholarly philosophical editor and quotation curator.
Analyze the following quotation and generate three comprehensive, high-quality paragraphs in strict JSON format:
1. "meaning": Clear, rigorous philosophical interpretation explaining the deeper message and principles conveyed (around 2-3 sentences).
2. "historicalContext": Author background, era, literary/historical setting, and origin context (around 2-3 sentences).
3. "modernRelevance": Actionable contemporary application for modern life, mental well-being, or leadership in today's world (around 2-3 sentences).

Quotation details:
- Content: "${input.content}"
- Author: "${input.authorName || "Unknown"}"
- Category: "${input.categoryName || "General"}"
- Source: "${input.sourceTitle || "N/A"}"

Return ONLY valid JSON with keys: "meaning", "historicalContext", "modernRelevance". No markdown formatting or extra text.`

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
              temperature: 0.3,
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
          if (
            typeof parsed.meaning === "string" &&
            typeof parsed.historicalContext === "string" &&
            typeof parsed.modernRelevance === "string"
          ) {
            return {
              draft: {
                meaning: parsed.meaning.trim(),
                historicalContext: parsed.historicalContext.trim(),
                modernRelevance: parsed.modernRelevance.trim(),
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
