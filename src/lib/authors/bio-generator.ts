/**
 * AI-Assisted Author Bio Generator (Humanized, Literary & SEO-Optimized)
 *
 * Synthesizes compelling, human-centered author biographies and SEO metadata
 * without dry encyclopedic chronology or generic AI clichés.
 *
 * Supported features:
 * 1. Humanized narrative voice avoiding AI tropes ("tapestry", "beacon", "delve", "testament").
 * 2. Natural SEO integration with primary works, philosophical concepts, and search intent.
 * 3. Dual-format output: Full multi-paragraph biography + 150-char Google SERP snippet.
 * 4. Dual provider: Google Gemini 1.5/3.8 + Curatorial Knowledge Synthesizer fallback.
 * 5. Real-time token streaming via Server-Sent Events (SSE).
 */

import { callGeminiGenerateContent, callGeminiStreamGenerateContent } from "@/lib/gemini"

export type BioTone = "humanized" | "philosophical" | "punchy"
export type BioLength = "balanced" | "concise" | "comprehensive"

export interface AuthorBioInput {
  name: string
  profession?: string | null
  nationality?: string | null
  birthYear?: number | null
  deathYear?: number | null
  dateOfBirth?: string | null
  dateOfDeath?: string | null
  wikipediaUrl?: string | null
  existingBio?: string | null
  knownWorks?: string[]
  sampleQuotes?: string[]
  tone?: BioTone
  length?: BioLength
}

export interface AuthorBioResult {
  bio: string
  seoDescription: string
  keyThemes: string[]
  notableWorks: string[]
  provider: "gemini" | "curator"
  wordCount: number
}

// Banned robotic clichés for post-generation sanitization
const BANNED_AI_WORDS = [
  /\bdelve\b/gi,
  /\btapestry\b/gi,
  /\brich tapestry\b/gi,
  /\bbeacon\b/gi,
  /\btestament\b/gi,
  /\bmultifaceted\b/gi,
  /\bpivotal\b/gi,
  /\bin conclusion\b/gi,
  /\bit is important to note\b/gi,
  /\bit is worth noting\b/gi,
]

// Curated canonical knowledge base for premier thinkers
const CANONICAL_AUTHOR_KNOWLEDGE: Record<
  string,
  {
    bio: string
    seoDescription: string
    keyThemes: string[]
    notableWorks: string[]
  }
> = {
  "marcus aurelius": {
    bio: `Marcus Aurelius (121–180 AD) was the last of Rome’s "Five Good Emperors," yet history remembers him less as an imperial conqueror and more as an introspective sovereign wrestling with duty, mortality, and power. Stationed along the frozen Danube frontier during grueling military campaigns and an empire-wide plague, he penned personal private reflections in Greek never intended for publication—a spiritual workbook later titled Meditations.

Rather than offering abstract doctrine, Aurelius practiced Stoicism as daily cognitive armor. His writings confront the relentless friction of leadership, the vanity of fame, and the radical freedom found in mastering one’s own judgments rather than lamenting external circumstance. By viewing existence through cosmic perspective ("sub specie aeternitatis"), he cultivated profound inner tranquility without escaping worldly responsibility.

Today, his insights on emotional fortitude, resilience under duress, and integrity when unwatched serve as essential reading for modern leaders, thinkers, and anyone navigating cognitive overwhelm in a volatile world.`,
    seoDescription:
      "Explore the Stoic philosophy of Marcus Aurelius, Roman Emperor and author of Meditations. Read his timeless quotes on resilience, duty, and inner peace.",
    keyThemes: ["Stoic Resilience", "Dichotomy of Control", "Mortality (Memento Mori)", "Public Duty"],
    notableWorks: ["Meditations"],
  },
  seneca: {
    bio: `Lucius Annaeus Seneca (c. 4 BC – 65 AD), known simply as Seneca the Younger, lived at the volatile center of imperial Roman politics as a dramatist, senator, and advisor to Emperor Nero. His life was defined by dramatic contradiction: a philosophical advocate for modesty and detachment who accumulated immense wealth, and a voice of reason who ultimately met a forced suicide under a tyrannical regime.

Seneca’s enduring genius lies in his conversational epistolary prose, particularly his Letters from a Stoic (Epistulae Morales ad Lucilium). Addressing everyday anxieties—the dread of poverty, the agony of grief, the illusion of time shortage, and the poison of anger—he offered vivid psychological advice that reads with astonishing modern freshness. He argued that we suffer far more often in imagination than in reality.

His moral essays and letters bridge high philosophy and human vulnerability, offering a practical manual for cultivating equanimity amidst political peril and societal chaos.`,
    seoDescription:
      "Discover the wisdom of Seneca, Roman Stoic philosopher and statesman. Explore his essays, Letters from a Stoic, and enduring quotes on time and anxiety.",
    keyThemes: ["Brevity of Life", "Anxiety & Imagination", "Anger Management", "Tranquility of Mind"],
    notableWorks: ["Letters from a Stoic", "On the Brevity of Life", "On Anger", "On the Happy Life"],
  },
  "friedrich nietzsche": {
    bio: `Friedrich Nietzsche (1844–1900) remains one of the most provocative and misunderstood figures in Western intellectual history. Resigning his professorship at Basel due to chronic debilitating illness, the German philosopher lived nomadically through the Swiss Alps and Italian coastlines, channeling intense suffering into incandescent aphorisms that shattered Enlightenment complacency.

Nietzsche diagnosed the modern crisis of nihilism with startling prescience, proclaiming the "death of God" not as a triumph, but as a cultural earthquake demanding radical human revaluation. Rather than surrendering to despair, he championed "amor fati"—the fervent love of one's fate, including its anguish—and conceived the Übermensch as a creator who molds personal meaning through artistic discipline and self-overcoming.

Written with poetic fury and sharp psychological diagnostic precision, his works like Thus Spoke Zarathustra and Beyond Good and Evil continue to electrify contemporary debates on authenticity, creativity, and the courage to endure.`,
    seoDescription:
      "Read the biography and philosophical ideas of Friedrich Nietzsche, author of Thus Spoke Zarathustra. Discover his quotes on Amor Fati and self-overcoming.",
    keyThemes: ["Amor Fati", "The Will to Power", "Self-Overcoming", "Critique of Nihilism"],
    notableWorks: ["Thus Spoke Zarathustra", "Beyond Good and Evil", "The Gay Science", "On the Genealogy of Morals"],
  },
  "ralph waldo emerson": {
    bio: `Ralph Waldo Emerson (1803–1882) stood as the intellectual father of American Transcendentalism, igniting a cultural declaration of intellectual independence from European traditions. Stepping down from a Boston Unitarian pulpit to become a traveling lecturer and essayist, Emerson championed the divine potential within every individual conscience and the sacred vitality of the natural world.

In seminal essays like "Self-Reliance" and "Nature," Emerson challenged readers to abandon conformity, trust internal intuition, and reject secondhand beliefs. "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment," he famously observed. His philosophy was fundamentally democratic, urging each soul to recognize their direct communion with universal truth.

Emerson’s luminous prose shaped generations of thinkers—including his mentee Henry David Thoreau and poet Walt Whitman—and remains a touchstone of creative courage and spiritual self-determination.`,
    seoDescription:
      "Discover Ralph Waldo Emerson, American essayist, poet, and champion of Transcendentalism. Explore his quotes on Self-Reliance, nature, and creative courage.",
    keyThemes: ["Radical Self-Reliance", "Individual Conscience", "Communion with Nature", "Transcendentalism"],
    notableWorks: ["Self-Reliance", "Nature", "The Over-Soul", "Circles"],
  },
  "mahatma gandhi": {
    bio: `Mohandas Karamchand Gandhi (1869–1948), revered globally as Mahatma ("Great Soul"), transformed ancient ethical concepts into a revolutionary political force. Trained as a barrister in London and radicalized by institutional racial injustice in South Africa, Gandhi returned to India to lead the national movement against British colonial rule through pure nonviolent resistance.

His core doctrine of Satyagraha ("truth-force") rejected violence not out of passivity, but as active spiritual courage that sought to awaken the moral conscience of the oppressor. Coupled with Ahimsa (universal non-harm) and radical personal simplicity, his campaigns—from the historic Salt March to sustained nationwide civil disobedience—proved that principled moral solidarity could dismantle imperial dominion.

Gandhi’s philosophical legacy extended far beyond Indian independence, directly inspiring Martin Luther King Jr., Nelson Mandela, and civil liberties struggles across the globe.`,
    seoDescription:
      "Explore the life and philosophy of Mahatma Gandhi. Read his quotes on nonviolent resistance, Satyagraha, truth, and moral leadership in the modern world.",
    keyThemes: ["Satyagraha (Truth-Force)", "Ahimsa (Nonviolence)", "Ethical Leadership", "Simplicity & Self-Discipline"],
    notableWorks: ["The Story of My Experiments with Truth", "Hind Swaraj"],
  },
}

function normalizeKey(str?: string | null): string {
  if (!str) return ""
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Removes typical AI fluff and ensures natural human phrasing
 */
export function sanitizeHumanBioText(text: string): string {
  let cleaned = text.trim()
  for (const pattern of BANNED_AI_WORDS) {
    cleaned = cleaned.replace(pattern, "")
  }
  return cleaned
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/([ \t]*\r?\n){3,}/g, "\n\n")
    .trim()
}

/**
 * Deterministic fallback generator for author bios when AI API is unavailable
 */
export function generateCuratorAuthorBio(input: AuthorBioInput): AuthorBioResult {
  const norm = normalizeKey(input.name)

  for (const [key, record] of Object.entries(CANONICAL_AUTHOR_KNOWLEDGE)) {
    if (norm.includes(key) || key.includes(norm)) {
      return {
        bio: record.bio,
        seoDescription: record.seoDescription,
        keyThemes: record.keyThemes,
        notableWorks: record.notableWorks,
        provider: "curator",
        wordCount: record.bio.split(/\s+/).length,
      }
    }
  }

  // Construct structured heuristic narrative
  const role = input.profession?.trim() || "thinker, writer, and cultural figure"
  const nationality = input.nationality?.trim() ? `${input.nationality.trim()} ` : ""
  const era =
    input.birthYear && input.deathYear
      ? `(${input.birthYear}–${input.deathYear})`
      : input.birthYear
      ? `(b. ${input.birthYear})`
      : ""

  const p1 = `${input.name} ${era} stands as an influential ${nationality}${role} whose intellectual footprint continues to shape conversations on human purpose, resilience, and creative expression. Known for rigorous engagement with the pressing questions of their time, their work cuts through surface convention to examine how individuals cultivate integrity, navigate adversity, and contribute to the broader human condition.`

  const worksClause =
    input.knownWorks && input.knownWorks.length > 0
      ? `Across notable contributions including "${input.knownWorks.slice(0, 3).join('", "')}", their writings `
      : `Throughout their celebrated lectures, publications, and personal writings, their thought `

  const quotesClause =
    input.sampleQuotes && input.sampleQuotes.length > 0
      ? `Their reflections—addressing themes of discipline, moral clarity, and authentic conviction—exemplify a sustained commitment to intellectual honesty.`
      : `Their philosophy explores the delicate balance between personal autonomy and social responsibility, offering enduring insight for thoughtful living.`

  const p2 = `${worksClause}reveals an unwavering commitment to exploring fundamental human dilemmas. ${quotesClause}`

  const p3 = `Today, the timeless quotes and ideas of ${input.name} remain widely cited across literature, leadership, and personal philosophy, serving as a contemplative compass for readers navigating modern uncertainty.`

  const fullBio = `${p1}\n\n${p2}\n\n${p3}`

  const seoDescription = `Explore the biography, philosophy, and timeless quotes by ${input.name}${
    input.profession ? `, celebrated ${input.profession.toLowerCase()}` : ""
  }. Read curated thoughts on wisdom and life.`

  return {
    bio: sanitizeHumanBioText(fullBio),
    seoDescription: seoDescription.slice(0, 160),
    keyThemes: [
      `${input.name} Philosophy`,
      "Human Resilience",
      "Authentic Leadership",
      "Moral Integrity",
    ],
    notableWorks: input.knownWorks || [],
    provider: "curator",
    wordCount: fullBio.split(/\s+/).length,
  }
}

/**
 * Builds the high-context prompt for Gemini 1.5/3.8
 */
function buildAuthorBioPrompt(input: AuthorBioInput): string {
  const toneLabel =
    input.tone === "philosophical"
      ? "deep, rigorous, and intellectually analytical"
      : input.tone === "punchy"
      ? "vivid, fast-paced, hook-driven, and contemporary"
      : "humanized, literary, warm, and reflective (in the tradition of The Paris Review or The New Yorker)"

  const lengthInstruction =
    input.length === "concise"
      ? "around 100-140 words (1 rich paragraph)"
      : input.length === "comprehensive"
      ? "around 280-350 words (3 substantial paragraphs with double newlines)"
      : "around 180-240 words (2-3 balanced paragraphs with double newlines)"

  return `You are a world-class literary essayist, biographer, and digital editor.
Write a humanized, engaging, and SEO-optimized biography for:

Author: "${input.name}"
Profession: "${input.profession || "Thinker & Writer"}"
Nationality / Region: "${input.nationality || "Global"}"
Lifespan: "${input.birthYear ? input.birthYear : ""}${input.deathYear ? ` – ${input.deathYear}` : ""}"
Known Works: "${input.knownWorks?.join(", ") || "N/A"}"
Representative Themes: "${input.sampleQuotes?.slice(0, 3).join(" | ") || "N/A"}"

STYLE INSTRUCTIONS:
- Tone: ${toneLabel}
- Length: ${lengthInstruction}

CRITICAL RULES FOR HUMANIZATION & ANTI-AI FLUFF:
1. STRICTLY BANNED WORDS: DO NOT USE "delve", "tapestry", "rich tapestry", "beacon", "testament", "multifaceted", "pivotal", "in conclusion", "it is worth noting", or "journey".
2. No dry encyclopedia resumes: Do not start with "X was born on date and went to school". Start with their defining intellectual obsession, personal struggle, or the psychological question at the heart of their life.
3. Natural SEO Integration: Seamlessly embed their name, seminal works, and philosophical motifs so Google search algorithms recognize high topical authority without keyword stuffing.
4. Human Voice: Sound like an insightful human biographer who understands the author's flaws, triumphs, and lasting cultural resonance.

Output strictly valid JSON with this exact structure:
{
  "bio": "Multi-paragraph narrative biography text separated by double newlines (\\n\\n)",
  "seoDescription": "Strictly 140 to 160 characters search engine snippet summarizing who they are and why readers search for their quotes",
  "keyThemes": ["3 to 5 core thematic phrases"],
  "notableWorks": ["2 to 4 major publication or speech titles"]
}`
}

/**
 * Generates an author biography via Gemini or fallback synthesizer
 */
export async function generateAuthorBio(
  input: AuthorBioInput
): Promise<AuthorBioResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()

  if (apiKey) {
    try {
      const prompt = buildAuthorBioPrompt(input)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)

      const response = await callGeminiGenerateContent(apiKey, prompt, {
        temperature: 0.35,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const cleanJson = text.replace(/^```json/m, "").replace(/^```/m, "").trim()
          const parsed = JSON.parse(cleanJson)

          if (parsed && typeof parsed.bio === "string" && parsed.bio.trim().length > 50) {
            const bio = sanitizeHumanBioText(parsed.bio)
            const seoDescription =
              typeof parsed.seoDescription === "string"
                ? parsed.seoDescription.slice(0, 160)
                : `${input.name} biography, key works, and philosophical quotes.`
            const keyThemes = Array.isArray(parsed.keyThemes)
              ? parsed.keyThemes.slice(0, 6)
              : []
            const notableWorks = Array.isArray(parsed.notableWorks)
              ? parsed.notableWorks.slice(0, 6)
              : []

            return {
              bio,
              seoDescription,
              keyThemes,
              notableWorks,
              provider: "gemini",
              wordCount: bio.split(/\s+/).length,
            }
          }
        }
      }
    } catch {
      // Graceful fallback on API or JSON parsing error
    }
  }

  return generateCuratorAuthorBio(input)
}

/**
 * Streams real-time tokens of the generated biography using Server-Sent Events (SSE).
 */
export function streamAuthorBio(
  input: AuthorBioInput,
  options?: { signal?: AbortSignal }
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const apiKey = process.env.GEMINI_API_KEY?.trim()

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

      // Stream fallback
      const streamFallback = async () => {
        sendEvent("start", { provider: "curator" })
        const result = generateCuratorAuthorBio(input)

        const chunks = result.bio.match(/\S+\s*/g) || [result.bio]
        let accumulated = ""

        for (const chunk of chunks) {
          if (options?.signal?.aborted || isClosed) break
          accumulated += chunk
          sendEvent("delta", { text: chunk })
          await new Promise((resolve) => setTimeout(resolve, 20))
        }

        if (!options?.signal?.aborted && !isClosed) {
          sendEvent("complete_bio", { bio: accumulated.trim() })
          sendEvent("done", {
            bio: accumulated.trim(),
            seoDescription: result.seoDescription,
            keyThemes: result.keyThemes,
            notableWorks: result.notableWorks,
            provider: "curator",
            wordCount: accumulated.split(/\s+/).length,
          })
        }
        closeStream()
      }

      if (!apiKey) {
        await streamFallback()
        return
      }

      try {
        const streamPrompt = `You are a world-class literary biographer and essayist.
Write a humanized, engaging, and SEO-optimized biography for:
Author: "${input.name}"
Profession: "${input.profession || "Thinker & Writer"}"
Nationality: "${input.nationality || "Global"}"
Lifespan: "${input.birthYear ? input.birthYear : ""}${input.deathYear ? ` – ${input.deathYear}` : ""}"
Tone: ${input.tone || "humanized"}

RULES:
1. STRICTLY BANNED WORDS: Do not use "delve", "tapestry", "rich tapestry", "beacon", "testament", "multifaceted", "pivotal", "in conclusion".
2. Open with their core intellectual conflict or philosophical question.
3. Include natural paragraph breaks with double newlines.
4. Output ONLY the narrative biography text directly. Do not include markdown headers, quotes, or JSON formatting.`

        const timeoutController = new AbortController()
        const timeoutId = setTimeout(() => timeoutController.abort(), 12000)

        const abortHandler = () => timeoutController.abort()
        options?.signal?.addEventListener("abort", abortHandler)

        const geminiRes = await callGeminiStreamGenerateContent(apiKey, streamPrompt, {
          temperature: 0.35,
          signal: timeoutController.signal,
        })

        clearTimeout(timeoutId)
        options?.signal?.removeEventListener("abort", abortHandler)

        if (!geminiRes.ok || !geminiRes.body) {
          await streamFallback()
          return
        }

        sendEvent("start", { provider: "gemini" })

        const reader = geminiRes.body.getReader()
        const decoder = new TextDecoder()
        let sseBuffer = ""
        let accumulatedBio = ""

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

            accumulatedBio += textChunk
            sendEvent("delta", { text: textChunk })
          }
        }

        const cleanBio = sanitizeHumanBioText(accumulatedBio)
        const fallback = generateCuratorAuthorBio(input)

        const seoSnippet =
          cleanBio.slice(0, 150).replace(/\n+/g, " ").trim() + "..."

        sendEvent("complete_bio", { bio: cleanBio })
        sendEvent("done", {
          bio: cleanBio,
          seoDescription: fallback.seoDescription || seoSnippet,
          keyThemes: fallback.keyThemes,
          notableWorks: fallback.notableWorks,
          provider: "gemini",
          wordCount: cleanBio.split(/\s+/).length,
        })

        closeStream()
      } catch {
        if (!options?.signal?.aborted && !isClosed) {
          await streamFallback()
        } else {
          closeStream()
        }
      }
    },
  })
}
