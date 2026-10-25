import * as React from "react"
import Link from "next/link"

interface LegalNavProps {
  currentPath: "/privacy" | "/terms" | "/copyright" | "/cookies"
}

const legalPages = [
  {
    href: "/privacy",
    label: "Privacy Policy",
    description: "Data handling, analytics, and privacy commitments",
  },
  {
    href: "/terms",
    label: "Terms of Service",
    description: "Permitted use, archive access, and conditions",
  },
  {
    href: "/copyright",
    label: "Copyright & DMCA",
    description: "Fair use doctrine, attribution & takedown requests",
  },
  {
    href: "/cookies",
    label: "Cookie Policy",
    description: "Web storage, analytics, and consent management",
  },
]

export function LegalNav({ currentPath }: LegalNavProps) {
  return (
    <div className="space-y-4">
      {/* Navigation Pills */}
      <nav aria-label="Legal documents" className="flex flex-wrap gap-2">
        {legalPages.map((page) => {
          const isActive = currentPath === page.href
          return (
            <Link
              key={page.href}
              href={page.href}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium tracking-wide transition-all ${
                isActive
                  ? "bg-[var(--ink-900)] text-white shadow-xs"
                  : "bg-white/80 text-stone-700 border border-stone-200/80 hover:bg-white hover:border-stone-300 hover:text-stone-950"
              }`}
            >
              <span>{page.label}</span>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)]" aria-hidden="true" />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
