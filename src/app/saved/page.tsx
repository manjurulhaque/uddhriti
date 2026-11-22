import type { Metadata } from "next"
import { PublicLayout, SavedQuotesContent } from "@/components/public"

export const metadata: Metadata = {
  title: "Saved Reflections — Personal Notebook",
  description:
    "Review your bookmarked philosophical quotations, literary excerpts, and contemplation notebook, stored locally and available 100% offline.",
  alternates: {
    canonical: "/saved",
  },
}

export default function SavedQuotesPage() {
  return (
    <PublicLayout>
      <SavedQuotesContent />
    </PublicLayout>
  )
}
