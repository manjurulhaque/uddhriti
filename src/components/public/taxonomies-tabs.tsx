"use client"

import * as React from "react"

export interface TaxonomiesTabsProps {
  thinkersCount: number
  themesCount: number
  headerLeft: React.ReactNode
  thinkersSlot: React.ReactNode
  themesSlot: React.ReactNode
}

export function TaxonomiesTabs({
  thinkersCount,
  themesCount,
  headerLeft,
  thinkersSlot,
  themesSlot,
}: TaxonomiesTabsProps) {
  const [activeTab, setActiveTab] = React.useState<"thinkers" | "themes">("thinkers")

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-amber-900/10 pb-6">
        {headerLeft}

        {/* View Switcher Pills */}
        <div
          className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/90 p-1.5 shadow-2xs self-start md:self-end"
          role="tablist"
          aria-label="Taxonomy Views"
        >
          <button
            type="button"
            role="tab"
            id="tab-thinkers"
            aria-selected={activeTab === "thinkers"}
            aria-controls="panel-thinkers"
            onClick={() => setActiveTab("thinkers")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "thinkers"
                ? "bg-[var(--ink-900)] text-white shadow-xs"
                : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <span>✒️ Master Thinkers</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === "thinkers" ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              {thinkersCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-themes"
            aria-selected={activeTab === "themes"}
            aria-controls="panel-themes"
            onClick={() => setActiveTab("themes")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "themes"
                ? "bg-[var(--ink-900)] text-white shadow-xs"
                : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <span>🌿 Foundational Themes</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === "themes" ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              {themesCount}
            </span>
          </button>
        </div>
      </div>

      {/* Thinkers View */}
      <div
        id="panel-thinkers"
        role="tabpanel"
        aria-labelledby="tab-thinkers"
        className={activeTab === "thinkers" ? "block" : "hidden"}
      >
        {thinkersSlot}
      </div>

      {/* Themes View */}
      <div
        id="panel-themes"
        role="tabpanel"
        aria-labelledby="tab-themes"
        className={activeTab === "themes" ? "block" : "hidden"}
      >
        {themesSlot}
      </div>
    </div>
  )
}
