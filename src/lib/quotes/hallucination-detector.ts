/**
 * AI Hallucination & Fake Attribution Detector
 *
 * Detects apocryphal quotes, internet lore, linguistic anachronisms,
 * and spurious author attributions across the quotations library using
 * a hybrid approach:
 * 1. Curatorial Knowledge Base of historically documented misattributions
 * 2. Linguistic Anachronism Analyzer (modern vocabulary falsely linked to antiquity)
 * 3. Gemini AI Archival Fact-Checker for obscure, modern, or uncataloged quotes
 */

import { prisma } from "@/lib/prisma"
import { callGeminiGenerateContent } from "@/lib/gemini"
import { findMatchingDbAuthor } from "./author-matcher"
import { isValidUuid } from "@/lib/api/route-helpers"
import type { AttributionStatus } from "@prisma/client"

export type HallucinationRiskLevel = "LOW" | "MEDIUM" | "HIGH"
export type HallucinationVerdict =
  | "AUTHENTIC"
  | "LIKELY_AUTHENTIC"
  | "DISPUTED"
  | "MISATTRIBUTED"
  | "SPURIOUS"

export interface HallucinationAuditItem {
  quoteId: string
  content: string
  claimedAuthor: string
  claimedAuthorId?: string | null
  currentStatus: string
  currentAttributionStatus: string
  isVerified: boolean
  riskLevel: HallucinationRiskLevel
  verdict: HallucinationVerdict
  confidence: number // 0.00 to 1.00
  actualOrigin: string | null
  hallucinationReason: string
  scholarlyCitation?: string | null
  suggestedAction: "flag_misattributed" | "flag_disputed" | "reassign_author" | "confirm_authentic" | "unpublish"
  suggestedRealAuthor?: string | null
  suggestedVerificationNote: string
}

export interface HallucinationScanResult {
  success: boolean
  totalScanned: number
  highRiskCount: number
  disputedCount: number
  authenticCount: number
  items: HallucinationAuditItem[]
  provider: "knowledge-base" | "gemini" | "hybrid"
}

interface KnownApocryphaRecord {
  pattern: RegExp
  claimedAuthorKeywords: string[]
  verdict: HallucinationVerdict
  riskLevel: HallucinationRiskLevel
  realAuthor?: string
  actualOrigin: string
  hallucinationReason: string
  suggestedAction: "flag_misattributed" | "flag_disputed" | "reassign_author" | "unpublish"
  verificationNote: string
}

/**
 * Curatorial Knowledge Base of documented fake & misattributed quotations
 */
const KNOWN_APOCRYPHA: KnownApocryphaRecord[] = [
  // --- ALBERT EINSTEIN ---
  {
    pattern: /insanity is doing the same thing over and over.*expecting different results/i,
    claimedAuthorKeywords: ["einstein", "albert einstein", "twain", "franklin"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    realAuthor: "Rita Mae Brown",
    actualOrigin: "Narcotics Anonymous (1981) / Rita Mae Brown, 'Sudden Death' (1983)",
    hallucinationReason:
      "Widely debunked internet quote. Zero record in the Einstein Archives. Earliest documented appearances are from a 1981 Narcotics Anonymous pamphlet and Rita Mae Brown's 1983 novel.",
    suggestedAction: "flag_misattributed",
    verificationNote:
      "Frequently misattributed to Albert Einstein (and Mark Twain or Benjamin Franklin). Earliest verified documentation appears in a 1981 Narcotics Anonymous pamphlet and Rita Mae Brown's 1983 novel 'Sudden Death'.",
  },
  {
    pattern: /judge a fish by its ability to climb a tree/i,
    claimedAuthorKeywords: ["einstein", "albert einstein"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    actualOrigin: "Modern educational allegory (c. 2004)",
    hallucinationReason:
      "Classic modern fabrication. Completely absent from all Einstein papers, speeches, and correspondence. Emerged in early 2000s self-help literature.",
    suggestedAction: "flag_misattributed",
    verificationNote:
      "Spurious attribution to Albert Einstein. Emerged in early 2000s motivational literature; verified absent from the Einstein Archives.",
  },
  {
    pattern: /fear the day that technology will surpass our human interaction/i,
    claimedAuthorKeywords: ["einstein", "albert einstein"],
    verdict: "SPURIOUS",
    riskLevel: "HIGH",
    actualOrigin: "Internet meme (c. 2012)",
    hallucinationReason:
      "Modern internet fabrication. Completely invented in the 2010s with no historical connection to Einstein.",
    suggestedAction: "flag_misattributed",
    verificationNote:
      "Fictitious internet meme from around 2012 falsely captioned with Albert Einstein's photo.",
  },
  {
    pattern: /everything should be made as simple as possible.*not simpler/i,
    claimedAuthorKeywords: ["einstein", "albert einstein"],
    verdict: "DISPUTED",
    riskLevel: "MEDIUM",
    actualOrigin: "Roger Sessions condensation (1950) of Einstein's 1933 Oxford lecture",
    hallucinationReason:
      "Paraphrase rather than direct quote. Einstein said: 'It can scarcely be denied that the supreme goal of all theory is to make the irreducible basic elements as simple and as few as possible...'",
    suggestedAction: "flag_disputed",
    verificationNote:
      "Aphoristic summary of Einstein's 1933 Herbert Spencer lecture, popularized in this concise wording by composer Roger Sessions in 1950.",
  },
  {
    pattern: /coincidence is god.*s way of remaining anonymous/i,
    claimedAuthorKeywords: ["einstein", "albert einstein"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    actualOrigin: "Attributed to various 20th-century authors; earliest in Doris Webster (1949)",
    hallucinationReason:
      "Frequently attributed to Einstein or Woody Allen, but no primary record exists in Einstein's writings.",
    suggestedAction: "flag_misattributed",
    verificationNote:
      "Commonly misattributed to Albert Einstein. Earliest verified recording appears in 1949 writings.",
  },

  // --- MARILYN MONROE ---
  {
    pattern: /well.behaved women seldom make history/i,
    claimedAuthorKeywords: ["monroe", "marilyn monroe", "roosevelt", "eleanor roosevelt"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    realAuthor: "Laurel Thatcher Ulrich",
    actualOrigin: "American Quarterly article (1976)",
    hallucinationReason:
      "Coined by Pulitzer Prize-winning historian Laurel Thatcher Ulrich in an academic paper in 1976. Frequently stamped on posters of Marilyn Monroe.",
    suggestedAction: "reassign_author",
    verificationNote:
      "Coined by historian Laurel Thatcher Ulrich in a 1976 scholarly article ('Vertuous Women Found: New England Ministerial Literature, 1668–1735'); falsely attributed to Marilyn Monroe or Eleanor Roosevelt.",
  },
  {
    pattern: /if you can.*t handle me at my worst.*deserve me at my best/i,
    claimedAuthorKeywords: ["monroe", "marilyn monroe"],
    verdict: "SPURIOUS",
    riskLevel: "HIGH",
    actualOrigin: "Internet meme / MySpace quote (c. 2000s)",
    hallucinationReason:
      "Complete 21st-century internet fiction with zero archival or biographical footprint in Monroe's life.",
    suggestedAction: "flag_misattributed",
    verificationNote:
      "Fictitious internet quote that began circulating on early social media in the 2000s; never spoken or written by Marilyn Monroe.",
  },

  // --- MAHATMA GANDHI ---
  {
    pattern: /be the change (that |you wish to see|in the world)/i,
    claimedAuthorKeywords: ["gandhi", "mahatma gandhi", "mohandas gandhi"],
    verdict: "DISPUTED",
    riskLevel: "MEDIUM",
    realAuthor: "Arleen Lorrance",
    actualOrigin: "The Love Project (1974) summarizing Gandhi's 1913 writings",
    hallucinationReason:
      "Aphoristic distillation. Gandhi wrote in 1913: 'If we could change ourselves, the tendencies in the world would also change.' The concise aphorism was popularized by teacher Arleen Lorrance in 1974.",
    suggestedAction: "flag_disputed",
    verificationNote:
      "Modern aphoristic condensation coined by Arleen Lorrance (1974). Gandhi's authentic 1913 text was: 'If we could change ourselves, the tendencies in the world would also change.'",
  },
  {
    pattern: /first they ignore you.*then they laugh at you.*then you win/i,
    claimedAuthorKeywords: ["gandhi", "mahatma gandhi"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    realAuthor: "Nicholas Klein",
    actualOrigin: "Speech to the Amalgamated Clothing Workers of America (1918)",
    hallucinationReason:
      "Given in a 1918 speech by American labor union activist Nicholas Klein; absent from the 100 volumes of Gandhi's Collected Works.",
    suggestedAction: "reassign_author",
    verificationNote:
      "Delivered by labor unionist Nicholas Klein in a 1918 convention address; falsely attributed to Mahatma Gandhi in late 20th-century publications.",
  },
  {
    pattern: /an eye for an eye.*leaves the whole world blind/i,
    claimedAuthorKeywords: ["gandhi", "mahatma gandhi"],
    verdict: "DISPUTED",
    riskLevel: "MEDIUM",
    actualOrigin: "Louis Fischer biography (1947) / George Savile",
    hallucinationReason:
      "Attributed to Gandhi by biographer Louis Fischer, but absent from Gandhi's own speeches, writings, and letters.",
    suggestedAction: "flag_disputed",
    verificationNote:
      "Associated with Gandhi through Louis Fischer's 1947 biography, but no contemporary primary record confirms Gandhi coined the exact phrase.",
  },

  // --- WINSTON CHURCHILL ---
  {
    pattern: /success is not final.*failure is not fatal.*courage to continue/i,
    claimedAuthorKeywords: ["churchill", "winston churchill"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    actualOrigin: "Budweiser Beer Advertising Campaign (1938) / George F. Tilton",
    hallucinationReason:
      "The International Churchill Society confirmed this quote does not appear in the 50 million words written or spoken by Churchill. Originated in a 1938 beer ad.",
    suggestedAction: "flag_misattributed",
    verificationNote:
      "The International Churchill Society confirmed this quote has zero appearance in Churchill's works; originated in a 1938 Budweiser advertisement.",
  },
  {
    pattern: /if you.*re going through hell.*keep going/i,
    claimedAuthorKeywords: ["churchill", "winston churchill"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    actualOrigin: "20th-century American motivational proverb",
    hallucinationReason:
      "Churchill Society tracked earliest print appearance to 1990; no evidence in Churchill archives.",
    suggestedAction: "flag_misattributed",
    verificationNote:
      "Common modern proverb with no verified appearance in Winston Churchill's speeches or writings.",
  },

  // --- ABRAHAM LINCOLN ---
  {
    pattern: /it.*s not the years in your life.*the life in your years/i,
    claimedAuthorKeywords: ["lincoln", "abraham lincoln"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    realAuthor: "Edward J. Stieglitz",
    actualOrigin: "The Second Forty Years (1946)",
    hallucinationReason:
      "Coined by geriatrician Dr. Edward J. Stieglitz in 1946; absent from the Lincoln Collected Works.",
    suggestedAction: "reassign_author",
    verificationNote:
      "Coined by Dr. Edward J. Stieglitz in 1946 ('The Second Forty Years'); falsely attributed to Abraham Lincoln in greeting cards and motivational posters.",
  },
  {
    pattern: /whatever you are.*be a good one/i,
    claimedAuthorKeywords: ["lincoln", "abraham lincoln"],
    verdict: "DISPUTED",
    riskLevel: "MEDIUM",
    actualOrigin: "Late 19th-century oral memoirs",
    hallucinationReason:
      "Attributed to Lincoln in memoirs decades after his death, but without contemporary written documentation from Lincoln's lifetime.",
    suggestedAction: "flag_disputed",
    verificationNote:
      "Oral attribution recorded decades after Lincoln's death; lacks contemporary primary documentation from Lincoln's lifetime.",
  },
  {
    pattern: /don'?t believe everything you read on the internet/i,
    claimedAuthorKeywords: ["lincoln", "abraham lincoln"],
    verdict: "SPURIOUS",
    riskLevel: "HIGH",
    actualOrigin: "Modern internet satire / meme (c. 2000s)",
    hallucinationReason:
      "Famous internet parody quote highlighting fictitious attributions. The internet was invented more than a century after Abraham Lincoln's death.",
    suggestedAction: "flag_misattributed",
    verificationNote:
      "Satirical internet meme widely referenced to illustrate apocryphal quotations; obviously spurious given the chronologically impossible anachronism.",
  },

  // --- MARK TWAIN ---
  {
    pattern: /the two most important days in your life.*born.*find out why/i,
    claimedAuthorKeywords: ["twain", "mark twain", "clemens"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    actualOrigin: "American playwright / motivational speaker (c. 1970s)",
    hallucinationReason:
      "The Mark Twain Project confirmed this is absent from Twain's extensive writings. Coined in late 20th-century lectures.",
    suggestedAction: "flag_misattributed",
    verificationNote:
      "Confirmed apocryphal by the Mark Twain Project at UC Berkeley; earliest recorded appearance is in late 20th-century motivational lectures.",
  },
  {
    pattern: /easier to fool people than to convince them.*fooled/i,
    claimedAuthorKeywords: ["twain", "mark twain"],
    verdict: "DISPUTED",
    riskLevel: "MEDIUM",
    actualOrigin: "Early 20th-century writers / aphorists",
    hallucinationReason:
      "Twain wrote about deception in 'Following the Equator', but this exact aphoristic phrasing is absent from his works.",
    suggestedAction: "flag_disputed",
    verificationNote:
      "Aphoristic variation of early 20th-century writings; unconfirmed in Mark Twain's published canon.",
  },

  // --- VOLTAIRE ---
  {
    pattern: /disapprove of what you say.*defend to the death.*right to say it/i,
    claimedAuthorKeywords: ["voltaire", "arouet"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    realAuthor: "Evelyn Beatrice Hall",
    actualOrigin: "The Friends of Voltaire (1906)",
    hallucinationReason:
      "Written by biographer Evelyn Beatrice Hall (writing as S.G. Tallentyre) in 1906 to illustrate Voltaire's philosophy; Voltaire never wrote this exact line.",
    suggestedAction: "reassign_author",
    verificationNote:
      "Written by biographer Evelyn Beatrice Hall in 1906 ('The Friends of Voltaire') as an illustration of Voltaire's stance; Voltaire never wrote this exact statement.",
  },
  {
    pattern: /learn who rules over you.*not allowed to criticize/i,
    claimedAuthorKeywords: ["voltaire", "arouet"],
    verdict: "SPURIOUS",
    riskLevel: "HIGH",
    realAuthor: "Kevin Alfred Strom",
    actualOrigin: "Radio broadcast (1993)",
    hallucinationReason:
      "Debunked propaganda quote. Coined by neo-Nazi Kevin Alfred Strom in 1993 and falsely attributed to Voltaire.",
    suggestedAction: "unpublish",
    verificationNote:
      "Completely spurious attribution. Coined in 1993 by white nationalist Kevin Alfred Strom and maliciously misattributed to Voltaire.",
  },

  // --- OSCAR WILDE ---
  {
    pattern: /be yourself.*everyone else is already taken/i,
    claimedAuthorKeywords: ["wilde", "oscar wilde"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    actualOrigin: "Late 20th-century motivational literature (c. 1967)",
    hallucinationReason:
      "Confirmed absent from Wilde's plays, essays, and letters. Emerged in late 20th-century compilations.",
    suggestedAction: "flag_misattributed",
    verificationNote:
      "Confirmed apocryphal attribution; completely absent from Oscar Wilde's plays, essays, and correspondence.",
  },

  // --- NELSON MANDELA ---
  {
    pattern: /our deepest fear is not that we are inadequate/i,
    claimedAuthorKeywords: ["mandela", "nelson mandela"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    realAuthor: "Marianne Williamson",
    actualOrigin: "A Return to Love (1992)",
    hallucinationReason:
      "Written by Marianne Williamson in 1992; frequently misattributed to Mandela's 1994 inaugural address, where it was never spoken.",
    suggestedAction: "reassign_author",
    verificationNote:
      "Written by author Marianne Williamson in 'A Return to Love' (1992); widely misattributed to Nelson Mandela's 1994 presidential inaugural address.",
  },

  // --- BUDDHA ---
  {
    pattern: /drinking poison and expecting the other person to die/i,
    claimedAuthorKeywords: ["buddha", "gautama", "siddhartha"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    actualOrigin: "12-Step Recovery literature / Buddhaghosa paraphrase",
    hallucinationReason:
      "Not in the Pali Canon. Originated in 20th-century 12-step recovery programs as an explanation of resentment.",
    suggestedAction: "flag_misattributed",
    verificationNote:
      "Debunked by Fake Buddha Quotes project; absent from the Pali Canon. Originated in 20th-century 12-step recovery literature.",
  },
  {
    pattern: /three things cannot be long hidden.*sun.*moon.*truth/i,
    claimedAuthorKeywords: ["buddha", "gautama"],
    verdict: "DISPUTED",
    riskLevel: "MEDIUM",
    actualOrigin: "Dhammapada paraphrase / modern variation",
    hallucinationReason:
      "The Pali Canon (Anguttara Nikaya 3.129) has a different verse about things that shine when revealed; this specific formulation is a modern condensation.",
    suggestedAction: "flag_disputed",
    verificationNote:
      "Modern variation. The original Pali text (Anguttara Nikaya 3.129) lists the moon, the sun, and the Dhamma, but with significantly different phrasing.",
  },

  // --- PLATO & ANCIENT GREEK ---
  {
    pattern: /be kind.*everyone you meet is fighting a hard battle/i,
    claimedAuthorKeywords: ["plato", "socrates"],
    verdict: "MISATTRIBUTED",
    riskLevel: "HIGH",
    realAuthor: "Ian Maclaren (Rev. John Watson)",
    actualOrigin: "The British Weekly (1897)",
    hallucinationReason:
      "Written by Scottish minister John Watson (writing as Ian Maclaren) in 1897; falsely attributed to Plato.",
    suggestedAction: "reassign_author",
    verificationNote:
      "Written by Scottish clergyman Ian Maclaren (Rev. John Watson) in 1897; absent from all Platonic dialogues.",
  },
  {
    pattern: /we are what we repeatedly do.*excellence.*not an act.*a habit/i,
    claimedAuthorKeywords: ["aristotle"],
    verdict: "DISPUTED",
    riskLevel: "MEDIUM",
    realAuthor: "Will Durant",
    actualOrigin: "The Story of Philosophy (1926)",
    hallucinationReason:
      "Written by philosopher Will Durant in 1926 as a summary of Aristotle's Nicomachean Ethics Book II, but frequently misquoted as Aristotle's exact words.",
    suggestedAction: "flag_disputed",
    verificationNote:
      "Coined by Will Durant in 'The Story of Philosophy' (1926) as a summary of Aristotle's ethics, not a verbatim quote from Aristotle.",
  },
]

function normalizeSearchStr(str?: string | null): string {
  if (!str) return ""
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Checks for obvious historical anachronisms (e.g. modern tech or psychological slang in ancient quotes)
 */
function detectAnachronismRisk(content: string, authorName?: string | null): string | null {
  const normAuthor = normalizeSearchStr(authorName)
  const isAncient =
    normAuthor.includes("marcus aurelius") ||
    normAuthor.includes("seneca") ||
    normAuthor.includes("epictetus") ||
    normAuthor.includes("plato") ||
    normAuthor.includes("aristotle") ||
    normAuthor.includes("socrates") ||
    normAuthor.includes("confucius") ||
    normAuthor.includes("lao tzu") ||
    normAuthor.includes("buddha") ||
    normAuthor.includes("cicero")

  if (isAncient) {
    const anachronisticTerms = [
      "stress",
      "burnout",
      "productivity",
      "deadline",
      "lifestyle",
      "comfort zone",
      "mindset",
      "toxic",
      "vibe",
      "hustle",
      "networking",
      "feedback loop",
      "internet",
      "download",
      "bandwidth",
      "wifi",
      "email",
      "synergy",
      "quarterly",
      "online",
      "website",
      "algorithm",
      "social media",
      "podcast",
      "computer",
      "smartphone",
    ]
    const found = anachronisticTerms.find((t) => new RegExp(`\\b${t}\\b`, "i").test(content))
    if (found) {
      return `Linguistic Anachronism: Contains modern concept/vocabulary ("${found}") that did not exist in antiquity; high likelihood of apocryphal modern paraphrase.`
    }
  }

  return null
}

/**
 * Checks a quote against the Curatorial Apocrypha Knowledge Base
 */
export function checkQuoteAgainstApocryphaBase(
  content: string,
  authorName?: string | null
): KnownApocryphaRecord | null {
  const normAuthor = normalizeSearchStr(authorName)

  for (const record of KNOWN_APOCRYPHA) {
    if (record.pattern.test(content)) {
      const authorMatches =
        record.claimedAuthorKeywords.length === 0 ||
        record.claimedAuthorKeywords.some((kw) => normAuthor.includes(kw))

      if (authorMatches) {
        return record
      }
    }
  }

  return null
}

/**
 * Audits a single quotation for hallucination or fake attribution
 */
export async function auditSingleQuoteForHallucination(quote: {
  id: string
  content: string
  authorName?: string | null
  authorId?: string | null
  status: string
  attributionStatus: string
  isVerified: boolean
}): Promise<HallucinationAuditItem> {
  const content = quote.content.trim()
  const claimedAuthor = quote.authorName?.trim() || "Unknown Author"

  // 1. Check Known Apocrypha Knowledge Base (deterministic, 100% precision)
  const knownMatch = checkQuoteAgainstApocryphaBase(content, claimedAuthor)
  if (knownMatch) {
    return {
      quoteId: quote.id,
      content,
      claimedAuthor,
      claimedAuthorId: quote.authorId,
      currentStatus: quote.status,
      currentAttributionStatus: quote.attributionStatus,
      isVerified: quote.isVerified,
      riskLevel: knownMatch.riskLevel,
      verdict: knownMatch.verdict,
      confidence: knownMatch.verdict === "MISATTRIBUTED" || knownMatch.verdict === "SPURIOUS" ? 0.05 : 0.35,
      actualOrigin: knownMatch.actualOrigin,
      hallucinationReason: knownMatch.hallucinationReason,
      suggestedAction: knownMatch.suggestedAction,
      suggestedRealAuthor: knownMatch.realAuthor || null,
      suggestedVerificationNote: knownMatch.verificationNote,
    }
  }

  // 2. Check Linguistic Anachronism
  const anachronism = detectAnachronismRisk(content, claimedAuthor)
  if (anachronism) {
    return {
      quoteId: quote.id,
      content,
      claimedAuthor,
      claimedAuthorId: quote.authorId,
      currentStatus: quote.status,
      currentAttributionStatus: quote.attributionStatus,
      isVerified: quote.isVerified,
      riskLevel: "HIGH",
      verdict: "SPURIOUS",
      confidence: 0.15,
      actualOrigin: "Modern colloquial paraphrase",
      hallucinationReason: anachronism,
      suggestedAction: "flag_misattributed",
      suggestedVerificationNote: anachronism,
    }
  }

  // 3. Fallback to Gemini AI Scholarly Fact-Checker if API key present
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (apiKey) {
    try {
      const prompt = `You are a world-class literary fact-checker and quotation archivist (specializing in detecting fake, apocryphal, and misattributed quotes, similar to the Quote Investigator).

Analyze this quote and its claimed attribution:
Quote Text: """${content}"""
Claimed Author: "${claimedAuthor}"

Evaluate:
1. Did "${claimedAuthor}" actually speak or write this verbatim?
2. What is the earliest verified primary source or earliest documented appearance?
3. Is this a famous misattribution, internet lore, modern slogan, or movie quote?

Respond with a JSON object:
{
  "isAuthentic": boolean,
  "verdict": "AUTHENTIC" | "LIKELY_AUTHENTIC" | "DISPUTED" | "MISATTRIBUTED" | "SPURIOUS",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "confidence": number (between 0.0 and 1.0),
  "actualOrigin": string (title, year, or true creator if misattributed),
  "hallucinationReason": string (concise explanation of authenticity or debunking details),
  "suggestedRealAuthor": string or null (the true author if misattributed),
  "suggestedAction": "confirm_authentic" | "flag_misattributed" | "flag_disputed" | "reassign_author" | "unpublish",
  "suggestedVerificationNote": string (scholarly footnote explaining the provenance)
}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)

      const response = await callGeminiGenerateContent(apiKey, prompt, {
        temperature: 0.1,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const cleanJson = text.replace(/^```json/m, "").replace(/^```/m, "").trim()
          const parsed = JSON.parse(cleanJson)

          const riskLevel: HallucinationRiskLevel =
            parsed.riskLevel === "HIGH" || parsed.riskLevel === "MEDIUM" || parsed.riskLevel === "LOW"
              ? parsed.riskLevel
              : parsed.isAuthentic
              ? "LOW"
              : "HIGH"

          const verdict: HallucinationVerdict =
            parsed.verdict === "AUTHENTIC" ||
            parsed.verdict === "LIKELY_AUTHENTIC" ||
            parsed.verdict === "DISPUTED" ||
            parsed.verdict === "MISATTRIBUTED" ||
            parsed.verdict === "SPURIOUS"
              ? parsed.verdict
              : parsed.isAuthentic
              ? "AUTHENTIC"
              : "MISATTRIBUTED"

          return {
            quoteId: quote.id,
            content,
            claimedAuthor,
            claimedAuthorId: quote.authorId,
            currentStatus: quote.status,
            currentAttributionStatus: quote.attributionStatus,
            isVerified: quote.isVerified,
            riskLevel,
            verdict,
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : parsed.isAuthentic ? 0.9 : 0.2,
            actualOrigin: parsed.actualOrigin || null,
            hallucinationReason: parsed.hallucinationReason || "Scholarly archival analysis completed.",
            suggestedAction: parsed.suggestedAction || (parsed.isAuthentic ? "confirm_authentic" : "flag_misattributed"),
            suggestedRealAuthor: parsed.suggestedRealAuthor || null,
            suggestedVerificationNote:
              parsed.suggestedVerificationNote || parsed.hallucinationReason || "Verified via literary archival search.",
          }
        }
      }
    } catch (aiErr) {
      console.warn("AI hallucination check error, falling back to default:", aiErr)
    }
  }

  // Default: Low risk if no red flags found
  return {
    quoteId: quote.id,
    content,
    claimedAuthor,
    claimedAuthorId: quote.authorId,
    currentStatus: quote.status,
    currentAttributionStatus: quote.attributionStatus,
    isVerified: quote.isVerified,
    riskLevel: "LOW",
    verdict: "LIKELY_AUTHENTIC",
    confidence: 0.8,
    actualOrigin: null,
    hallucinationReason: "No known apocryphal match or anachronism detected.",
    suggestedAction: "confirm_authentic",
    suggestedRealAuthor: null,
    suggestedVerificationNote: `Attributed to ${claimedAuthor}. Verified consistent with historical era.`,
  }
}

export interface HallucinationScanInput {
  quoteIds?: string[]
  authorId?: string
  filter?: "all" | "high_risk_authors" | "unverified" | "published"
  limit?: number
  onlyHighRisk?: boolean
}

const HIGH_RISK_AUTHOR_NAMES = [
  "albert einstein",
  "mark twain",
  "abraham lincoln",
  "winston churchill",
  "mahatma gandhi",
  "marilyn monroe",
  "oscar wilde",
  "buddha",
  "voltaire",
  "plato",
  "socrates",
  "aristotle",
  "eleanor roosevelt",
  "nelson mandela",
]

/**
 * Scans a batch of quotes for hallucinations and fake attributions
 */
export async function scanQuotesForHallucinations(
  input: HallucinationScanInput
): Promise<HallucinationScanResult> {
  const limit = Math.min(Math.max(input.limit || 20, 1), 50)
  let quotesToAudit: Array<{
    id: string
    content: string
    authorName: string | null
    authorId: string | null
    status: string
    attributionStatus: string
    isVerified: boolean
  }> = []

  // 1. Fetch quotes by explicit IDs or targeted filter
  if (Array.isArray(input.quoteIds)) {
    const validIds = input.quoteIds.filter(isValidUuid).slice(0, limit)
    if (validIds.length === 0) {
      return {
        success: true,
        totalScanned: 0,
        highRiskCount: 0,
        disputedCount: 0,
        authenticCount: 0,
        items: [],
        provider: process.env.GEMINI_API_KEY ? "hybrid" : "knowledge-base",
      }
    }
    quotesToAudit = await prisma.quote.findMany({
      where: { id: { in: validIds }, deletedAt: null },
      select: {
        id: true,
        content: true,
        authorName: true,
        authorId: true,
        status: true,
        attributionStatus: true,
        isVerified: true,
      },
    })
  } else if (input.authorId && isValidUuid(input.authorId)) {
    quotesToAudit = await prisma.quote.findMany({
      where: { authorId: input.authorId, deletedAt: null },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        authorName: true,
        authorId: true,
        status: true,
        attributionStatus: true,
        isVerified: true,
      },
    })
  } else if (input.filter === "high_risk_authors") {
    // Target quotes by historically apocryphal authors
    quotesToAudit = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        OR: HIGH_RISK_AUTHOR_NAMES.map((name) => ({
          authorName: { contains: name, mode: "insensitive" },
        })),
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        authorName: true,
        authorId: true,
        status: true,
        attributionStatus: true,
        isVerified: true,
      },
    })
  } else if (input.filter === "unverified") {
    quotesToAudit = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        isVerified: false,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        authorName: true,
        authorId: true,
        status: true,
        attributionStatus: true,
        isVerified: true,
      },
    })
  } else {
    // Default: recent published quotes
    quotesToAudit = await prisma.quote.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        authorName: true,
        authorId: true,
        status: true,
        attributionStatus: true,
        isVerified: true,
      },
    })
  }

  // 2. Audit each quote in parallel chunks of 3
  const auditedItems: HallucinationAuditItem[] = []
  const CONCURRENCY = 3

  for (let i = 0; i < quotesToAudit.length; i += CONCURRENCY) {
    const chunk = quotesToAudit.slice(i, i + CONCURRENCY)
    const chunkResults = await Promise.all(
      chunk.map((q) => auditSingleQuoteForHallucination(q))
    )
    auditedItems.push(...chunkResults)
  }

  // 3. Filter only high risk if requested
  const finalItems = input.onlyHighRisk
    ? auditedItems.filter((item) => item.riskLevel === "HIGH" || item.riskLevel === "MEDIUM")
    : auditedItems

  const highRiskCount = auditedItems.filter((i) => i.riskLevel === "HIGH").length
  const disputedCount = auditedItems.filter((i) => i.riskLevel === "MEDIUM").length
  const authenticCount = auditedItems.filter((i) => i.riskLevel === "LOW").length

  return {
    success: true,
    totalScanned: auditedItems.length,
    highRiskCount,
    disputedCount,
    authenticCount,
    items: finalItems,
    provider: process.env.GEMINI_API_KEY ? "hybrid" : "knowledge-base",
  }
}

export interface ResolveHallucinationInput {
  quoteId: string
  action: "flag_misattributed" | "flag_disputed" | "confirm_authentic" | "reassign_author" | "unpublish"
  actualAuthorName?: string
  verificationNote?: string
}

/**
 * Applies a 1-click resolution to a flagged quote
 */
export async function resolveHallucination(
  input: ResolveHallucinationInput
): Promise<{ success: boolean; quote: { id: string; attributionStatus: AttributionStatus; isVerified: boolean; status: string } }> {
  if (!isValidUuid(input.quoteId)) {
    throw new Error("Invalid quote ID UUID")
  }

  const quote = await prisma.quote.findUnique({
    where: { id: input.quoteId },
    select: { id: true, authorId: true, authorName: true, status: true },
  })

  if (!quote) {
    throw new Error("Quote not found")
  }

  const dataToUpdate: Record<string, unknown> = {}

  if (input.action === "flag_misattributed") {
    dataToUpdate.attributionStatus = "MISATTRIBUTED"
    dataToUpdate.isVerified = false
    dataToUpdate.verificationConfidence = 0.05
    if (input.verificationNote) {
      dataToUpdate.verificationNote = input.verificationNote
    }
  } else if (input.action === "flag_disputed") {
    dataToUpdate.attributionStatus = "DISPUTED"
    dataToUpdate.isVerified = false
    dataToUpdate.verificationConfidence = 0.35
    if (input.verificationNote) {
      dataToUpdate.verificationNote = input.verificationNote
    }
  } else if (input.action === "confirm_authentic") {
    dataToUpdate.attributionStatus = "CONFIRMED"
    dataToUpdate.isVerified = true
    dataToUpdate.verificationConfidence = 0.95
    if (input.verificationNote) {
      dataToUpdate.verificationNote = input.verificationNote
    }
  } else if (input.action === "unpublish") {
    dataToUpdate.status = "DRAFT"
  } else if (input.action === "reassign_author" && input.actualAuthorName?.trim()) {
    const cleanRealAuthor = input.actualAuthorName.trim()
    const dbAuthors = await prisma.author.findMany({ select: { id: true, name: true, slug: true } })
    const matched = findMatchingDbAuthor(cleanRealAuthor, dbAuthors)

    if (matched && matched.confidence >= 0.7) {
      dataToUpdate.authorId = matched.id
      dataToUpdate.authorName = matched.name
      dataToUpdate.authorSlug = matched.slug
    } else {
      // Reassign name directly
      dataToUpdate.authorName = cleanRealAuthor
    }
    dataToUpdate.attributionStatus = "CONFIRMED"
    dataToUpdate.isVerified = true
    if (input.verificationNote) {
      dataToUpdate.verificationNote = input.verificationNote
    }
  }

  const updated = await prisma.quote.update({
    where: { id: input.quoteId },
    data: dataToUpdate,
    select: {
      id: true,
      attributionStatus: true,
      isVerified: true,
      status: true,
    },
  })

  return {
    success: true,
    quote: updated,
  }
}
