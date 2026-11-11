"use client"

import * as React from "react"
import { ArrowUpIcon } from "@/components/ui/icons"

export function ScrollToTopButton() {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-white/90 hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer"
      aria-label="Scroll back to top"
    >
      <span>Back to Top</span>
      <ArrowUpIcon className="h-3.5 w-3.5" />
    </button>
  )
}

