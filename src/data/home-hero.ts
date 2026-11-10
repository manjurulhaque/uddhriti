export interface HeroJumpLink {
  href: string
  label: string
  icon: string
  featured: boolean
}

export const HERO_JUMP_LINKS: readonly HeroJumpLink[] = [
  { href: "#mood-filter", label: "Reflect by Mood", icon: "🌿", featured: true },
  { href: "#highlights", label: "Curator’s Parchment", icon: "🏛️", featured: true },
  { href: "#daily-quote", label: "Daily Contemplation", icon: "🌅", featured: true },
  { href: "#taxonomies", label: "Thinkers & Themes", icon: "✒️", featured: true },
  { href: "#reader-studio", label: "Reader Studio", icon: "🛠️", featured: true },
  { href: "#trending", label: "Trending Now", icon: "🔥", featured: false },
  { href: "#latest", label: "Latest Quotes", icon: "✨", featured: false },
] as const

