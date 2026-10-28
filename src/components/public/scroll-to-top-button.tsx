"use client"

import * as React from "react"

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
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  )
}

