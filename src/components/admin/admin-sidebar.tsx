"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { openAdminCommandPalette } from "./admin-command-palette"
import {
  ActivityIcon,
  AuthorsIcon,
  CategoriesIcon,
  CloseIcon,
  CollectionsIcon,
  DashboardIcon,
  ExternalLinkIcon,
  FaqsIcon,
  LogoutIcon,
  MenuIcon,
  PlusIcon,
  QuotesIcon,
  SearchIcon,
  SourcesIcon,
  TagsIcon,
  ToolsIcon,
  ShieldAlertIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/ui/icons"

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

// Default structured navigation sections
export const defaultAdminNavSections: AdminNavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/admin/dashboard",
        label: "Dashboard",
        icon: <DashboardIcon />,
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
        icon: <QuotesIcon />,
      },
      {
        href: "/admin/quotes/new",
        label: "Submit Quote",
        icon: <PlusIcon />,
        exact: true,
      },
      {
        href: "/admin/quotes/bulk",
        label: "Bulk Upload Quotes",
        icon: <UploadIcon />,
        exact: true,
      },
      {
        href: "/admin/quotes/deleted",
        label: "Deleted Quotes",
        icon: <TrashIcon />,
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
        icon: <AuthorsIcon />,
      },
      {
        href: "/admin/categories",
        label: "Categories",
        icon: <CategoriesIcon />,
      },
      {
        href: "/admin/tags",
        label: "Tags",
        icon: <TagsIcon />,
      },
      {
        href: "/admin/collections",
        label: "Collections",
        icon: <CollectionsIcon />,
      },
    ],
  },
  {
    title: "Resources & FAQs",
    items: [
      {
        href: "/admin/sources",
        label: "Sources",
        icon: <SourcesIcon />,
      },
      {
        href: "/admin/sources/bulk",
        label: "Import Sources",
        icon: <UploadIcon />,
        exact: true,
      },
      {
        href: "/admin/faqs",
        label: "FAQs",
        icon: <FaqsIcon />,
      },
      {
        href: "/admin/faqs/bulk",
        label: "Import FAQs",
        icon: <UploadIcon />,
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
        icon: <ActivityIcon />,
      },
      {
        href: "/admin/tools",
        label: "System Health & Tools",
        icon: <ToolsIcon />,
      },
      {
        href: "/admin/tools/hallucination-detector",
        label: "Hallucination Detector",
        icon: <ShieldAlertIcon />,
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

          {/* Mobile close button (WCAG 44x44px touch target) */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            aria-label="Close navigation"
          >
            <CloseIcon className="w-5 h-5" />
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
            <SearchIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition" />
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
            <ExternalLinkIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
            <span>View Public Site</span>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">↗</span>
        </Link>

        <form action="/admin/logout" method="POST">
          <button
            type="submit"
            className="w-full group flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
          >
            <LogoutIcon className="w-3.5 h-3.5 text-red-500 group-hover:text-red-600" />
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
          className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          aria-label="Open navigation menu"
        >
          <MenuIcon className="w-5 h-5" />
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
