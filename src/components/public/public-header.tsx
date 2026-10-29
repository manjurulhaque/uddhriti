"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Modal } from "../ui/modal"
import { useSavedQuotes } from "@/lib/saved-quotes"
import { useOnlineStatus } from "@/hooks"

export function PublicHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { count: savedCount } = useSavedQuotes()
  const isOnline = useOnlineStatus()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [searchModalOpen, setSearchModalOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchModalOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/quotes", label: "Quotes" },
    { href: "/authors", label: "Authors" },
    { href: "/categories", label: "Categories" },
    { href: "/tags", label: "Tags" },
    { href: "/saved", label: "Saved" },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-stone-900/8 bg-[var(--page-cream)]/90 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="group flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-rust)] rounded-lg"
              aria-label="Uddhriti Home"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ink-900)] text-white shadow-xs transition-transform duration-200 group-hover:scale-105 group-hover:bg-black">
                <span className="font-serif text-lg font-bold italic text-[var(--accent-gold)]">
                  U
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg font-bold tracking-tight text-[var(--ink-900)] group-hover:text-[var(--accent-rust)] transition-colors">
                  Uddhriti
                </span>
                <span className="text-[10px] uppercase tracking-[0.22em] text-stone-500 -mt-1 font-sans">
                  Quotes &amp; Ideas
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              {navLinks.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors ${
                      isActive
                        ? "bg-stone-900/8 text-[var(--ink-900)] font-semibold"
                        : "text-stone-700 hover:bg-stone-900/5 hover:text-stone-950"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right Actions: Quick Search Trigger, Saved, & Admin */}
          <div className="flex items-center gap-3">
            {/* Offline Mode Indicator */}
            {!isOnline && (
              <div
                title="You are currently browsing offline. Cached quotes and your saved notebook remain accessible."
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-800 animate-pulse"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Offline Mode</span>
              </div>
            )}

            {/* Search Trigger Button */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="hidden sm:flex items-center gap-2.5 rounded-full border border-stone-300/80 bg-white/80 px-3.5 py-1.5 text-xs text-stone-500 shadow-2xs hover:border-stone-400 hover:bg-white hover:text-stone-800 transition-all cursor-pointer"
              aria-label="Quick search quotes"
            >
              <svg
                className="h-3.5 w-3.5 text-stone-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span>Search quotes, authors...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono text-stone-500">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Search Button */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex sm:hidden h-9 w-9 items-center justify-center rounded-full border border-stone-300/80 bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50"
              aria-label="Search"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Saved Quotes Quick Access */}
            <Link
              href="/saved"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                pathname === "/saved"
                  ? "border-[var(--accent-rust)] bg-[#c76b3e]/10 text-[var(--accent-rust)] font-semibold"
                  : "border-stone-300/80 bg-white/80 text-stone-700 hover:border-stone-400 hover:bg-white shadow-2xs"
              }`}
              aria-label="View saved quotes notebook"
            >
              <svg
                className={`h-3.5 w-3.5 ${
                  savedCount > 0 ? "text-[var(--accent-rust)] fill-current" : "text-stone-400"
                }`}
                fill={savedCount > 0 ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <span className="hidden sm:inline">Saved</span>
              {savedCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-rust)] px-1 text-[10px] font-bold text-white">
                  {savedCount}
                </span>
              )}
            </Link>

            {/* Admin Entry Link */}
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-900/12 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-800 shadow-2xs hover:bg-stone-900 hover:text-white transition-all"
            >
              <svg
                className="h-3.5 w-3.5 opacity-70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Admin</span>
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-full border border-stone-300/80 bg-white text-stone-700 hover:bg-stone-100"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200/90 bg-[var(--page-cream)] px-5 py-4 shadow-lg animate-rise">
            <nav className="flex flex-col gap-2">
              {!isOnline && (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-semibold mb-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Offline Mode • Viewing Cached Quotes</span>
                </div>
              )}
              {navLinks.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-stone-900/8 text-[var(--ink-900)] font-semibold"
                        : "text-stone-800 hover:bg-stone-900/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
              <div className="pt-2 mt-2 border-t border-stone-200/70 flex justify-between items-center text-xs text-stone-500 px-1">
                <span>Timeless Quotes &amp; Ideas</span>
                <Link href="/admin/login" className="text-[var(--accent-rust)] font-medium">
                  Login &rarr;
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Quick Search Modal */}
      <Modal
        isOpen={searchModalOpen}
        onClose={() => {
          setSearchModalOpen(false)
          setSearchQuery("")
        }}
        title="Quick Search"
        description="Search quotations, authors, or literary topics"
      >
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (searchQuery.trim()) {
                setSearchModalOpen(false)
                router.push(`/quotes?q=${encodeURIComponent(searchQuery.trim())}`)
              }
            }}
            className="relative"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by quote, author name, or topic..."
              autoFocus
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 pl-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
            <svg
              className="absolute left-3.5 top-3 h-4 w-4 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </form>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Quick Suggestions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["Wisdom", "Courage", "Truth", "Marcus Aurelius", "Rumi", "Freedom"].map(
                (term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setSearchModalOpen(false)
                      router.push(`/quotes?q=${encodeURIComponent(term)}`)
                    }}
                    className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 hover:border-stone-400 hover:bg-stone-50 transition-colors"
                  >
                    #{term}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
            <span>Press Enter to search, ESC to dismiss</span>
            <span className="font-mono text-[11px]">Uddhriti Archive</span>
          </div>
        </div>
      </Modal>
    </>
  )
}
