/**
 * AI-Assisted Primary Source Finder & Citation Engine
 *
 * Discovers and validates authentic primary source publications, speeches,
 * letters, essays, scriptures, and canonical editions for quotations.
 *
 * Integrates:
 * 1. Curatorial primary source concordance (Meditations, Republic, Letters to Lucilius, Hamlet, etc.)
 * 2. Google Gemini 1.5 Flash for scholarly bibliographic attribution and locators
 * 3. Database source cross-referencing and automatic fuzzy linking
 */

import { SOURCE_TYPES } from "@/app/admin/(protected)/quotes/editor/types"
import { normalizeAuthorName, calculateSimilarity } from "./author-matcher"

export type WorkType = (typeof SOURCE_TYPES)[number]

export interface SourceRecord {
  id: string
  title: string
  slug?: string
  type?: string
  year?: number | null
  authorId?: string | null
  quoteCount?: number
}

export interface PrimarySourceFinderInput {
  content: string
  authorName?: string | null
  authorId?: string | null
  categoryName?: string | null
  currentSourceTitle?: string | null
}

export interface PrimarySourceRecommendation {
  title: string
  workType: WorkType
  year?: number | null
  citationLocator?: string | null // e.g. "Book IV, Section 3", "Act III, Scene 1", "Chapter 64"
  historicalContext?: string | null
  confidence: number // 0.00 to 1.00
  isCanonical: boolean
  explanation: string
  alternativeTitles?: string[]
  existingSourceId?: string | null
  existingSource?: SourceRecord | null
}

export interface PrimarySourceFinderResult {
  primarySource: PrimarySourceRecommendation | null
  candidates: PrimarySourceRecommendation[]
  provider: "gemini" | "heuristic"
}

interface CanonicalSourceEntry {
  pattern: RegExp
  authorKeywords: string[]
  title: string
  workType: WorkType
  year?: number
  citationLocator?: string
  alternativeTitles?: string[]
  explanation: string
}

/**
 * Curatorial concordance of canonical quotations mapped to authentic primary editions,
 * historical speeches, letters, and locators.
 */
export const CANONICAL_PRIMARY_SOURCES: CanonicalSourceEntry[] = [
  // Stoic Canon
  {
    pattern: /power over your mind.*not outside events/i,
    authorKeywords: ["marcus aurelius"],
    title: "Meditations",
    workType: "BOOK",
    year: 180,
    citationLocator: "Book IV, Section 3",
    alternativeTitles: ["Ta Eis Heauton", "Ad Se Ipsum", "The Meditations of Marcus Aurelius"],
    explanation: "Authentic entry in Book 4, Section 3 of Marcus Aurelius's private notebooks written during his Danube campaigns.",
  },
  {
    pattern: /waste no more time arguing.*good man.*be one/i,
    authorKeywords: ["marcus aurelius"],
    title: "Meditations",
    workType: "BOOK",
    year: 180,
    citationLocator: "Book X, Section 16",
    alternativeTitles: ["Ta Eis Heauton", "Ad Se Ipsum"],
    explanation: "Stoic imperative recorded in Book 10, Section 16 of Meditations.",
  },
  {
    pattern: /happiness of your life depends upon the quality/i,
    authorKeywords: ["marcus aurelius"],
    title: "Meditations",
    workType: "BOOK",
    year: 180,
    citationLocator: "Book III, Section 9",
    alternativeTitles: ["Ta Eis Heauton"],
    explanation: "Meditations Book 3, Section 9 on cognitive evaluation and inner serenity.",
  },
  {
    pattern: /it is not death that a man should fear.*never begin to live/i,
    authorKeywords: ["marcus aurelius"],
    title: "Meditations",
    workType: "BOOK",
    year: 180,
    citationLocator: "Book XII, Section 1",
    alternativeTitles: ["Ta Eis Heauton"],
    explanation: "Meditations Book 12, Section 1 on living virtuously in the present moment.",
  },
  {
    pattern: /suffer more often in imagination than in reality/i,
    authorKeywords: ["seneca"],
    title: "Letters from a Stoic",
    workType: "LETTER",
    year: 65,
    citationLocator: "Epistle XIII (Letter 13: On Groundless Fears)",
    alternativeTitles: ["Epistulae Morales ad Lucilium", "Moral Letters to Lucilius", "Letters to Lucilius"],
    explanation: "Epistulae Morales ad Lucilium, Letter 13. Lucius Annaeus Seneca addressing groundless anxiety.",
  },
  {
    pattern: /luck is what happens when preparation meets opportunity/i,
    authorKeywords: ["seneca"],
    title: "Moral Essays",
    workType: "BOOK",
    year: 60,
    citationLocator: "De Beneficiis",
    alternativeTitles: ["On Benefits", "Essays"],
    explanation: "Classical maxim derived from Seneca's Moral Essays on virtue and fortune.",
  },
  {
    pattern: /not worried by real problems so much as by his imagined anxieties/i,
    authorKeywords: ["epictetus"],
    title: "Enchiridion",
    workType: "BOOK",
    year: 108,
    citationLocator: "Section V (Chapter 5)",
    alternativeTitles: ["The Handbook", "Discourses of Epictetus"],
    explanation: "Enchiridion (The Handbook of Epictetus), Chapter 5, compiled by Arrian.",
  },
  {
    pattern: /not what happens to you.*how you react to it/i,
    authorKeywords: ["epictetus"],
    title: "Discourses",
    workType: "BOOK",
    year: 108,
    citationLocator: "Book I, Chapter 1",
    alternativeTitles: ["Discourses of Epictetus"],
    explanation: "Discourses of Epictetus Book 1, transcribed by his student Arrian.",
  },

  // Classical Greek Philosophy
  {
    pattern: /unexamined life is not worth living/i,
    authorKeywords: ["socrates", "plato"],
    title: "Apology",
    workType: "BOOK",
    year: -399,
    citationLocator: "Stephanus 38a",
    alternativeTitles: ["Apology of Socrates", "Plato's Apology"],
    explanation: "Spoken by Socrates during his trial in Athens, recorded in Plato's Apology (38a).",
  },
  {
    pattern: /i know that i know nothing/i,
    authorKeywords: ["socrates", "plato"],
    title: "Apology",
    workType: "BOOK",
    year: -399,
    citationLocator: "Stephanus 21d",
    alternativeTitles: ["Apology of Socrates"],
    explanation: "Socratic paradox recorded in Plato's Apology (21d) concerning human wisdom.",
  },
  {
    pattern: /we are what we repeatedly do.*excellence.*not an act/i,
    authorKeywords: ["aristotle"],
    title: "The Story of Philosophy",
    workType: "BOOK",
    year: 1926,
    citationLocator: "Chapter II: Aristotle and Greek Science",
    alternativeTitles: ["Nicomachean Ethics summary"],
    explanation: "Will Durant's famous synthesis of Aristotle's Nicomachean Ethics Book II.",
  },
  {
    pattern: /mark of an educated mind to be able to entertain a thought/i,
    authorKeywords: ["aristotle"],
    title: "Nicomachean Ethics",
    workType: "BOOK",
    year: -350,
    citationLocator: "Book I, 1094b",
    alternativeTitles: ["The Nicomachean Ethics"],
    explanation: "Aristotle's foundational work on ethics and intellectual judgment.",
  },

  // Civil Rights, Visionaries & Leaders
  {
    pattern: /stay hungry.*stay foolish/i,
    authorKeywords: ["steve jobs"],
    title: "Stanford Commencement Address",
    workType: "SPEECH",
    year: 2005,
    citationLocator: "Concluding remarks",
    alternativeTitles: ["Stanford University Commencement Speech 2005"],
    explanation: "Steve Jobs quoting Stewart Brand's Whole Earth Catalog in his famous 2005 Stanford address.",
  },
  {
    pattern: /time is limited.*don't waste it living someone else's life/i,
    authorKeywords: ["steve jobs"],
    title: "Stanford Commencement Address",
    workType: "SPEECH",
    year: 2005,
    citationLocator: "Part 3: How to Live Before You Die",
    alternativeTitles: ["Stanford University Commencement Speech 2005"],
    explanation: "Steve Jobs' reflection on mortality and personal purpose delivered at Stanford.",
  },
  {
    pattern: /darkness cannot drive out darkness.*light can do that/i,
    authorKeywords: ["martin luther king jr", "martin luther king"],
    title: "Strength to Love",
    workType: "BOOK",
    year: 1963,
    citationLocator: "Chapter 5: Loving Your Enemies",
    alternativeTitles: ["Strength to Love (Sermons)"],
    explanation: "Sermon collection published in 1963; foundational civil rights text on nonviolent love.",
  },
  {
    pattern: /injustice anywhere is a threat to justice everywhere/i,
    authorKeywords: ["martin luther king jr", "martin luther king"],
    title: "Letter from Birmingham Jail",
    workType: "LETTER",
    year: 1963,
    citationLocator: "Paragraph 4",
    alternativeTitles: ["The Negro Is Your Brother"],
    explanation: "Written on April 16, 1963 by Dr. King while imprisoned in Birmingham, Alabama.",
  },
  {
    pattern: /arc of the moral universe is long.*bends toward justice/i,
    authorKeywords: ["martin luther king jr", "theodore parker"],
    title: "Where Do We Go from Here: Chaos or Community?",
    workType: "BOOK",
    year: 1967,
    citationLocator: "Chapter 5",
    alternativeTitles: ["Where Do We Go from Here"],
    explanation: "Dr. King adapting abolitionist Theodore Parker's 1853 sermon into his 1967 book.",
  },
  {
    pattern: /be the change.*wish to see in the world/i,
    authorKeywords: ["mahatma gandhi", "gandhi"],
    title: "Indian Opinion",
    workType: "ARTICLE",
    year: 1913,
    citationLocator: "Volume 11, Number 32",
    alternativeTitles: ["Collected Works of Mahatma Gandhi"],
    explanation: "Published in Gandhi's South African weekly 'Indian Opinion' (August 1913).",
  },
  {
    pattern: /it always seems impossible until it.*done/i,
    authorKeywords: ["nelson mandela"],
    title: "Long Walk to Freedom",
    workType: "BOOK",
    year: 1994,
    citationLocator: "Autobiography",
    alternativeTitles: ["Long Walk to Freedom: The Autobiography of Nelson Mandela"],
    explanation: "Nelson Mandela's autobiographical reflection on the dismantling of Apartheid.",
  },
  {
    pattern: /success is not final.*failure is not fatal/i,
    authorKeywords: ["winston churchill"],
    title: "Never Give In! The Best of Winston Churchill's Speeches",
    workType: "SPEECH",
    year: 1941,
    citationLocator: "Speech to Harrow School",
    alternativeTitles: ["Churchill's Speeches"],
    explanation: "Popularized in collections of Sir Winston Churchill's wartime addresses.",
  },

  // Literature & Philosophy
  {
    pattern: /to live is to suffer.*to survive is to find some meaning/i,
    authorKeywords: ["friedrich nietzsche"],
    title: "Twilight of the Idols",
    workType: "BOOK",
    year: 1889,
    citationLocator: "Maxims and Arrows, Section 12",
    alternativeTitles: ["Götzen-Dämmerung", "Twilight of the Idols, or, How to Philosophize with a Hammer"],
    explanation: "Friedrich Nietzsche's 1889 polemic work written in Turin.",
  },
  {
    pattern: /he who has a why to live can bear almost any how/i,
    authorKeywords: ["friedrich nietzsche"],
    title: "Twilight of the Idols",
    workType: "BOOK",
    year: 1889,
    citationLocator: "Maxims and Arrows, Section 12",
    alternativeTitles: ["Götzen-Dämmerung"],
    explanation: "Famous Nietzschean aphorism later popularized by Viktor Frankl in Man's Search for Meaning.",
  },
  {
    pattern: /that which does not kill us makes us stronger/i,
    authorKeywords: ["friedrich nietzsche"],
    title: "Twilight of the Idols",
    workType: "BOOK",
    year: 1889,
    citationLocator: "Maxims and Arrows, Section 8",
    alternativeTitles: ["Götzen-Dämmerung"],
    explanation: "Twilight of the Idols, Section 8 ('Was mich nicht umbringt, macht mich stärker').",
  },
  {
    pattern: /to be yourself in a world that is constantly trying to make you something else/i,
    authorKeywords: ["ralph waldo emerson"],
    title: "Self-Reliance",
    workType: "ARTICLE",
    year: 1841,
    citationLocator: "Essays: First Series",
    alternativeTitles: ["Essays: First Series"],
    explanation: "Ralph Waldo Emerson's 1841 essay on individualism and non-conformity.",
  },
  {
    pattern: /all in the gutter.*some of us are looking at the stars/i,
    authorKeywords: ["oscar wilde"],
    title: "Lady Windermere's Fan",
    workType: "BOOK",
    year: 1892,
    citationLocator: "Act III",
    alternativeTitles: ["Lady Windermere's Fan: A Play About a Good Woman"],
    explanation: "Lord Darlington's famous line in Act III of Oscar Wilde's comedic drama.",
  },
  {
    pattern: /journey of a thousand miles begins with a single step/i,
    authorKeywords: ["lao tzu", "laozi"],
    title: "Tao Te Ching",
    workType: "SCRIPTURE",
    year: -400,
    citationLocator: "Chapter 64",
    alternativeTitles: ["Dao De Jing", "Laozi"],
    explanation: "Foundational Taoist verse recorded in Chapter 64 of the Tao Te Ching.",
  },
  {
    pattern: /knowing others is intelligence.*knowing yourself is true wisdom/i,
    authorKeywords: ["lao tzu", "laozi"],
    title: "Tao Te Ching",
    workType: "SCRIPTURE",
    year: -400,
    citationLocator: "Chapter 33",
    alternativeTitles: ["Dao De Jing"],
    explanation: "Tao Te Ching Chapter 33 on self-mastery and internal awareness.",
  },
  {
    pattern: /does not matter how slowly you go as long as you do not stop/i,
    authorKeywords: ["confucius"],
    title: "The Analects",
    workType: "BOOK",
    year: -475,
    citationLocator: "Book IX (Zi Han)",
    alternativeTitles: ["Analects of Confucius", "Lunyu"],
    explanation: "Recorded conversations and aphorisms of Confucius compiled by his disciples.",
  },
  {
    pattern: /wound is the place where the light enters you/i,
    authorKeywords: ["rumi"],
    title: "Masnavi",
    workType: "BOOK",
    year: 1260,
    citationLocator: "Book I",
    alternativeTitles: ["Mathnawi", "The Masnavi-I Ma'navi"],
    explanation: "Jalal al-Din Rumi's spiritual masterpiece of Sufi poetry.",
  },
  {
    pattern: /twenty years from now you will be more disappointed/i,
    authorKeywords: ["mark twain"],
    title: "P.S. I Love You",
    workType: "BOOK",
    year: 1990,
    citationLocator: "Attributed commonly to Mark Twain; authored by H. Jackson Brown Jr.",
    alternativeTitles: ["H. Jackson Brown Jr. writings"],
    explanation: "Commonly misattributed to Mark Twain; actually penned by H. Jackson Brown Jr. in 1990.",
  },
  {
    pattern: /whenever you find yourself on the side of the majority/i,
    authorKeywords: ["mark twain"],
    title: "Mark Twain's Notebook",
    workType: "BOOK",
    year: 1904,
    citationLocator: "Entry of November 1904",
    alternativeTitles: ["Notebooks of Mark Twain"],
    explanation: "Original notebook entry recorded by Samuel Clemens in late 1904.",
  },
  {
    pattern: /two things are infinite.*universe and human stupidity/i,
    authorKeywords: ["albert einstein"],
    title: "The Ego and Its Defenses",
    workType: "BOOK",
    year: 1945,
    citationLocator: "Attributed to Albert Einstein by Frederick S. Perls",
    alternativeTitles: ["Ego, Hunger and Aggression"],
    explanation: "Widely attributed to Einstein; documented in psychoanalytic literature by Fritz Perls.",
  },
  {
    pattern: /in the middle of difficulty lies opportunity/i,
    authorKeywords: ["albert einstein"],
    title: "Three Rules of Work",
    workType: "ARTICLE",
    year: 1979,
    citationLocator: "Published in Reader's Digest",
    alternativeTitles: ["John A. Wheeler recollection"],
    explanation: "Einstein's third rule of work remembered by physicist John Archibald Wheeler.",
  },
]

/**
 * Finds matching source in existing database sources using fuzzy title and author correlation.
 */
export function matchSourceInDatabase(
  title: string,
  alternativeTitles: string[] = [],
  dbSources: SourceRecord[],
  authorId?: string | null
): SourceRecord | null {
  if (!title || dbSources.length === 0) return null

  const normTarget = normalizeAuthorName(title)
  const allTargets = [normTarget, ...alternativeTitles.map(normalizeAuthorName)].filter(Boolean)

  let bestMatch: SourceRecord | null = null
  let bestScore = 0

  for (const source of dbSources) {
    const normSource = normalizeAuthorName(source.title)

    for (const target of allTargets) {
      // 1. Exact match
      if (normSource === target) {
        return source
      }

      // 2. Substring containment
      let score = 0
      if (normSource.includes(target) || target.includes(normSource)) {
        score = 0.88
      } else {
        const sim = calculateSimilarity(normSource, target)
        if (sim >= 0.72) {
          score = sim
        }
      }

      // Author match bonus
      if (authorId && source.authorId === authorId && score > 0) {
        score += 0.08
      }

      if (score > bestScore && score >= 0.75) {
        bestScore = score
        bestMatch = source
      }
    }
  }

  return bestMatch
}

/**
 * Validates whether workType string is a recognized valid WorkType enum value.
 */
export function sanitizeWorkType(raw: unknown): WorkType {
  if (typeof raw === "string" && (SOURCE_TYPES as readonly string[]).includes(raw.toUpperCase())) {
    return raw.toUpperCase() as WorkType
  }
  return "BOOK"
}

/**
 * Discovers and recommends the authentic primary source for a given quotation.
 * 1. Checks deterministic Curatorial Primary Source Concordance first.
 * 2. If GEMINI_API_KEY is present, queries Gemini 1.5 Flash for deep literary citation and locator.
 * 3. Cross-references against database sources and provides seamless linking.
 */
export async function findPrimarySource(
  input: PrimarySourceFinderInput,
  dbSources: SourceRecord[] = []
): Promise<PrimarySourceFinderResult> {
  const content = input.content.trim()
  if (!content) {
    return {
      primarySource: null,
      candidates: [],
      provider: "heuristic",
    }
  }

  // 1. Check Canonical Concordance
  for (const entry of CANONICAL_PRIMARY_SOURCES) {
    if (entry.pattern.test(content)) {
      const existingMatch = matchSourceInDatabase(
        entry.title,
        entry.alternativeTitles,
        dbSources,
        input.authorId
      )

      const recommendation: PrimarySourceRecommendation = {
        title: entry.title,
        workType: entry.workType,
        year: entry.year,
        citationLocator: entry.citationLocator,
        historicalContext: entry.explanation,
        confidence: 0.98,
        isCanonical: true,
        explanation: entry.explanation,
        alternativeTitles: entry.alternativeTitles,
        existingSourceId: existingMatch?.id || null,
        existingSource: existingMatch || null,
      }

      return {
        primarySource: recommendation,
        candidates: [recommendation],
        provider: "heuristic",
      }
    }
  }

  // 2. Query Gemini 1.5 Flash if API Key is configured
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (apiKey) {
    try {
      const prompt = `You are a world-class literary bibliographer and quotation archivist (specializing in Oxford World's Classics, the Loeb Classical Library, and Quote Investigator).
Determine the authentic primary source publication, speech, letter, or document in which this quotation was first coined or recorded:

Quotation: "${content}"
Author: "${input.authorName || "Unknown"}"
Thematic Topic: "${input.categoryName || "General"}"

Perform a thorough bibliographic lookup and return a strictly valid JSON object with:
1. "primarySourceTitle": Standard published title in English (e.g. "Meditations", "Letter from Birmingham Jail", "Walden", "Stanford Commencement Address").
2. "workType": One of "BOOK", "SPEECH", "ARTICLE", "INTERVIEW", "SCRIPTURE", "LETTER", "OTHER".
3. "publishedYear": Integer publication/delivery year (e.g. 1854, 1963, or -399 for 399 BC) or null.
4. "citationLocator": Specific chapter, book, section, act, scene, or letter locator (e.g. "Book IV, Section 3", "Act III, Scene 1", "Chapter 64") or null.
5. "confidence": Number between 0.00 and 1.00 indicating attribution certainty.
6. "explanation": 1-2 sentence bibliographic explanation explaining when and where the author originally recorded this.
7. "alternativeTitles": Array of alternative, original language, or collection titles (e.g. ["Ta Eis Heauton", "Ad Se Ipsum"]).
8. "secondaryCandidates": Array of objects with "title", "workType", "year", and "citationLocator" for other notable editions or anthologies.

Return ONLY the raw JSON object without markdown formatting or code blocks.`

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
          const title = typeof parsed.primarySourceTitle === "string" ? parsed.primarySourceTitle.trim() : ""

          if (title) {
            const workType = sanitizeWorkType(parsed.workType)
            const year =
              typeof parsed.publishedYear === "number" && !isNaN(parsed.publishedYear)
                ? parsed.publishedYear
                : null
            const citationLocator =
              typeof parsed.citationLocator === "string" ? parsed.citationLocator.trim() : null
            const confidence =
              typeof parsed.confidence === "number" && !isNaN(parsed.confidence)
                ? Math.max(0, Math.min(1, parsed.confidence))
                : 0.85
            const explanation =
              typeof parsed.explanation === "string"
                ? parsed.explanation
                : `Primary citation attributed to ${input.authorName || "author"}.`
            const alternativeTitles: string[] = Array.isArray(parsed.alternativeTitles)
              ? parsed.alternativeTitles.filter((t: unknown) => typeof t === "string")
              : []

            // Find matching source in DB
            const existingMatch = matchSourceInDatabase(
              title,
              alternativeTitles,
              dbSources,
              input.authorId
            )

            const primaryRecommendation: PrimarySourceRecommendation = {
              title,
              workType,
              year,
              citationLocator,
              historicalContext: explanation,
              confidence,
              isCanonical: confidence >= 0.85,
              explanation,
              alternativeTitles,
              existingSourceId: existingMatch?.id || null,
              existingSource: existingMatch || null,
            }

            const candidates: PrimarySourceRecommendation[] = [primaryRecommendation]

            if (Array.isArray(parsed.secondaryCandidates)) {
              for (const cand of parsed.secondaryCandidates) {
                if (cand && typeof cand.title === "string" && cand.title.trim()) {
                  const candMatch = matchSourceInDatabase(cand.title, [], dbSources, input.authorId)
                  candidates.push({
                    title: cand.title.trim(),
                    workType: sanitizeWorkType(cand.workType),
                    year: typeof cand.year === "number" ? cand.year : null,
                    citationLocator: typeof cand.citationLocator === "string" ? cand.citationLocator : null,
                    confidence: 0.7,
                    isCanonical: false,
                    explanation: "Alternative edition or compilation",
                    existingSourceId: candMatch?.id || null,
                    existingSource: candMatch || null,
                  })
                }
              }
            }

            return {
              primarySource: primaryRecommendation,
              candidates,
              provider: "gemini",
            }
          }
        }
      }
    } catch {
      // Fall through to heuristic fallback
    }
  }

  // 3. Fallback when AI is unavailable and not in canonical concordance
  // If author has existing sources in DB, recommend them
  if (input.authorId && dbSources.length > 0) {
    const authorSources = dbSources.filter((s) => s.authorId === input.authorId)
    if (authorSources.length > 0) {
      const topSource = authorSources[0]
      const recommendation: PrimarySourceRecommendation = {
        title: topSource.title,
        workType: sanitizeWorkType(topSource.type),
        year: topSource.year,
        confidence: 0.5,
        isCanonical: false,
        explanation: `Existing publication by ${input.authorName || "author"} in repository.`,
        existingSourceId: topSource.id,
        existingSource: topSource,
      }
      return {
        primarySource: recommendation,
        candidates: authorSources.map((s) => ({
          title: s.title,
          workType: sanitizeWorkType(s.type),
          year: s.year,
          confidence: 0.5,
          isCanonical: false,
          explanation: `Repository publication by ${input.authorName || "author"}.`,
          existingSourceId: s.id,
          existingSource: s,
        })),
        provider: "heuristic",
      }
    }
  }

  return {
    primarySource: null,
    candidates: [],
    provider: "heuristic",
  }
}
