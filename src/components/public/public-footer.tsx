"use client"

import * as React from "react"
import Link from "next/link"

export function PublicFooter() {
  const currentYear = new Date().getFullYear()

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer className="mt-16 border-t border-[var(--ink-900)]/12 bg-[var(--ink-900)] text-[var(--page-cream)]">
      {/* Top Banner / Mission Statement */}
      <div className="border-b border-white/10 bg-white/4 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-sand)]">
              Literary Heritage &amp; Open Knowledge
            </span>
            <p className="font-serif text-xl sm:text-2xl text-white">
              Words that outlive the centuries.
            </p>
          </div>
          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--ink-900)] font-serif font-bold italic shadow-xs">
                U
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-white">
                Uddhriti
              </span>
            </div>

            <p className="max-w-md text-xs leading-relaxed text-white/70">
              <span className="font-medium text-white/90">উদ্ধৃতি (Uddhriti)</span> is a
              curated, searchable sanctuary for timeless quotations, philosophical fragments,
              historic speeches, and literary ideas across human history.
            </p>

            <div className="pt-2 text-[11px] text-white/50 space-y-1">
              <p>Curated with verifiable attributions and historical contexts.</p>
              <p>Powered by Next.js, PostgreSQL, and open library authorities.</p>
            </div>
          </div>

          {/* Navigation Column 1: Explore */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-sand)]">
              Explore
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home &amp; Hero
                </Link>
              </li>
              <li>
                <Link href="#trending" className="hover:text-white transition-colors">
                  Trending Quotes
                </Link>
              </li>
              <li>
                <Link href="#highlights" className="hover:text-white transition-colors">
                  Featured Voices
                </Link>
              </li>
              <li>
                <Link href="#latest" className="hover:text-white transition-colors">
                  Latest Additions
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Column 2: Taxonomies & Authorities */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-sand)]">
              Taxonomies
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li>
                <Link href="/categories" className="hover:text-white transition-colors">
                  Thematic Topics
                </Link>
              </li>
              <li>
                <Link href="/authors" className="hover:text-white transition-colors">
                  Authors &amp; Thinkers
                </Link>
              </li>
              <li>
                <Link href="/tags" className="hover:text-white transition-colors">
                  Thematic Tags
                </Link>
              </li>
              <li>
                <Link href="/quotes" className="hover:text-white transition-colors">
                  Browse All Quotes
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Column 3: Administration */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-sand)]">
              Editorial
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li>
                <Link href="/admin/login" className="hover:text-white transition-colors">
                  Admin Login
                </Link>
              </li>
              <li>
                <Link href="/admin/dashboard" className="hover:text-white transition-colors">
                  Control Dashboard
                </Link>
              </li>
              <li>
                <Link href="/robots.txt" className="hover:text-white transition-colors">
                  Robots &amp; Sitemap
                </Link>
              </li>
              <li>
                <Link href="/sitemap.xml" className="hover:text-white transition-colors">
                  Sitemap XML
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Attribution */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/50 sm:flex-row">
          <p>
            &copy; {currentYear} Uddhriti Archive. All citations and excerpts belong to their
            respective authors and public domain archives.
          </p>
          <p className="text-[11px] text-white/40">
            Timeless ideas, thoughtful curation.
          </p>
        </div>
      </div>
    </footer>
  )
}
