import * as React from "react"
import { PublicHeader } from "./public-header"
import { PublicFooter } from "./public-footer"

export interface PublicLayoutProps {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--page-cream)] text-[var(--ink-900)]">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  )
}
