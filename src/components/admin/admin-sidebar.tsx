"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { openAdminCommandPalette } from "./admin-command-palette"

export interface AdminNavItem {
  href: string
  label: string
  icon?: React.ReactNode
  badge?: string | number | React.ReactNode
  exact?: boolean
}

export interface AdminNavSection {
  title?: string
  items: AdminNavItem[]
}

export interface AdminSidebarProps {
  admin: {
    email: string
    role: string
  }
  requestIp?: {
    value: string
    source: string | null
  }
  ipDisplay?: React.ReactNode
  className?: string
  sections?: AdminNavSection[]
}

function emptySubscribe() {
  return () => {}
}

function IconSearch({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

// Built-in minimalist SVG icons
function IconDashboard({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

function IconQuotes({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-6 4h8M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  )
}

function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

function IconUpload({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}

function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function IconAuthors({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function IconCategories({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
}

function IconTags({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}

function IconCollections({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function IconSources({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function IconFaqs({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconTools({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconActivity({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconExternal({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

function IconLogout({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function IconMenu({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function IconClose({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// Default structured navigation sections
export const defaultAdminNavSections: AdminNavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/admin/dashboard",
        label: "Dashboard",
        icon: <IconDashboard />,
        exact: true,
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        href: "/admin/quotes",
        label: "Quotes",
        icon: <IconQuotes />,
      },
      {
        href: "/admin/quotes/new",
        label: "Submit Quote",
        icon: <IconPlus />,
        exact: true,
      },
      {
        href: "/admin/quotes/bulk",
        label: "Bulk Upload Quotes",
        icon: <IconUpload />,
        exact: true,
      },
      {
        href: "/admin/quotes/deleted",
        label: "Deleted Quotes",
        icon: <IconTrash />,
        exact: true,
      },
    ],
  },
  {
    title: "Taxonomy",
    items: [
      {
        href: "/admin/authors",
        label: "Authors",
        icon: <IconAuthors />,
      },
      {
        href: "/admin/categories",
        label: "Categories",
        icon: <IconCategories />,
      },
      {
        href: "/admin/tags",
        label: "Tags",
        icon: <IconTags />,
      },
      {
        href: "/admin/collections",
        label: "Collections",
        icon: <IconCollections />,
      },
    ],
  },
  {
    title: "Resources & FAQs",
    items: [
      {
        href: "/admin/sources",
        label: "Sources",
        icon: <IconSources />,
      },
      {
        href: "/admin/sources/bulk",
        label: "Import Sources",
        icon: <IconUpload />,
        exact: true,
      },
      {
        href: "/admin/faqs",
        label: "FAQs",
        icon: <IconFaqs />,
      },
      {
        href: "/admin/faqs/bulk",
        label: "Import FAQs",
        icon: <IconUpload />,
        exact: true,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        href: "/admin/activity",
        label: "Activity & Audit Log",
        icon: <IconActivity />,
      },
      {
        href: "/admin/tools",
        label: "System Health & Tools",
        icon: <IconTools />,
      },
    ],
  },
]

/**
 * Determines whether a nav item is the most specific active match for the given pathname.
 */
function isItemActive(pathname: string, item: AdminNavItem, allItems: AdminNavItem[]): boolean {
  if (item.exact || item.href === "/admin/dashboard") {
    return pathname === item.href
  }

  if (pathname === item.href) {
    return true
  }

  if (pathname.startsWith(item.href + "/")) {
    const hasMoreSpecificMatch = allItems.some(
      (other) =>
        other.href !== item.href &&
        other.href.startsWith(item.href) &&
        (pathname === other.href || pathname.startsWith(other.href + "/"))
    )
    return !hasMoreSpecificMatch
  }

  return false
}

export function AdminSidebar({
  admin,
  requestIp,
  ipDisplay,
  className = "",
  sections = defaultAdminNavSections,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const isMac = React.useSyncExternalStore(
    emptySubscribe,
    () => /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent),
    () => false
  )

  // Flatten all items for accurate longest-prefix active route matching
  const allItems = React.useMemo(() => {
    return sections.flatMap((section) => section.items)
  }, [sections])

  // Reset mobile drawer on pathname transition during render (avoids cascading effect renders)
  const [prevPathname, setPrevPathname] = React.useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMobileOpen(false)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand & User Profile Header */}
      <div className="p-5 border-b border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
            <span className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs group-hover:bg-neutral-800 transition">
              U
            </span>
            <div>
              <h2 className="font-bold text-base text-gray-900 leading-tight">Admin Panel</h2>
              <p className="text-[11px] text-gray-400">Quotzen Engine</p>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition"
            aria-label="Close navigation"
          >
            <IconClose />
          </button>
        </div>

        {/* User Info Card */}
        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200/70">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-xs font-medium text-gray-800 truncate"
              title={admin.email}
            >
              {admin.email}
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              {admin.role}
            </span>
          </div>

          {/* Current IP Display */}
          <div className="mt-2 pt-2 border-t border-gray-200/50">
            <span className="text-[10px] font-medium text-gray-400 block mb-0.5 uppercase tracking-wider">
              Connected IP
            </span>
            {ipDisplay ? (
              ipDisplay
            ) : requestIp ? (
              <div>
                <p className="text-xs font-mono text-gray-700 truncate">{requestIp.value}</p>
                {requestIp.source && (
                  <p className="text-[10px] text-gray-400 mt-0.5">via {requestIp.source}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Command Palette Launcher Button */}
        <button
          type="button"
          onClick={() => openAdminCommandPalette()}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-500 bg-white hover:bg-gray-100 hover:text-gray-900 border border-gray-200/90 rounded-lg shadow-2xs transition cursor-pointer group"
          title={`Open Admin Command Palette (${isMac ? "⌘K" : "Ctrl+K"})`}
        >
          <span className="flex items-center gap-2">
            <IconSearch className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition" />
            <span>Search or jump to...</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-gray-100 text-gray-500 rounded border border-gray-200 group-hover:border-gray-300">
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </button>
      </div>

      {/* Navigation Sections */}
      <nav
        className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin scrollbar-thumb-gray-200"
        aria-label="Admin Navigation"
      >
        {sections.map((section, idx) => (
          <div key={section.title || idx} className="space-y-0.5">
            {section.title && (
              <h3 className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {section.title}
              </h3>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isItemActive(pathname, item, allItems)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? "bg-neutral-900 text-white shadow-xs font-semibold"
                          : "text-gray-600 hover:text-gray-950 hover:bg-gray-100/80"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.icon && (
                          <span
                            className={`shrink-0 transition-colors ${
                              active
                                ? "text-white"
                                : "text-gray-400 group-hover:text-gray-700"
                            }`}
                          >
                            {item.icon}
                          </span>
                        )}
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded shrink-0 ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer / Utilities */}
      <div className="p-3 border-t border-gray-100 space-y-1 bg-white">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
        >
          <div className="flex items-center gap-2">
            <IconExternal className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
            <span>View Public Site</span>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">↗</span>
        </Link>

        <form action="/admin/logout" method="POST">
          <button
            type="submit"
            className="w-full group flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
          >
            <IconLogout className="w-3.5 h-3.5 text-red-500 group-hover:text-red-600" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
            U
          </span>
          <span className="font-bold text-sm text-gray-900">Admin Panel</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition"
          aria-label="Open navigation menu"
        >
          <IconMenu />
        </button>
      </div>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0 z-30 ${className}`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
