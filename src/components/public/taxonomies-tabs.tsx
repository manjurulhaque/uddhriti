"use client"

import * as React from "react"
import { TabSwitcher, type TabItem } from "@/components/ui"

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

  const tabs: TabItem<"thinkers" | "themes">[] = [
    {
      id: "thinkers",
      label: "Master Thinkers",
      icon: "✒️",
      badge: thinkersCount,
    },
    {
      id: "themes",
      label: "Foundational Themes",
      icon: "🌿",
      badge: themesCount,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-amber-900/10 pb-6">
        {headerLeft}

        {/* View Switcher Pills */}
        <TabSwitcher
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          label="Taxonomy Views"
          className="self-start md:self-end"
        />
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
