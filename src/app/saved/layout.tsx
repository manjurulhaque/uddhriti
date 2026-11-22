import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Private Notebook | Quotzen",
  description: "Your personal, offline-first collection of bookmarked quotations.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return children
}

