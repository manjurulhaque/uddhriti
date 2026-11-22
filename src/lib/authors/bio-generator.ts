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
import { extractAuthorMetaDescription } from "./seo"

export type BioTone = "humanized" | "philosophical" | "punchy"
export type BioLength = "balanced" | "concise" | "comprehensive"
export type BioPerspective = "literary" | "crucible" | "modern" | "paradox"

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
  perspective?: BioPerspective
  // RAG Grounding & Internal Linking
  primaryQuote?: {
    content: string
    slug?: string | null
    sourceTitle?: string | null
  }
  linkedWorks?: Array<{
    title: string
    slug: string
  }>
  linkedCategories?: Array<{
    name: string
    slug: string
  }>
  authorityGroundingSummary?: string | null
}

export interface AuthorFaqItem {
  question: string
  answer: string
}

export interface CompanionThinkers {
  influences: string[]
  influenced: string[]
  contrasts: string[]
}

export interface AuthorBioResult {
  bio: string
  thesis: string
  crucible: string
  seoDescription: string
  keyThemes: string[]
  notableWorks: string[]
  companionThinkers: CompanionThinkers
  faqs: AuthorFaqItem[]
  provider: "gemini" | "curator"
  wordCount: number
}

// Banned robotic clichés and subtle AI tells with contextual, fluent human replacements
// that avoid dropping words or creating missing sentence parts.
const HUMAN_PHRASE_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  // 1. Phrasal tropes with verbs & prepositions
  { pattern: /\b(?:stands?|serves?)\s+as\s+a\s+testament\s+to\b/gi, replacement: "demonstrates" },
  { pattern: /\b(?:is|are)\s+a\s+testament\s+to\b/gi, replacement: "reflects" },
  { pattern: /\btestament\s+to\b/gi, replacement: "reflection of" },
  { pattern: /\btestament\b/gi, replacement: "evidence" },

  { pattern: /\bserves?\s+as\s+a\s+reminder\s+that\b/gi, replacement: "reminds us that" },
  { pattern: /\bserves?\s+as\s+a\s+reminder\s+of\b/gi, replacement: "highlights" },
  { pattern: /\bserving\s+as\s+a\s+reminder\b/gi, replacement: "illustrating" },
  { pattern: /\bserves?\s+as\s+a\s+reminder\b/gi, replacement: "reminds us" },
  { pattern: /\ba\s+powerful\s+reminder\s+of\b/gi, replacement: "a clear reflection of" },
  { pattern: /\ba\s+poignant\s+reminder\s+of\b/gi, replacement: "a moving reflection of" },

  { pattern: /\bdelves?\s+into\b/gi, replacement: "explores" },
  { pattern: /\bdelving\s+into\b/gi, replacement: "exploring" },
  { pattern: /\bdelved\s+into\b/gi, replacement: "explored" },
  { pattern: /\bdelve\b/gi, replacement: "look" },

  { pattern: /\b(?:a|the)\s+rich\s+tapestry\s+of\b/gi, replacement: "the depth of" },
  { pattern: /\brich\s+tapestry\b/gi, replacement: "depth" },
  { pattern: /\btapestry\s+of\b/gi, replacement: "variety of" },
  { pattern: /\btapestry\b/gi, replacement: "tradition" },

  { pattern: /\b(?:a|the)\s+beacon\s+of\s+hope\b/gi, replacement: "a source of hope" },
  { pattern: /\b(?:a|the)\s+beacon\s+of\b/gi, replacement: "a guide for" },
  { pattern: /\bbeacons?\b/gi, replacement: "guide" },

  { pattern: /\bmultifaceted\b/gi, replacement: "wide-ranging" },

  { pattern: /\bpivotal\s+role\b/gi, replacement: "central role" },
  { pattern: /\bpivotal\s+moment\b/gi, replacement: "turning point" },
  { pattern: /\bpivotal\b/gi, replacement: "crucial" },

  { pattern: /\b(?:a|the)\s+cornerstone\s+of\b/gi, replacement: "a foundation of" },
  { pattern: /\bcornerstones?\s+of\b/gi, replacement: "foundations of" },
  { pattern: /\bcornerstones?\b/gi, replacement: "foundation" },

  { pattern: /\bquintessentially\b/gi, replacement: "characteristically" },
  { pattern: /\bquintessential\b/gi, replacement: "defining" },

  { pattern: /\bunwavering\b/gi, replacement: "steadfast" },

  { pattern: /\b(?:an?\s+)?indelible\s+mark\s+on\b/gi, replacement: "a lasting influence on" },
  { pattern: /\bindelible\s+mark\b/gi, replacement: "lasting influence" },

  { pattern: /\bdynamic\s+interplay\b/gi, replacement: "interaction" },
  { pattern: /\benduring\s+legacy\b/gi, replacement: "lasting influence" },
  { pattern: /\betched\s+into\b/gi, replacement: "embedded in" },

  { pattern: /\bin\s+the\s+realm\s+of\b/gi, replacement: "in" },
  { pattern: /\brealms?\s+of\b/gi, replacement: "domains of" },
  { pattern: /\brealms?\b/gi, replacement: "world" },

  { pattern: /\bin\s+conclusion,?\s*/gi, replacement: "" },
  { pattern: /\bit\s+is\s+(?:important|worth)\s+noting\s+(?:that\s+)?/gi, replacement: "" },
]

// Curated canonical knowledge base for premier thinkers
const CANONICAL_AUTHOR_KNOWLEDGE: Record<
  string,
  {
    bio: string
    thesis: string
    crucible: string
    seoDescription: string
    keyThemes: string[]
    notableWorks: string[]
    companionThinkers: CompanionThinkers
    faqs: AuthorFaqItem[]
  }
> = {
  "marcus aurelius": {
    bio: `Marcus Aurelius (121–180 AD) was the last of Rome’s "Five Good Emperors," yet history remembers him less as an imperial conqueror and more as an introspective sovereign wrestling with duty, mortality, and power. Stationed along the frozen Danube frontier during grueling military campaigns and an empire-wide plague, he penned personal private reflections in Greek never intended for publication—a spiritual workbook later titled Meditations.

Rather than offering abstract doctrine, Aurelius practiced Stoicism as daily cognitive armor. His writings confront the relentless friction of leadership, the vanity of fame, and the radical freedom found in mastering one’s own judgments rather than lamenting external circumstance. By viewing existence through cosmic perspective ("sub specie aeternitatis"), he cultivated profound inner tranquility without escaping worldly responsibility.

Today, his insights on emotional fortitude, resilience under duress, and integrity when unwatched serve as essential reading for modern leaders, thinkers, and anyone navigating cognitive overwhelm in a volatile world.`,
    thesis:
      "True serenity is found not by retreating from public duty, but by mastering one's internal perception of external chaos.",
    crucible:
      "The Danube Campaigns & Antonine Plague (166–180 CE): Stationed along a frozen military frontier while governing an empire ravaged by pestilence, he kept private journal reminders to practice justice, patience, and unyielding self-command.",
    seoDescription:
      "Explore the Stoic philosophy of Marcus Aurelius, Roman Emperor and author of Meditations. Read his timeless quotes on resilience, duty, and inner peace.",
    keyThemes: ["Stoic Resilience", "Dichotomy of Control", "Mortality (Memento Mori)", "Public Duty"],
    notableWorks: ["Meditations"],
    companionThinkers: {
      influences: ["Epictetus", "Junius Rusticus", "Cleanthes"],
      influenced: ["Michel de Montaigne", "James Stockdale", "Thomas More"],
      contrasts: ["Epicurus", "Friedrich Nietzsche", "Niccolò Machiavelli"],
    },
    faqs: [
      {
        question: "What was Marcus Aurelius's core Stoic philosophy?",
        answer:
          "Marcus Aurelius practiced late Roman Stoicism, focusing on duty, the dichotomy of control, accepting mortality, and mastering personal judgment rather than lamenting external circumstance.",
      },
      {
        question: "Why did Marcus Aurelius write Meditations?",
        answer:
          "Meditations was Marcus's private morning journal (originally titled 'To Himself'), written during military campaigns along the Danube to hold himself accountable to virtue while governing an empire.",
      },
      {
        question: "What did Marcus Aurelius teach about handling adversity and difficult people?",
        answer:
          "He advised meeting hostility with calm empathy, recognizing that wrongdoers act out of ignorance of good, and remembering that external actions cannot harm your moral integrity unless you assent to them.",
      },
      {
        question: "How did Marcus Aurelius view mortality and Memento Mori?",
        answer:
          "He viewed death as a natural cosmic process that strips away pretense, reminding himself daily that life is brief so as to infuse every present action with gratitude, justice, and moral urgency.",
      },
    ],
  },
  seneca: {
    bio: `Lucius Annaeus Seneca (c. 4 BC – 65 AD), known simply as Seneca the Younger, lived at the volatile center of imperial Roman politics as a dramatist, senator, and advisor to Emperor Nero. His life was defined by dramatic contradiction: a philosophical advocate for modesty and detachment who accumulated immense wealth, and a voice of reason who ultimately met a forced suicide under a tyrannical regime.

Seneca’s enduring genius lies in his conversational epistolary prose, particularly his Letters from a Stoic (Epistulae Morales ad Lucilium). Addressing everyday anxieties—the dread of poverty, the agony of grief, the illusion of time shortage, and the poison of anger—he offered vivid psychological advice that reads with astonishing modern freshness. He argued that we suffer far more often in imagination than in reality.

His moral essays and letters bridge high philosophy and human vulnerability, offering a practical manual for cultivating equanimity amidst political peril and societal chaos.`,
    thesis:
      "We suffer far more often in imagination than in reality, and true freedom begins with deliberate mastery over finite time and destructive impulses.",
    crucible:
      "Exile to Corsica & Nero's Imperial Court (41–65 AD): Banished to a rocky Mediterranean island for eight years before returning to advise an increasingly tyrannical emperor, Seneca wrestled with the high-stakes friction between philosophical ideals and mortal survival.",
    seoDescription:
      "Discover the wisdom of Seneca, Roman Stoic philosopher and statesman. Explore his essays, Letters from a Stoic, and enduring quotes on time and anxiety.",
    keyThemes: ["Brevity of Life", "Anxiety & Imagination", "Anger Management", "Tranquility of Mind"],
    notableWorks: ["Letters from a Stoic", "On the Brevity of Life", "On Anger", "On the Happy Life"],
    companionThinkers: {
      influences: ["Attalus", "Posidonius", "Zeno of Citium"],
      influenced: ["Michel de Montaigne", "Arthur Schopenhauer", "Ralph Waldo Emerson"],
      contrasts: ["Epicurus", "Diogenes the Cynic"],
    },
    faqs: [
      {
        question: "What are Seneca's most celebrated philosophical teachings?",
        answer:
          "Seneca taught that humans suffer far more in imagination than in reality, that time is our most precious non-renewable asset, and that practical wisdom lies in moderating destructive emotions.",
      },
      {
        question: "How did Seneca reconcile wealth with Stoic detachment?",
        answer:
          "Seneca viewed wealth as a 'preferred indifferent'—acceptable to possess and use wisely, provided one remains morally unattached and prepared to lose it without anguish.",
      },
      {
        question: "What is the core message of Seneca's 'On the Brevity of Life'?",
        answer:
          "Seneca argued that life is not inherently short, but rather wasted through trivial pursuits and procrastination; we only live a tiny fraction of our lifespan if we spend it fulfilling external expectations.",
      },
      {
        question: "How did Seneca advise overcoming anxiety and anger?",
        answer:
          "He recommended delaying immediate emotional reactions, mentally rehearsing potential misfortunes in advance (premeditatio malorum) to disarm fear, and conducting nightly self-examinations.",
      },
    ],
  },
  "friedrich nietzsche": {
    bio: `Friedrich Nietzsche (1844–1900) remains one of the most provocative and misunderstood figures in Western intellectual history. Resigning his professorship at Basel due to chronic debilitating illness, the German philosopher lived nomadically through the Swiss Alps and Italian coastlines, channeling intense suffering into incandescent aphorisms that shattered Enlightenment complacency.

Nietzsche diagnosed the modern crisis of nihilism with startling prescience, proclaiming the "death of God" not as a triumph, but as a cultural earthquake demanding radical human revaluation. Rather than surrendering to despair, he championed "amor fati"—the fervent love of one's fate, including its anguish—and conceived the Übermensch as a creator who molds personal meaning through artistic discipline and self-overcoming.

Written with poetic fury and sharp psychological diagnostic precision, his works like Thus Spoke Zarathustra and Beyond Good and Evil continue to electrify contemporary debates on authenticity, creativity, and the courage to endure.`,
    thesis:
      "Meaning is not discovered in transcendent dogmas, but forged through radical self-overcoming, artistic courage, and the passionate love of one's fate (Amor Fati).",
    crucible:
      "Chronic Illness & Alpine Solitude (1879–1889): Resigning his professorship due to relentless migraines and near-blindness, Nietzsche wandered between Swiss high peaks and Mediterranean ports, turning physical agony into a crucible for incandescent creative rebellion.",
    seoDescription:
      "Read the biography and philosophical ideas of Friedrich Nietzsche, author of Thus Spoke Zarathustra. Discover his quotes on Amor Fati and self-overcoming.",
    keyThemes: ["Amor Fati", "The Will to Power", "Self-Overcoming", "Critique of Nihilism"],
    notableWorks: ["Thus Spoke Zarathustra", "Beyond Good and Evil", "The Gay Science", "On the Genealogy of Morals"],
    companionThinkers: {
      influences: ["Arthur Schopenhauer", "Ralph Waldo Emerson", "Heraclitus"],
      influenced: ["Albert Camus", "Jean-Paul Sartre", "Martin Heidegger"],
      contrasts: ["Socrates", "Immanuel Kant"],
    },
    faqs: [
      {
        question: "What did Nietzsche mean by the 'death of God'?",
        answer:
          "Nietzsche diagnosed that Enlightenment rationality had undermined religious foundations for universal morality, leaving humanity vulnerable to nihilism unless individuals create life-affirming values.",
      },
      {
        question: "What is Amor Fati in Nietzsche's philosophy?",
        answer:
          "Amor Fati ('love of fate') is the resolve not merely to endure suffering, but to embrace every single moment of existence as necessary and worthy of affirmation.",
      },
      {
        question: "What is the Übermensch according to Nietzsche?",
        answer:
          "The Übermensch ('Overman') represents a self-actualized creator who rises above herd conformity, masters internal weakness, and authors their own ethical meaning.",
      },
      {
        question: "How did Nietzsche define the 'Will to Power'?",
        answer:
          "He defined it as the fundamental psychological drive in human beings toward vitality, creative growth, self-mastery, and the overcoming of internal and external obstacles.",
      },
    ],
  },
  "ralph waldo emerson": {
    bio: `Ralph Waldo Emerson (1803–1882) stood as the intellectual father of American Transcendentalism, igniting a cultural declaration of intellectual independence from European traditions. Stepping down from a Boston Unitarian pulpit to become a traveling lecturer and essayist, Emerson championed the divine potential within every individual conscience and the sacred vitality of the natural world.

In seminal essays like "Self-Reliance" and "Nature," Emerson challenged readers to abandon conformity, trust internal intuition, and reject secondhand beliefs. "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment," he famously observed. His philosophy was fundamentally democratic, urging each soul to recognize their direct communion with universal truth.

Emerson’s luminous prose shaped generations of thinkers—including his mentee Henry David Thoreau and poet Walt Whitman—and remains a touchstone of creative courage and spiritual self-determination.`,
    thesis:
      "To trust your own conscience in a world demanding conformity is the supreme human achievement, unlocking direct communion with universal truth.",
    crucible:
      "Resignation from the Pulpit & Grief (1831–1832): Devastated by the early death of his wife Ellen, Emerson resigned his Boston ministry, broke with institutional religious dogma, and sailed for Europe to construct a radical philosophy of inner spiritual self-reliance.",
    seoDescription:
      "Discover Ralph Waldo Emerson, American essayist, poet, and champion of Transcendentalism. Explore his quotes on Self-Reliance, nature, and creative courage.",
    keyThemes: ["Radical Self-Reliance", "Individual Conscience", "Communion with Nature", "Transcendentalism"],
    notableWorks: ["Self-Reliance", "Nature", "The Over-Soul", "Circles"],
    companionThinkers: {
      influences: ["Plato", "Immanuel Kant", "Thomas Carlyle"],
      influenced: ["Henry David Thoreau", "Walt Whitman", "Friedrich Nietzsche"],
      contrasts: ["Thomas Hobbes", "John Locke"],
    },
    faqs: [
      {
        question: "What is the central message of Emerson's 'Self-Reliance'?",
        answer:
          "Emerson urged individuals to trust their intuition over inherited dogma and societal conformity, asserting that authentic self-trust is the true foundation of moral courage.",
      },
      {
        question: "How did Emerson influence Henry David Thoreau?",
        answer:
          "Emerson served as a mentor and close friend to Thoreau, providing access to his land at Walden Pond and profoundly shaping Thoreau's philosophy of simple living and civil disobedience.",
      },
      {
        question: "What is American Transcendentalism as defined by Emerson?",
        answer:
          "Transcendentalism was Emerson's philosophical movement asserting that ultimate spiritual truth transcends empirical senses, accessible directly through intuitive conscience and nature.",
      },
      {
        question: "What was Emerson's spiritual view of nature?",
        answer:
          "Emerson viewed nature as a sacred, living reality that mirrors human consciousness, teaching that immersion in wilderness cures social pretension and restores primal clarity.",
      },
    ],
  },
  "mahatma gandhi": {
    bio: `Mohandas Karamchand Gandhi (1869–1948), revered globally as Mahatma ("Great Soul"), transformed ancient ethical concepts into a revolutionary political force. Trained as a barrister in London and radicalized by institutional racial injustice in South Africa, Gandhi returned to India to lead the national movement against British colonial rule through pure nonviolent resistance.

His core doctrine of Satyagraha ("truth-force") rejected violence not out of passivity, but as active spiritual courage that sought to awaken the moral conscience of the oppressor. Coupled with Ahimsa (universal non-harm) and radical personal simplicity, his campaigns—from the historic Salt March to sustained nationwide civil disobedience—proved that principled moral solidarity could dismantle imperial dominion.

Gandhi’s philosophical legacy extended far beyond Indian independence, directly inspiring Martin Luther King Jr., Nelson Mandela, and civil liberties struggles across the globe.`,
    thesis:
      "Principled nonviolence (Ahimsa) is not passive compliance, but active spiritual truth-force (Satyagraha) capable of awakening the moral conscience of an adversary.",
    crucible:
      "The Pietermaritzburg Train Station Ejection (1893): Thrown from a first-class carriage onto a freezing South African railway platform due to racial discrimination, Gandhi spent a shivering night resolving to conquer prejudice through disciplined moral resistance.",
    seoDescription:
      "Explore the life and philosophy of Mahatma Gandhi. Read his quotes on nonviolent resistance, Satyagraha, truth, and moral leadership in the modern world.",
    keyThemes: ["Satyagraha (Truth-Force)", "Ahimsa (Nonviolence)", "Ethical Leadership", "Simplicity & Self-Discipline"],
    notableWorks: ["The Story of My Experiments with Truth", "Hind Swaraj"],
    companionThinkers: {
      influences: ["Leo Tolstoy", "Henry David Thoreau", "John Ruskin"],
      influenced: ["Martin Luther King Jr.", "Nelson Mandela", "Dalai Lama"],
      contrasts: ["Niccolò Machiavelli", "Frantz Fanon"],
    },
    faqs: [
      {
        question: "What does Satyagraha mean in Gandhi's philosophy?",
        answer:
          "Satyagraha ('truth-force') is an active method of nonviolent civil resistance designed to convert an opponent's conscience through moral courage and willing sacrifice rather than coercion.",
      },
      {
        question: "Which thinkers shaped Mahatma Gandhi's worldview?",
        answer:
          "Gandhi drew inspiration from ancient Indian Ahimsa, Leo Tolstoy's Christian pacifism, John Ruskin's ethics of labor in 'Unto This Last', and Henry David Thoreau's essay on Civil Disobedience.",
      },
      {
        question: "How did Gandhi define Ahimsa (nonviolence)?",
        answer:
          "Gandhi defined Ahimsa not merely as refraining from physical harm, but as an active state of spiritual goodwill that refuses malice even when confronting oppression.",
      },
      {
        question: "How did Gandhi influence modern civil rights movements?",
        answer:
          "Gandhi proved that disciplined, principled nonviolence could overcome military empires, providing the strategic and moral foundation for Martin Luther King Jr., Nelson Mandela, and global freedom struggles.",
      },
    ],
  },
}

function normalizeKey(str?: string | null): string {
  if (!str) return ""
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Resolves verified companion thinkers (intellectual lineage) for canonical authors
 */
export function getAuthorCompanionThinkers(authorName: string): CompanionThinkers | null {
  const norm = normalizeKey(authorName)
  for (const [key, record] of Object.entries(CANONICAL_AUTHOR_KNOWLEDGE)) {
    if (norm.includes(key) || key.includes(norm)) {
      return record.companionThinkers
    }
  }
  return null
}

/**
 * Removes typical AI fluff and ensures natural, fluent human phrasing without dropping words
 */
export function sanitizeHumanBioText(text: string): string {
  if (!text) return ""
  let cleaned = text.trim()
  // Strip any leaked section boundary delimiter tags from LLM output
  cleaned = cleaned
    .replace(/<<<\s*(?:BIO|THESIS|CRUCIBLE|SEO(?:_|\s+)DESCRIPTION|KEY(?:_|\s+)THEMES|NOTABLE(?:_|\s+)WORKS|COMPANION(?:_|\s+)THINKERS|FAQS)\s*>>>/gi, "")
    .replace(/^(?:\*{1,2}|#{1,3})?\s*<<<\s*BIO\s*>>>\s*(?:\*{1,2})?\s*/i, "")
    .trim()

  for (const { pattern, replacement } of HUMAN_PHRASE_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement)
  }
  return cleaned
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
    .replace(/(?:^|\n\n)([a-z])/g, (_, char) => char.toUpperCase())
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
        thesis: record.thesis,
        crucible: record.crucible,
        seoDescription: record.seoDescription,
        keyThemes: record.keyThemes,
        notableWorks: record.notableWorks,
        companionThinkers: record.companionThinkers,
        faqs: record.faqs,
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

  const p1 = input.authorityGroundingSummary
    ? `${input.name} ${era} stands as an influential ${nationality}${role}. ${input.authorityGroundingSummary} Known for rigorous engagement with the pressing questions of their time, their work cuts through surface convention to examine how individuals cultivate integrity, navigate adversity, and contribute to the broader human condition.`
    : `${input.name} ${era} stands as an influential ${nationality}${role} whose intellectual footprint continues to shape conversations on human purpose, resilience, and creative expression. Known for rigorous engagement with the pressing questions of their time, their work cuts through surface convention to examine how individuals cultivate integrity, navigate adversity, and contribute to the broader human condition.`

  const worksClause =
    input.linkedWorks && input.linkedWorks.length > 0
      ? `Across notable contributions including [${input.linkedWorks[0].title}](/sources/${input.linkedWorks[0].slug}), their writings `
      : input.knownWorks && input.knownWorks.length > 0
      ? `Across notable contributions including "${input.knownWorks.slice(0, 3).join('", "')}", their writings `
      : `Throughout their celebrated lectures, publications, and personal writings, their thought `

  const quotesClause = input.primaryQuote
    ? `Their celebrated insight that "${input.primaryQuote.content}" encapsulates their dedication to moral clarity and intellectual discipline.`
    : input.sampleQuotes && input.sampleQuotes.length > 0
    ? `Their reflections—addressing themes of discipline, moral clarity, and authentic conviction—exemplify a sustained commitment to intellectual honesty.`
    : `Their philosophy explores the delicate balance between personal autonomy and social responsibility, offering enduring insight for thoughtful living.`

  let p2 = ""
  if (input.perspective === "crucible") {
    p2 = `${worksClause}reflects ideas forged not in serene detachment, but in the heat of personal crisis and historical turbulence. ${quotesClause} Rather than offering comfortable dogmas, their writing challenges readers to confront adversity with unflinching resolve.`
  } else if (input.perspective === "paradox") {
    p2 = `${worksClause}draws enduring power from the unresolved contradictions of human experience. ${quotesClause} By confronting the distance between noble aspiration and human fallibility, their work rejects easy answers in favor of genuine self-examination.`
  } else {
    p2 = `${worksClause}reflects a disciplined pursuit of life's fundamental dilemmas. ${quotesClause}`
  }

  let p3 = ""
  if (input.perspective === "modern") {
    p3 = `In an era of hyper-connectivity, fragmented attention, and rapid uncertainty, the timeless quotes of ${input.name} offer modern readers immediate cognitive grounding—a practical mental framework for integrity and clarity.`
  } else if (input.perspective === "crucible") {
    p3 = `Today, the timeless reflections of ${input.name} endure as essential reading for anyone seeking emotional fortitude and moral courage when tested by circumstance.`
  } else {
    p3 = `Today, the timeless quotes and ideas of ${input.name} remain widely cited across literature, leadership, and personal philosophy, challenging readers to align their daily actions with core convictions.`
  }

  const fullBio = `${p1}\n\n${p2}\n\n${p3}`

  const seoDescription = `Explore the biography, philosophy, and timeless quotes by ${input.name}${
    input.profession ? `, celebrated ${input.profession.toLowerCase()}` : ""
  }. Read curated thoughts on wisdom and life.`

  const defaultFaqs: AuthorFaqItem[] = [
    {
      question: `What was ${input.name}'s central philosophy and legacy?`,
      answer: `${input.name}${era ? ` ${era}` : ""} was an influential ${nationality}${role} whose writings and reflections examine fundamental questions of human integrity, resilience, and purposeful living.`,
    },
    {
      question: `Why do readers study and cite quotes by ${input.name}?`,
      answer: `The quotes of ${input.name} remain widely cited because they challenge conventional assumptions and provide timeless mental clarity for navigating adversity and personal conviction.`,
    },
    {
      question: `What are the core themes explored throughout ${input.name}'s work?`,
      answer: `Their intellectual footprint centers on ethical agency, personal discipline, and navigating the friction between individual conscience and societal expectation.`,
    },
    {
      question: `How did historical challenges forge ${input.name}'s perspective?`,
      answer: `Rather than formulating abstract theories in isolation, ${input.name} tested their ideas against the concrete moral dilemmas and lived adversities of their era.`,
    },
  ]

  const defaultCompanionThinkers: CompanionThinkers = {
    influences:
      input.nationality?.toLowerCase().includes("roman") || input.nationality?.toLowerCase().includes("greek")
        ? ["Socrates", "Plato"]
        : ["Classical Philosophy", "Enlightenment Thinkers"],
    influenced: ["Modern Thinkers", "Contemporary Essayists"],
    contrasts: ["Dogmatic Traditionalism", "Material Cynicism"],
  }

  const defaultThesis = input.primaryQuote
    ? `"${input.primaryQuote.content.slice(0, 80)}" — living with authentic conviction requires aligning everyday action with inward moral discipline.`
    : `${input.name} champions the conviction that human dignity is forged through intellectual integrity, personal resilience, and living in deliberate service of truth.`

  const defaultCrucible = input.authorityGroundingSummary
    ? `Tested by the historical pressures of their era, ${input.name} grounded their insights not in serene detachment, but in the friction of lived responsibility.`
    : `Facing the intellectual conflicts and social challenges of their era, ${input.name} refused comfortable convention, testing their ideas through rigorous engagement with human adversity.`

  return {
    bio: sanitizeHumanBioText(fullBio),
    thesis: defaultThesis,
    crucible: defaultCrucible,
    seoDescription: seoDescription.slice(0, 160),
    keyThemes:
      input.linkedCategories && input.linkedCategories.length > 0
        ? input.linkedCategories.map((c) => c.name)
        : [
            `${input.name} Philosophy`,
            "Human Resilience",
            "Authentic Leadership",
            "Moral Integrity",
          ],
    notableWorks:
      input.linkedWorks && input.linkedWorks.length > 0
        ? input.linkedWorks.map((w) => w.title)
        : input.knownWorks && input.knownWorks.length > 0
        ? input.knownWorks
        : ["Collected Writings", "Selected Essays & Addresses"],
    companionThinkers: defaultCompanionThinkers,
    faqs: defaultFaqs,
    provider: "curator",
    wordCount: fullBio.split(/\s+/).length,
  }
}

function getPerspectiveGuidance(perspective?: BioPerspective): string {
  switch (perspective) {
    case "crucible":
      return "Crucible & Origins: Center the biography around the defining personal crisis, exile, illness, war, or psychological turning point that forged their worldview. Ground their insights in what they personally endured."
    case "modern":
      return "Modern Relevance: Highlight why contemporary readers, founders, thinkers, and seekers search for their quotes today. Connect their insights directly to navigating modern anxiety, cognitive overload, and decision-making."
    case "paradox":
      return "Human Paradox: Explore the tension between their philosophical ideals and flawed human reality. Portray them with human vulnerability, internal struggle, and moral complexity rather than sterile hagiography."
    case "literary":
    default:
      return "Literary Profile: Craft a rich biographical profile balancing their primary intellectual obsession, key written works, and lasting cultural resonance."
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

  const primaryQuoteClause = input.primaryQuote
    ? `\nCENTRAL QUOTE ANCHOR (RAG GROUNDING):
Quotzen's primary published quote by this author is:
"${input.primaryQuote.content}"${input.primaryQuote.sourceTitle ? ` (from "${input.primaryQuote.sourceTitle}")` : ""}
Organically integrate this exact quote into Paragraph 2 as a concrete illustration of their philosophy (e.g. 'Their reflection that "${input.primaryQuote.content.slice(0, 50)}..." crystallizes their approach to...').`
    : ""

  const linkedWorksClause =
    input.linkedWorks && input.linkedWorks.length > 0
      ? `\nINTERNAL WORK HYPERLINKING (SEO & PLATFORM LINKING):
Whenever referencing their notable works in the prose, format them as Markdown links to their Quotzen work pages:
${input.linkedWorks.map((w) => `- "${w.title}" -> [${w.title}](/sources/${w.slug})`).join("\n")}`
      : ""

  const linkedCategoriesClause =
    input.linkedCategories && input.linkedCategories.length > 0
      ? `\nTHEMATIC TOPIC HYPERLINKING:
When highlighting key conceptual domains, seamlessly hyperlink the concept to its curated topic archive:
${input.linkedCategories.map((c) => `- "${c.name}" -> [${c.name}](/categories/${c.slug})`).join("\n")}`
      : ""

  const authorityClause = input.authorityGroundingSummary
    ? `\nAUTHORITY GROUNDING (WIKIPEDIA / WIKIDATA REFERENCE):
"${input.authorityGroundingSummary}"
Use these verified facts for factual precision without mimicking encyclopedic phrasing.`
    : ""

  return `You are a world-class literary essayist, biographer, and digital editor.
Write a humanized, engaging, and SEO-optimized biography for:

Author: "${input.name}"
Profession: "${input.profession || "Thinker & Writer"}"
Nationality / Region: "${input.nationality || "Global"}"
Lifespan: "${input.birthYear ? input.birthYear : ""}${input.deathYear ? ` – ${input.deathYear}` : ""}"
Known Works: "${input.knownWorks?.join(", ") || "N/A"}"
Representative Themes: "${input.sampleQuotes?.slice(0, 3).join(" | ") || "N/A"}"
${authorityClause}
${primaryQuoteClause}
${linkedWorksClause}
${linkedCategoriesClause}

STYLE INSTRUCTIONS:
- Tone: ${toneLabel}
- Perspective: ${getPerspectiveGuidance(input.perspective)}
- Length: ${lengthInstruction}

CRITICAL RULES FOR HUMANIZATION & ANTI-AI FLUFF:
1. STRICTLY BANNED VOCABULARY: DO NOT USE "delve", "delving", "tapestry", "rich tapestry", "beacon", "testament", "multifaceted", "pivotal", "cornerstone", "quintessential", "unwavering", "indelible mark", "serves as a reminder", "realm", "dynamic interplay", "enduring legacy", "in conclusion", "it is worth noting", or "journey".
2. BANNED SYNTACTIC PATTERNS:
   - NEVER begin sentences with participial clauses (e.g. avoid "Bridging high philosophy and daily struggle, he..." or "Standing at the intersection of..."). Use direct, active subject-verb statements.
   - NEVER use formulaic closing platitudes (e.g. avoid "...serves as a compass for readers navigating modern uncertainty"). End with a sharp, concrete reflection on their intellectual challenge to the reader.
   - No dry resume chronologies ("X was born on date and went to school"). Open immediately with their core intellectual conflict or driving existential question.
3. HUMAN VOICE & BURSTINESS:
   - Vary sentence lengths dynamically: mix short, punchy 5-to-9 word declarative statements with deeper analytical reflections.
   - Use concrete, sensory details and historical specificity over empty praise adjectives.
4. NATURAL TOPICAL AUTHORITY & KNOWLEDGE GRAPH (SEO):
   - The first sentence of Paragraph 1 must be a compelling, self-contained hook that immediately conveys who they are and why their thoughts endure.
   - Core Worldview Thesis: Synthesize their central worldview into exactly 1 punchy, memorable crystallization sentence.
   - Defining Crucible: Identify the single historical turning point, exile, battle, illness, or trial in 1 to 2 sentences that tested and forged their ideas.
   - Seamlessly embed seminal works and concepts without keyword stuffing.
   - Highlight intellectual lineage: 2 to 3 figures who influenced them, 2 to 3 figures they influenced, and 1 to 2 contrasting philosophical voices.
   - Formulate 4 to 5 high-intent FAQ pairs directly answering common questions searchers ask about this author's philosophy, major works, ethical stances on adversity, or lasting legacy (concise, factual, authoritative 1-2 sentence answers).

Output strictly valid JSON with this exact structure:
{
  "bio": "Multi-paragraph narrative biography text separated by double newlines (\\n\\n)",
  "thesis": "Strictly 1 punchy, memorable sentence crystallizing the author's primary philosophical worldview or life thesis",
  "crucible": "Strictly 1 to 2 sentences identifying the defining historical crisis, exile, trial, or turning point that tested and forged their thinking",
  "seoDescription": "Strictly 140 to 160 characters search engine snippet summarizing who they are and why readers search for their quotes",
  "keyThemes": ["3 to 5 core thematic phrases"],
  "notableWorks": ["2 to 4 major publication or speech titles"],
  "companionThinkers": {
    "influences": ["2 to 3 historical figures or mentors who influenced them"],
    "influenced": ["2 to 3 thinkers, writers, or leaders they directly influenced"],
    "contrasts": ["1 to 2 thinkers with opposing or contrasting philosophical frameworks"]
  },
  "faqs": [
    {
      "question": "Clear, direct question searchers ask (e.g. What was X's main philosophy?)",
      "answer": "Authoritative 1-2 sentence direct answer suitable for Google search answer snippet"
    },
    {
      "question": "Second key question (e.g. about their seminal work or turning point)",
      "answer": "Authoritative 1-2 sentence direct answer"
    },
    {
      "question": "Third key question (e.g. about handling adversity, ethics, or personal discipline)",
      "answer": "Authoritative 1-2 sentence direct answer"
    },
    {
      "question": "Fourth key question (e.g. why their ideas remain influential today)",
      "answer": "Authoritative 1-2 sentence direct answer"
    }
  ]
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
      const timeoutId = setTimeout(() => controller.abort(), 22000)

      const temperature =
        input.tone === "philosophical" ? 0.32 : input.tone === "punchy" ? 0.45 : 0.38

      const response = await callGeminiGenerateContent(apiKey, prompt, {
        temperature,
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
            const fallback = generateCuratorAuthorBio(input)
            const seoDescription =
              typeof parsed.seoDescription === "string" && parsed.seoDescription.trim().length > 20
                ? parsed.seoDescription.slice(0, 160)
                : fallback.seoDescription || `${input.name} biography, key works, and philosophical quotes.`
            const keyThemes =
              Array.isArray(parsed.keyThemes) && parsed.keyThemes.length > 0
                ? parsed.keyThemes.slice(0, 6)
                : fallback.keyThemes
            const notableWorks =
              Array.isArray(parsed.notableWorks) && parsed.notableWorks.length > 0
                ? parsed.notableWorks.slice(0, 6)
                : fallback.notableWorks

            const companionThinkers: CompanionThinkers = {
              influences:
                parsed.companionThinkers &&
                Array.isArray(parsed.companionThinkers.influences) &&
                parsed.companionThinkers.influences.length > 0
                  ? parsed.companionThinkers.influences
                      .map(String)
                      .filter((s: string) => s.trim().length > 1)
                      .slice(0, 4)
                  : fallback.companionThinkers.influences,
              influenced:
                parsed.companionThinkers &&
                Array.isArray(parsed.companionThinkers.influenced) &&
                parsed.companionThinkers.influenced.length > 0
                  ? parsed.companionThinkers.influenced
                      .map(String)
                      .filter((s: string) => s.trim().length > 1)
                      .slice(0, 4)
                  : fallback.companionThinkers.influenced,
              contrasts:
                parsed.companionThinkers &&
                Array.isArray(parsed.companionThinkers.contrasts) &&
                parsed.companionThinkers.contrasts.length > 0
                  ? parsed.companionThinkers.contrasts
                      .map(String)
                      .filter((s: string) => s.trim().length > 1)
                      .slice(0, 3)
                  : fallback.companionThinkers.contrasts,
            }

            let faqs: AuthorFaqItem[] = fallback.faqs
            if (Array.isArray(parsed.faqs) && parsed.faqs.length > 0) {
              const parsedFaqs = parsed.faqs
                .filter(
                  (f: unknown) =>
                    f && typeof f === "object" && "question" in f && "answer" in f
                )
                .map((f: { question: unknown; answer: unknown }) => ({
                  question: String(f.question).trim(),
                  answer: sanitizeHumanBioText(String(f.answer).trim()),
                }))
                .filter(
                  (f: { question: string; answer: string }) =>
                    f.question.length > 5 && f.answer.length > 10
                )
                .slice(0, 5)
              if (parsedFaqs.length > 0) {
                faqs = parsedFaqs
              }
            }

            const thesis =
              typeof parsed.thesis === "string" && parsed.thesis.trim().length > 15
                ? sanitizeHumanBioText(parsed.thesis.trim())
                : fallback.thesis

            const crucible =
              typeof parsed.crucible === "string" && parsed.crucible.trim().length > 15
                ? sanitizeHumanBioText(parsed.crucible.trim())
                : fallback.crucible

            return {
              bio,
              thesis,
              crucible,
              seoDescription,
              keyThemes,
              notableWorks,
              companionThinkers,
              faqs,
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

function parseCompanionThinkersText(raw: string, fallback: CompanionThinkers): CompanionThinkers {
  if (!raw.trim()) return fallback
  try {
    if (raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw.trim())
      if (parsed && typeof parsed === "object") {
        return {
          influences:
            Array.isArray(parsed.influences) && parsed.influences.length > 0
              ? parsed.influences.map(String).filter((s: string) => s.trim().length > 1).slice(0, 4)
              : fallback.influences,
          influenced:
            Array.isArray(parsed.influenced) && parsed.influenced.length > 0
              ? parsed.influenced.map(String).filter((s: string) => s.trim().length > 1).slice(0, 4)
              : fallback.influenced,
          contrasts:
            Array.isArray(parsed.contrasts) && parsed.contrasts.length > 0
              ? parsed.contrasts.map(String).filter((s: string) => s.trim().length > 1).slice(0, 3)
              : fallback.contrasts,
        }
      }
    }
  } catch {
    // fallback to text lines
  }

  const lines = raw.split("\n")
  let influences = [...fallback.influences]
  let influenced = [...fallback.influenced]
  let contrasts = [...fallback.contrasts]

  for (const line of lines) {
    const trimmed = line.trim()
    if (/^influences?\s*:/i.test(trimmed)) {
      const items = trimmed
        .replace(/^influences?\s*:/i, "")
        .split(/[,;]+/)
        .map((s) => s.trim().replace(/^[-*•#\s]+/, ""))
        .filter((s) => s.length > 1)
      if (items.length > 0) influences = items.slice(0, 4)
    } else if (/^influenced\s*:/i.test(trimmed)) {
      const items = trimmed
        .replace(/^influenced\s*:/i, "")
        .split(/[,;]+/)
        .map((s) => s.trim().replace(/^[-*•#\s]+/, ""))
        .filter((s) => s.length > 1)
      if (items.length > 0) influenced = items.slice(0, 4)
    } else if (/^contrasts?\s*:/i.test(trimmed)) {
      const items = trimmed
        .replace(/^contrasts?\s*:/i, "")
        .split(/[,;]+/)
        .map((s) => s.trim().replace(/^[-*•#\s]+/, ""))
        .filter((s) => s.length > 1)
      if (items.length > 0) contrasts = items.slice(0, 3)
    }
  }

  return { influences, influenced, contrasts }
}

function parseFaqsText(raw: string, fallback: AuthorFaqItem[]): AuthorFaqItem[] {
  if (!raw.trim()) return fallback
  try {
    if (raw.trim().startsWith("[")) {
      const parsed = JSON.parse(raw.trim())
      if (Array.isArray(parsed) && parsed.length > 0) {
        const items = parsed
          .filter((f) => f && typeof f === "object" && f.question && f.answer)
          .map((f) => ({
            question: String(f.question).trim(),
            answer: sanitizeHumanBioText(String(f.answer).trim()),
          }))
          .filter((f) => f.question.length > 5 && f.answer.length > 10)
        if (items.length > 0) return items.slice(0, 5)
      }
    }
  } catch {
    // text parsing
  }

  const faqs: AuthorFaqItem[] = []
  const qaBlocks = raw.split(/(?:^|\n)(?=Q\d*[:?.-]|\*\*Q\d*[:?.-]|\bQuestion\d*[:?.-])/i)
  for (const block of qaBlocks) {
    const qMatch = block.match(/(?:Q\d*[:?.-]|\*\*Q\d*[:?.-]|\bQuestion\d*[:?.-])\s*([^\n]+)/i)
    const aMatch = block.match(/(?:A\d*[:?.-]|\*\*A\d*[:?.-]|\bAnswer\d*[:?.-])\s*([\s\S]+)/i)
    if (qMatch && aMatch) {
      const question = qMatch[1].trim().replace(/\*\*$/, "").trim()
      const answer = sanitizeHumanBioText(aMatch[1].trim().replace(/^[-*•\s]+/, ""))
      if (question.length > 5 && answer.length > 10) {
        faqs.push({ question, answer })
      }
    }
  }

  return faqs.length > 0 ? faqs.slice(0, 5) : fallback
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
            thesis: result.thesis,
            crucible: result.crucible,
            seoDescription: result.seoDescription,
            keyThemes: result.keyThemes,
            notableWorks: result.notableWorks,
            companionThinkers: result.companionThinkers,
            faqs: result.faqs,
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
        const streamPrimaryQuote = input.primaryQuote
          ? `\nCENTRAL QUOTE ANCHOR: Organically weave this published quote into Paragraph 2: "${input.primaryQuote.content}"`
          : ""
        const streamLinkedWorks =
          input.linkedWorks && input.linkedWorks.length > 0
            ? `\nINTERNAL WORK HYPERLINKING: When referencing works, format as Markdown links:\n${input.linkedWorks
                .map((w) => `- [${w.title}](/sources/${w.slug})`)
                .join("\n")}`
            : ""
        const streamAuthority = input.authorityGroundingSummary
          ? `\nAUTHORITY GROUNDING (FACTUAL REFERENCE): "${input.authorityGroundingSummary}"`
          : ""

        const lengthClause =
          input.length === "concise"
            ? "1 rich paragraph (around 100-140 words)"
            : input.length === "comprehensive"
            ? "exactly 3 substantial, distinct paragraphs separated by double newlines (around 280-350 words)"
            : "2 to 3 balanced, distinct paragraphs separated by double newlines (around 180-240 words)"

        const streamPrompt = `You are a world-class literary biographer, essayist, and digital editor.
Write a humanized, engaging, and SEO-optimized biography and metadata for:
Author: "${input.name}"
Profession: "${input.profession || "Thinker & Writer"}"
Nationality: "${input.nationality || "Global"}"
Lifespan: "${input.birthYear ? input.birthYear : ""}${input.deathYear ? ` – ${input.deathYear}` : ""}"
Tone: ${input.tone || "humanized"}
Perspective: ${getPerspectiveGuidance(input.perspective)}
Target Length: ${lengthClause}
${streamAuthority}
${streamPrimaryQuote}
${streamLinkedWorks}

CRITICAL RULES FOR HUMANIZATION & ANTI-AI FLUFF:
1. STRICTLY BANNED WORDS: Do not use "delve", "delving", "tapestry", "rich tapestry", "beacon", "testament", "multifaceted", "pivotal", "cornerstone", "quintessential", "unwavering", "indelible mark", "serves as a reminder", "realm", "dynamic interplay", "enduring legacy", or "in conclusion".
2. BANNED SYNTACTIC PATTERNS: Do not open sentences with participial clauses ("Bridging...", "Standing at..."). Do not conclude with generic platitudes ("...serves as a compass...").
3. Open directly with their central intellectual obsession, moral conflict, or the historical friction that shaped their thought.
4. Vary sentence lengths for human rhythm and burstiness (combine short declarative sentences with nuanced reflections).
5. Ensure distinct narrative paragraphs are separated by double newlines (\n\n).

Format your response strictly using these exact delimiters. Begin immediately with "<<<BIO>>>" on the very first line without preambles:
<<<BIO>>>
(The narrative biography text with distinct paragraphs separated by double newlines)
<<<THESIS>>>
(Strictly 1 memorable sentence crystallizing their primary worldview)
<<<CRUCIBLE>>>
(Strictly 1-2 sentences highlighting their defining historical trial or turning point)
<<<SEO_DESCRIPTION>>>
(Strictly 140 to 160 characters summary for Google search result meta description)
<<<KEY_THEMES>>>
(Comma-separated list of 3-5 core themes/concepts)
<<<NOTABLE_WORKS>>>
(Comma-separated list of 2-4 major publication, essay, or speech titles)
<<<COMPANION_THINKERS>>>
INFLUENCES: Thinker 1, Thinker 2
INFLUENCED: Thinker 3, Thinker 4
CONTRASTS: Thinker 5, Thinker 6
<<<FAQS>>>
Q: What was their core philosophy?
A: 1-2 sentence authoritative answer.
Q: What is their most celebrated work or speech?
A: 1-2 sentence authoritative answer.
Q: How did their ideas navigate crisis or adversity?
A: 1-2 sentence authoritative answer.
Q: Why do their insights remain relevant today?
A: 1-2 sentence authoritative answer.`

        const timeoutController = new AbortController()
        const timeoutId = setTimeout(() => timeoutController.abort(), 30000)

        const abortHandler = () => timeoutController.abort()
        options?.signal?.addEventListener("abort", abortHandler)

        const streamTemp =
          input.tone === "philosophical" ? 0.32 : input.tone === "punchy" ? 0.45 : 0.38

        const geminiRes = await callGeminiStreamGenerateContent(apiKey, streamPrompt, {
          temperature: streamTemp,
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
        let pendingStreamBuffer = ""

        let currentSection:
          | "INIT"
          | "BIO"
          | "THESIS"
          | "CRUCIBLE"
          | "SEO"
          | "THEMES"
          | "WORKS"
          | "COMPANIONS"
          | "FAQS" = "INIT"
        let accumulatedBio = ""
        let accumulatedThesis = ""
        let accumulatedCrucible = ""
        let accumulatedSeo = ""
        let accumulatedThemes = ""
        let accumulatedWorks = ""
        let accumulatedCompanions = ""
        let accumulatedFaqs = ""
        let hasBioCompleted = false

        const appendSectionText = (section: typeof currentSection, text: string) => {
          if (!text) return
          if (section === "BIO") {
            accumulatedBio += text
            sendEvent("delta", { text })
          } else if (section === "THESIS") {
            accumulatedThesis += text
          } else if (section === "CRUCIBLE") {
            accumulatedCrucible += text
          } else if (section === "SEO") {
            accumulatedSeo += text
          } else if (section === "THEMES") {
            accumulatedThemes += text
          } else if (section === "WORKS") {
            accumulatedWorks += text
          } else if (section === "COMPANIONS") {
            accumulatedCompanions += text
          } else if (section === "FAQS") {
            accumulatedFaqs += text
          }
        }

        const tagPattern =
          /<<<\s*(BIO|THESIS|CRUCIBLE|SEO(?:_|\s+)DESCRIPTION|KEY(?:_|\s+)THEMES|NOTABLE(?:_|\s+)WORKS|COMPANION(?:_|\s+)THINKERS|FAQS)\s*>>>/i

        while (true) {
          if (options?.signal?.aborted || isClosed) break

          const { done, value } = await reader.read()
          if (done) {
            // Process any trailing line left in sseBuffer
            if (sseBuffer.trim()) {
              const remainingLines = sseBuffer.split("\n")
              sseBuffer = ""
              for (const line of remainingLines) {
                const trimmed = line.trim()
                if (!trimmed.startsWith("data:")) continue
                const jsonStr = trimmed.replace(/^data:\s*/, "")
                if (!jsonStr || jsonStr === "[DONE]") continue
                try {
                  const parsed = JSON.parse(jsonStr)
                  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || ""
                  if (text) pendingStreamBuffer += text
                } catch {
                  // ignore
                }
              }
            }
            break
          }

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

            pendingStreamBuffer += textChunk

            while (true) {
              const match = pendingStreamBuffer.match(tagPattern)
              if (!match || match.index === undefined) break

              const textBefore = pendingStreamBuffer.slice(0, match.index)
              if (textBefore) {
                appendSectionText(currentSection, textBefore)
              }

              const rawTag = match[1].toUpperCase()

              // Transitioning out of BIO section into metadata sections
              if (currentSection === "BIO" && !rawTag.includes("BIO") && !hasBioCompleted) {
                hasBioCompleted = true
                sendEvent("complete_bio", { bio: sanitizeHumanBioText(accumulatedBio) })
              }

              if (rawTag.includes("BIO")) {
                currentSection = "BIO"
              } else if (rawTag.includes("THESIS")) {
                currentSection = "THESIS"
              } else if (rawTag.includes("CRUCIBLE")) {
                currentSection = "CRUCIBLE"
              } else if (rawTag.includes("SEO")) {
                currentSection = "SEO"
              } else if (rawTag.includes("THEME")) {
                currentSection = "THEMES"
              } else if (rawTag.includes("WORK")) {
                currentSection = "WORKS"
              } else if (rawTag.includes("COMPANION")) {
                currentSection = "COMPANIONS"
              } else if (rawTag.includes("FAQ")) {
                currentSection = "FAQS"
              }

              pendingStreamBuffer = pendingStreamBuffer.slice(match.index + match[0].length)
            }

            if (currentSection === "INIT") {
              // We haven't matched <<<BIO>>> yet
              const firstLtIndex = pendingStreamBuffer.indexOf("<")
              if (firstLtIndex === -1 && pendingStreamBuffer.length > 30) {
                // If model skipped <<<BIO>>> and began writing bio prose directly
                currentSection = "BIO"
                accumulatedBio += pendingStreamBuffer
                sendEvent("delta", { text: pendingStreamBuffer })
                pendingStreamBuffer = ""
              } else if (firstLtIndex > 0) {
                // Discard any conversational preamble before the first delimiter tag
                pendingStreamBuffer = pendingStreamBuffer.slice(firstLtIndex)
              }
            } else {
              // In BIO or subsequent sections: hold text from the FIRST '<' to avoid tag truncation
              const firstLtIndex = pendingStreamBuffer.indexOf("<")
              if (firstLtIndex !== -1 && pendingStreamBuffer.length - firstLtIndex < 40) {
                const safeToProcess = pendingStreamBuffer.slice(0, firstLtIndex)
                pendingStreamBuffer = pendingStreamBuffer.slice(firstLtIndex)
                if (safeToProcess) {
                  appendSectionText(currentSection, safeToProcess)
                }
              } else if (firstLtIndex === -1 && pendingStreamBuffer) {
                appendSectionText(currentSection, pendingStreamBuffer)
                pendingStreamBuffer = ""
              } else if (firstLtIndex !== -1 && pendingStreamBuffer.length - firstLtIndex >= 40) {
                const safeToProcess = pendingStreamBuffer.slice(0, firstLtIndex + 1)
                pendingStreamBuffer = pendingStreamBuffer.slice(firstLtIndex + 1)
                appendSectionText(currentSection, safeToProcess)
              }
            }
          }
        }

        // Flush remaining buffer at stream end
        if (pendingStreamBuffer) {
          if (currentSection === "INIT" || currentSection === "BIO") {
            const clean = pendingStreamBuffer.replace(/<<<\s*BIO\s*>>>/gi, "")
            if (clean) {
              accumulatedBio += clean
              sendEvent("delta", { text: clean })
            }
          } else {
            appendSectionText(currentSection, pendingStreamBuffer)
          }
          pendingStreamBuffer = ""
        }

        const fallback = generateCuratorAuthorBio(input)
        const cleanBio = sanitizeHumanBioText(accumulatedBio.trim()) || fallback.bio
        const finalThesis =
          sanitizeHumanBioText(accumulatedThesis.trim()) || fallback.thesis
        const finalCrucible =
          sanitizeHumanBioText(accumulatedCrucible.trim()) || fallback.crucible

        const seoSnippet = extractAuthorMetaDescription({
          name: input.name,
          profession: input.profession,
          bio: cleanBio,
        })

        const parsedKeyThemes = accumulatedThemes
          .split(/[,;\n]+/)
          .map((t) => t.trim().replace(/^[-*•#\s]+/, ""))
          .filter((t) => t.length > 2 && t.length < 50)

        const parsedNotableWorks = accumulatedWorks
          .split(/[,;\n]+/)
          .map((w) => w.trim().replace(/^[-*•#\s]+/, "").replace(/^["']|["']$/g, ""))
          .filter((w) => w.length > 2 && w.length < 80)

        const finalThemes =
          parsedKeyThemes.length > 0 ? parsedKeyThemes.slice(0, 6) : fallback.keyThemes
        const finalWorks =
          parsedNotableWorks.length > 0 ? parsedNotableWorks.slice(0, 6) : fallback.notableWorks
        const finalSeo =
          (accumulatedSeo.trim().length >= 30 ? accumulatedSeo.trim().slice(0, 160) : null) ||
          fallback.seoDescription ||
          seoSnippet

        const finalCompanionThinkers = parseCompanionThinkersText(
          accumulatedCompanions,
          fallback.companionThinkers
        )
        const finalFaqs = parseFaqsText(accumulatedFaqs, fallback.faqs)

        if (!hasBioCompleted) {
          hasBioCompleted = true
          sendEvent("complete_bio", { bio: cleanBio })
        }
        sendEvent("done", {
          bio: cleanBio,
          thesis: finalThesis,
          crucible: finalCrucible,
          seoDescription: finalSeo,
          keyThemes: finalThemes,
          notableWorks: finalWorks,
          companionThinkers: finalCompanionThinkers,
          faqs: finalFaqs,
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

export interface RegenerateParagraphInput {
  authorName: string
  profession?: string | null
  paragraphIndex: number // 0-based
  currentBio: string
  instruction?: string
  tone?: BioTone
  perspective?: BioPerspective
  primaryQuote?: { content: string; sourceTitle?: string | null }
  linkedWorks?: Array<{ title: string; slug: string }>
}

export interface RegenerateParagraphResult {
  paragraph: string
  fullBio: string
  paragraphIndex: number
  provider: "gemini" | "curator"
}

/**
 * Regenerates a single paragraph within an existing author biography
 */
export async function regenerateAuthorBioParagraph(
  input: RegenerateParagraphInput
): Promise<RegenerateParagraphResult> {
  const paragraphs = input.currentBio.split(/\n\n+/).filter(Boolean)
  const targetIndex = Math.max(0, Math.min(input.paragraphIndex, Math.max(0, paragraphs.length - 1)))
  const currentParagraph = paragraphs[targetIndex] || ""

  const paragraphRoles = [
    "Paragraph 1 (Hook & Identity): Introducing the thinker, their core intellectual dilemma or era, and why their thoughts endure.",
    "Paragraph 2 (Core Philosophy & Works): Examining their seminal writings, core quotes, and philosophical framework forged under adversity.",
    "Paragraph 3 (Modern Resonance & Challenge): Exploring why their insights matter today and their enduring challenge to the reader.",
  ]

  const roleDescription = paragraphRoles[targetIndex] || "Paragraph of the author biography."

  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (apiKey) {
    try {
      const prompt = `You are a world-class literary biographer and digital editor revising ONE single paragraph of an author biography.

Author: "${input.authorName}"
Profession: "${input.profession || "Thinker & Writer"}"
Target Paragraph Slot: ${roleDescription}

CURRENT FULL BIOGRAPHY:
${input.currentBio}

PARAGRAPH TO REVISE:
"${currentParagraph}"

EDITORIAL REVISION INSTRUCTION:
"${input.instruction?.trim() || "Improve clarity, rhythm, and emotional resonance while eliminating fluff."}"

${input.primaryQuote ? `Primary Quote to anchor (if relevant): "${input.primaryQuote.content}"` : ""}
${input.linkedWorks && input.linkedWorks.length > 0 ? `Internal Works to link (if mentioned): ${input.linkedWorks.map((w) => `[${w.title}](/sources/${w.slug})`).join(", ")}` : ""}

CRITICAL RULES:
1. STRICTLY BANNED VOCABULARY: DO NOT USE "delve", "tapestry", "beacon", "testament", "multifaceted", "pivotal", "cornerstone", "quintessential", "unwavering", "indelible mark", "serves as a reminder", "realm", "dynamic interplay", "enduring legacy", "in conclusion", "it is worth noting", or "journey".
2. No participial openings ("Bridging high philosophy..."). Use direct subject-verb constructions.
3. Keep the paragraph's length natural (around 50-90 words).
4. Output ONLY the raw replacement paragraph text. No markdown fences, no labels, no quotes around the text.`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 9000)

      const response = await callGeminiGenerateContent(apiKey, prompt, {
        temperature: 0.38,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text && text.trim().length > 30) {
          const cleanParagraph = sanitizeHumanBioText(text.trim())
          const newParagraphs = [...paragraphs]
          newParagraphs[targetIndex] = cleanParagraph
          return {
            paragraph: cleanParagraph,
            fullBio: newParagraphs.join("\n\n"),
            paragraphIndex: targetIndex,
            provider: "gemini",
          }
        }
      }
    } catch {
      // Fallback to curator
    }
  }

  // Fallback curator synthesizer
  const curatorBioResult = generateCuratorAuthorBio({
    name: input.authorName,
    profession: input.profession,
    perspective: input.perspective,
    tone: input.tone,
    primaryQuote: input.primaryQuote,
    linkedWorks: input.linkedWorks,
  })

  const curatorParagraphs = curatorBioResult.bio.split(/\n\n+/).filter(Boolean)
  const replacement = curatorParagraphs[targetIndex] || currentParagraph
  const newParagraphs = [...paragraphs]
  newParagraphs[targetIndex] = replacement

  return {
    paragraph: replacement,
    fullBio: newParagraphs.join("\n\n"),
    paragraphIndex: targetIndex,
    provider: "curator",
  }
}
