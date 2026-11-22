export interface CommandPaletteQuickAction {
  id: string
  type: "quote" | "author" | "category" | "tag" | "action" | "query"
  title: string
  subtitle?: string
  href: string
  badge?: string
  imageUrl?: string | null
}

export const QUICK_ACTIONS: CommandPaletteQuickAction[] = [
  {
    id: "action-random",
    type: "action",
    title: "Surprise Me (Random Quote)",
    subtitle: "Discover a random timeless philosophical passage",
    href: "/quotes/random",
    badge: "Discovery",
  },
  {
    id: "action-saved",
    type: "action",
    title: "My Saved Notebook",
    subtitle: "View bookmarked quotes available offline",
    href: "/saved",
    badge: "Notebook",
  },
  {
    id: "action-trending",
    type: "action",
    title: "Trending Quotes Today",
    subtitle: "See the most read and reflected-upon passages",
    href: "/#trending",
    badge: "Trending",
  },
  {
    id: "action-authors",
    type: "action",
    title: "Thinkers & Authors Archive",
    subtitle: "Browse all philosophers, poets, and writers",
    href: "/authors",
    badge: "Catalog",
  },
  {
    id: "action-categories",
    type: "action",
    title: "Thematic Topics & Categories",
    subtitle: "Explore quotes organized by life themes",
    href: "/categories",
    badge: "Themes",
  },
  {
    id: "action-feed",
    type: "action",
    title: "Daily Quote RSS Feed",
    subtitle: "Subscribe to /feed.xml in your favorite RSS reader",
    href: "/feed.xml",
    badge: "RSS 2.0",
  },
]

export const CURATED_PATHWAYS: readonly string[] = [
  "Wisdom",
  "Courage",
  "Truth",
  "Marcus Aurelius",
  "Rumi",
  "Stillness",
  "Hope",
  "Freedom",
] as const

