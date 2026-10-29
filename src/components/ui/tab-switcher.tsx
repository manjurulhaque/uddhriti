"use client"

import * as React from "react"

export interface TabItem<T extends string = string> {
  id: T
  label: string
  icon?: React.ReactNode
  badge?: string | number
}

export interface TabSwitcherProps<T extends string = string> {
  tabs: TabItem<T>[]
  activeTab: T
  onChange: (tabId: T) => void
  label?: string
  className?: string
}

export function TabSwitcher<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  label = "Views",
  className = "",
}: TabSwitcherProps<T>) {
  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      const nextTab = tabs[(index + 1) % tabs.length]
      onChange(nextTab.id)
      document.getElementById(`tab-${nextTab.id}`)?.focus()
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      const prevTab = tabs[(index - 1 + tabs.length) % tabs.length]
      onChange(prevTab.id)
      document.getElementById(`tab-${prevTab.id}`)?.focus()
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/90 p-1.5 shadow-2xs ${className}`}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              isActive
                ? "bg-[var(--ink-900)] text-white shadow-xs"
                : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

