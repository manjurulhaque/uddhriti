"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookmarkIcon, CloseIcon, MenuIcon, SearchIcon } from "@/components/ui/icons"
import { useSavedQuotes } from "@/lib/saved-quotes"
import { useOnlineStatus } from "@/hooks"
import { openCommandPalette } from "./command-palette"

const emptySubscribe = () => () => {}

export function PublicHeader() {
  const pathname = usePathname()
  const { count: savedCount } = useSavedQuotes()
  const isOnline = useOnlineStatus()
  const isMac = React.useSyncExternalStore(
    emptySubscribe,
    () => /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent),
    () => false
  )
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/quotes", label: "Quotes" },
    { href: "/authors", label: "Authors" },
    { href: "/categories", label: "Categories" },
    { href: "/tags", label: "Tags" },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-900/8 bg-[var(--page-cream)]/90 backdrop-blur-md transition-all pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8 lg:px-12">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="group flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-rust)] rounded-lg"
              aria-label="Quotzen Home"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ink-900)] text-white shadow-xs transition-transform duration-200 group-hover:scale-105 group-hover:bg-black">
                <span className="font-serif text-lg font-bold italic text-[var(--accent-gold)]">
                  Q
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg font-bold tracking-tight text-[var(--ink-900)] group-hover:text-[var(--accent-rust)] transition-colors">
                  Quotzen
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

          {/* Right Actions: Quick Search Trigger, Saved */}
          <div className="flex items-center gap-1.5 sm:gap-3">
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
              onClick={() => openCommandPalette()}
              className="hidden sm:flex items-center gap-2.5 rounded-full border border-stone-300/80 bg-white/80 px-3.5 py-1.5 text-xs text-stone-500 shadow-2xs hover:border-stone-400 hover:bg-white hover:text-stone-800 transition-all cursor-pointer"
              aria-label="Quick search quotes"
            >
              <SearchIcon className="h-3.5 w-3.5 text-stone-400" />
              <span>Search quotes, authors...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono text-stone-500">
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd>
            </button>

            {/* Mobile Search Button (WCAG 44x44px minimum touch target) */}
            <button
              type="button"
              onClick={() => openCommandPalette()}
              className="flex sm:hidden h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-stone-300/80 bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
              aria-label="Search"
            >
              <SearchIcon className="h-4 w-4" />
            </button>

            {/* Saved Notebook Quick Access (WCAG 44x44px touch target on mobile) */}
            <Link
              href="/saved"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 sm:px-3 py-1.5 text-xs font-medium min-h-[44px] sm:min-h-0 transition-all ${
                pathname === "/saved"
                  ? "border-[var(--accent-rust)] bg-[#c76b3e]/10 text-[var(--accent-rust)] font-semibold"
                  : "border-stone-300/80 bg-white/80 text-stone-700 hover:border-stone-400 hover:bg-white shadow-2xs"
              }`}
              title="Open your saved quotes notebook"
              aria-label="View saved quotes notebook"
            >
              <BookmarkIcon
                filled={savedCount > 0}
                className={`h-3.5 w-3.5 ${
                  savedCount > 0 ? "text-[var(--accent-rust)] fill-current" : "text-stone-400"
                }`}
              />
              <span className="hidden sm:inline">Saved Notebook</span>
              {savedCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-rust)] px-1 text-[10px] font-bold text-white">
                  {savedCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Toggle Button (WCAG 44x44px minimum touch target) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="flex md:hidden h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-stone-300/80 bg-white text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <CloseIcon className="h-4.5 w-4.5" />
              ) : (
                <MenuIcon className="h-4.5 w-4.5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200/90 bg-[var(--page-cream)] px-5 py-4 shadow-lg animate-rise">
            <nav className="flex flex-col gap-2">
              {!isOnline && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-semibold mb-1 min-h-[44px]">
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
                    className={`rounded-xl px-4 py-3 min-h-[44px] flex items-center text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-stone-900/8 text-[var(--ink-900)] font-semibold"
                        : "text-stone-800 hover:bg-stone-900/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
              <div className="pt-2 mt-2 border-t border-stone-200/70 text-center text-xs text-stone-500 px-1">
                <span>Timeless Quotes &amp; Ideas</span>
              </div>
            </nav>
          </div>
        )}
      </header>
  )
}
