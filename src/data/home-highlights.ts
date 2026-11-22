export interface PhilosophicalTradition {
  icon: string
  name: string
  description: string
}

export interface HistoricalEpoch {
  icon: string
  name: string
  period: string
  description: string
}

export const PHILOSOPHICAL_TRADITIONS: readonly PhilosophicalTradition[] = [
  {
    icon: "🏛️",
    name: "Classical & Stoic Virtue",
    description: "Reflections on duty, inner fortitude, and tranquil reason from Marcus Aurelius, Epictetus, and Seneca.",
  },
  {
    icon: "🕯️",
    name: "Eastern Contemplation",
    description: "Upanishadic insight, Taoist harmony, and Sufi poetics exploring the stillness behind spoken words.",
  },
  {
    icon: "📜",
    name: "Enlightenment & Reason",
    description: "Foundational treatises on individual freedom, human rights, and the boundless courage to think.",
  },
  {
    icon: "🌿",
    name: "Romantic & Existential Wonder",
    description: "The arrest of beauty, melancholy, moral choice, and the deep mystery of the human condition.",
  },
] as const

export const HISTORICAL_EPOCHS: readonly HistoricalEpoch[] = [
  {
    icon: "🏛️",
    name: "Classical Antiquity",
    period: "c. 800 BC – 500 AD",
    description: "Greco-Roman thinkers, Vedic sages, and foundational dialogues on virtue and life.",
  },
  {
    icon: "🕯️",
    name: "Renaissance & Enlightenment",
    period: "c. 1400 – 1800",
    description: "Humanism, early scientific inquiry, and revolutionary discourses on human liberty.",
  },
  {
    icon: "📜",
    name: "The 19th Century",
    period: "c. 1800 – 1900",
    description: "Romanticism, Transcendentalism, realism, and existential philosophical questioning.",
  },
  {
    icon: "🌐",
    name: "20th Century & Beyond",
    period: "1900 – Present",
    description: "Voices of moral courage, civil reformers, Nobel laureates, and modern literary masters.",
  },
] as const

