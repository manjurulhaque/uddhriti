export interface MoodItem {
  id: string
  label: string
  tagline: string
  icon: string
  categorySlug: string
  searchQuery?: string
  accentColor: string
  accentBg: string
  accentBorder: string
  accentText: string
  quote: {
    content: string
    author: string
    authorSlug?: string
    source?: string
    year?: string
  }
}

export const MOODS: MoodItem[] = [
  {
    id: "stillness",
    label: "Stillness & Peace",
    tagline: "Calming the racing mind and finding quiet center",
    icon: "🌿",
    categorySlug: "philosophical",
    searchQuery: "peace",
    accentColor: "#2d6a4f",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/30",
    accentText: "text-emerald-800",
    quote: {
      content:
        "Silence is an ocean. Speech is a river. When the ocean is searching for you, don't walk into the river.",
      author: "Rumi",
      authorSlug: "rumi",
      source: "The Masnavi",
    },
  },
  {
    id: "grit",
    label: "Grit & Resilience",
    tagline: "Standing tall when tested and pushing past setbacks",
    icon: "⚡",
    categorySlug: "failure",
    searchQuery: "perseverance",
    accentColor: "#b45309",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/30",
    accentText: "text-amber-800",
    quote: {
      content:
        "Failure after long perseverance is much grander than never to have a striving good enough to be called a failure.",
      author: "George Eliot",
      authorSlug: "george-eliot",
      source: "Middlemarch",
      year: "1871",
    },
  },
  {
    id: "solace",
    label: "Solace & Comfort",
    tagline: "Gentle perspectives for heavy days and quiet sorrow",
    icon: "🕯️",
    categorySlug: "sad",
    searchQuery: "solace",
    accentColor: "#475569",
    accentBg: "bg-slate-500/10",
    accentBorder: "border-slate-500/30",
    accentText: "text-slate-800",
    quote: {
      content: "We suffer more often in imagination than in reality.",
      author: "Seneca",
      authorSlug: "seneca",
      source: "Letters from a Stoic",
      year: "c. 65 AD",
    },
  },
  {
    id: "wonder",
    label: "Wonder & Philosophy",
    tagline: "Deep contemplation, existential awe, and timeless questions",
    icon: "🌌",
    categorySlug: "philosophical",
    accentColor: "#312e81",
    accentBg: "bg-indigo-500/10",
    accentBorder: "border-indigo-500/30",
    accentText: "text-indigo-800",
    quote: {
      content:
        "You have power over your mind - not outside events. Realize this, and you will find strength.",
      author: "Marcus Aurelius",
      authorSlug: "marcus-aurelius",
      source: "Meditations",
      year: "c. 180 AD",
    },
  },
  {
    id: "focus",
    label: "Focus & Ambition",
    tagline: "Purposeful drive, mastery, and bold momentum",
    icon: "🎯",
    categorySlug: "success",
    searchQuery: "focus",
    accentColor: "#c76b3e",
    accentBg: "bg-orange-500/10",
    accentBorder: "border-orange-500/30",
    accentText: "text-orange-800",
    quote: {
      content: "Nature does not hurry, yet everything is accomplished.",
      author: "Lao Tzu",
      authorSlug: "lao-tzu",
      source: "Tao Te Ching",
      year: "c. 4th Century BC",
    },
  },
  {
    id: "connection",
    label: "Love & Connection",
    tagline: "Kindred spirits, deep bonds, and enduring empathy",
    icon: "🤍",
    categorySlug: "love",
    accentColor: "#be185d",
    accentBg: "bg-pink-500/10",
    accentBorder: "border-pink-500/30",
    accentText: "text-pink-800",
    quote: {
      content:
        "In the sweetness of friendship let there be laughter, and sharing of pleasures. For in the dew of little things the heart finds its morning and is refreshed.",
      author: "Kahlil Gibran",
      authorSlug: "kahlil-gibran",
      source: "The Prophet",
      year: "1923",
    },
  },
  {
    id: "hope",
    label: "Hope & New Dawn",
    tagline: "Fresh chapters, renewed faith, and the light ahead",
    icon: "🌅",
    categorySlug: "positive",
    searchQuery: "hope",
    accentColor: "#d97706",
    accentBg: "bg-yellow-500/10",
    accentBorder: "border-yellow-500/30",
    accentText: "text-yellow-800",
    quote: {
      content:
        "Hope is the thing with feathers that perches in the soul - and sings the tune without the words - and never stops at all.",
      author: "Emily Dickinson",
      authorSlug: "emily-dickinson",
      year: "1861",
    },
  },
  {
    id: "time",
    label: "Time & Impermanence",
    tagline: "Living awake to the fleeting beauty of the present moment",
    icon: "⏳",
    categorySlug: "time",
    accentColor: "#78350f",
    accentBg: "bg-amber-700/10",
    accentBorder: "border-amber-700/30",
    accentText: "text-amber-900",
    quote: {
      content:
        "Clouds come floating into my life, no longer to carry rain or usher storm, but to add color to my sunset sky.",
      author: "Rabindranath Tagore",
      authorSlug: "rabindranath-tagore",
      source: "Stray Birds",
      year: "1916",
    },
  },
]

