"use client"

import * as React from "react"
import { TabSwitcher, type TabItem } from "@/components/ui"
import { formatNumber } from "@/lib/formatters"

type FolioTab = "pillars" | "standards" | "sanctuary"

export interface CuratorFolioTabsProps {
  quotesLast7Days?: number
}

function FolioCard({
  icon,
  tag,
  title,
  description,
}: {
  icon: string
  tag: string
  title: string
  description: React.ReactNode
}) {
  return (
    <article className="group rounded-2xl border border-stone-200/90 bg-white/95 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-700/30 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xl" aria-hidden="true">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
          {tag}
        </span>
      </div>
      <h3 className="mt-3 font-serif text-base font-bold text-[var(--ink-900)]">
        {title}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-[var(--ink-700)]/85">
        {description}
      </p>
    </article>
  )
}

const FOLIO_TABS: TabItem<FolioTab>[] = [
  { id: "pillars", label: "Curatorial Pillars", icon: "📜" },
  { id: "standards", label: "Editorial Standards", icon: "✒️" },
  { id: "sanctuary", label: "The Sanctuary Vision", icon: "🕊️" },
]

export function CuratorFolioTabs({ quotesLast7Days = 0 }: CuratorFolioTabsProps) {
  const [activeTab, setActiveTab] = React.useState<FolioTab>("pillars")

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <TabSwitcher
        tabs={FOLIO_TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        label="Curator Folios"
        className="border-amber-900/10 bg-amber-900/5 self-start"
      />

      {/* Active Folio Cards Display */}
      <div className="grid gap-4 sm:grid-cols-3">
        {activeTab === "pillars" && (
          <div
            id="panel-pillars"
            role="tabpanel"
            aria-labelledby="tab-pillars"
            className="contents"
          >
            <FolioCard
              icon="🏛️"
              tag="Authenticity"
              title="Anchored to original texts"
              description="Every excerpt is verified against historical manuscripts, published treatises, or recorded speeches—free from apocryphal modern misattributions."
            />
            <FolioCard
              icon="📜"
              tag="Continuity"
              title="A dialogue across eras"
              description={
                <>
                  {quotesLast7Days > 0
                    ? `${formatNumber(quotesLast7Days)} new passages joined the archive this week`
                    : "New passages join the archive every week"}
                  , keeping ancient voices in quiet, ongoing conversation with our present moment.
                </>
              }
            />
            <FolioCard
              icon="🌐"
              tag="Universality"
              title="Voices across millennia"
              description="From Stoic emperors and Upanishadic sages to poets, scientists, and reformers—human insight distilled across three thousand years of history."
            />
          </div>
        )}

        {activeTab === "standards" && (
          <div
            id="panel-standards"
            role="tabpanel"
            aria-labelledby="tab-standards"
            className="contents"
          >
            <FolioCard
              icon="🔍"
              tag="Provenance"
              title="Verifiable Citations"
              description="Citations detail title, publication or composition year, and translation context so readers can explore the parent work with confidence."
            />
            <FolioCard
              icon="⏳"
              tag="Endurance"
              title="Resonance Over Novelty"
              description="We select thoughts that transcend ephemeral news cycles—lines that illuminate human courage, grief, beauty, and philosophical wonder across generations."
            />
            <FolioCard
              icon="🖋️"
              tag="Lyrical Cadence"
              title="Craft & Poetics"
              description="Thought matters, but so does cadence. We honor language crafted with precision, musicality, and the arresting power of metaphor."
            />
          </div>
        )}

        {activeTab === "sanctuary" && (
          <div
            id="panel-sanctuary"
            role="tabpanel"
            aria-labelledby="tab-sanctuary"
            className="contents"
          >
            <FolioCard
              icon="📖"
              tag="Sanctuary"
              title="Distraction-Free"
              description="No advertisements, invasive trackers, or algorithmic noise. A calm, warm paper space crafted for contemplative reading and slow reflection."
            />
            <FolioCard
              icon="💾"
              tag="Portability"
              title="Personal Notebook"
              description="Save passages directly to your browser’s private notebook with full offline support. Your curated reflections stay accessible anywhere."
            />
            <FolioCard
              icon="🎨"
              tag="Sharing"
              title="Editorial Card Art"
              description="Generate elegant typographical quote cards ready for print or sharing, spreading memorable wisdom with visual honor."
            />
          </div>
        )}
      </div>
    </div>
  )
}

