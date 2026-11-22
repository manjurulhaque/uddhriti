import * as React from "react"
import { PublicHeader } from "./public-header"
import { PublicFooter } from "./public-footer"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { SavedQuotesProvider } from "@/lib/saved-quotes"

export interface PublicLayoutProps {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <SavedQuotesProvider>
      <div className="min-h-screen flex flex-col bg-[var(--page-cream)] text-[var(--ink-900)] w-full max-w-full overflow-x-clip">
        <PublicHeader />
        <div className="flex-1 pb-16 md:pb-0 w-full max-w-full min-w-0">{children}</div>
        <PublicFooter />
        <MobileBottomNav />
      </div>
    </SavedQuotesProvider>
  )
}
