import * as React from "react"
import { EmptyState } from "../ui/empty-state"

export interface MiniBarChartProps {
  data: { label: string; value: number }[]
  className?: string
  width?: number
  height?: number
}

export function MiniBarChart({
  data,
  className = "",
  width = 560,
  height = 180,
}: MiniBarChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No chart data available"
        description="Daily published counts will appear here as quotes are created."
        variant="stone"
      />
    )
  }

  const chartTop = 12
  const chartHeight = 120
  const horizontalPadding = 12
  const availableWidth = width - horizontalPadding * 2
  const gap = data.length > 20 ? 6 : 16
  const barWidth = Math.max(
    8,
    Math.floor((availableWidth - gap * Math.max(data.length - 1, 0)) / data.length)
  )
  const xStep = barWidth + gap
  const maxValue = Math.max(...data.map((entry) => entry.value), 1)
  const peakValue = Math.max(...data.map((entry) => entry.value))
  const gridLines = [0.25, 0.5, 0.75, 1]
  const labelEvery = data.length > 20 ? 3 : 1

  return (
    <div
      className={`space-y-3 rounded-[22px] border border-stone-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#fafaf9_100%)] p-4 shadow-sm ${className}`}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {gridLines.map((line) => {
          const y = chartTop + chartHeight - chartHeight * line
          return (
            <line
              key={line}
              x1="0"
              x2={width}
              y1={y}
              y2={y}
              stroke="#e7e5e4"
              strokeDasharray="4 4"
            />
          )
        })}
        {data.map((entry, index) => {
          const x = horizontalPadding + index * xStep
          const barHeight =
            maxValue === 0
              ? 0
              : Math.max((entry.value / maxValue) * chartHeight, entry.value > 0 ? 4 : 0)
          const y = chartTop + (chartHeight - barHeight)
          const isPeak = entry.value === peakValue && peakValue > 0

          return (
            <g key={`${entry.label}-${index}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill={isPeak ? "#d97706" : "#0f172a"}
                className="transition-all duration-300 hover:opacity-80"
              />
              {index % labelEvery === 0 ? (
                <text
                  x={x + barWidth / 2}
                  y={chartTop + chartHeight + 18}
                  textAnchor="middle"
                  className="fill-stone-500 text-[10px]"
                >
                  {entry.label}
                </text>
              ) : null}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-stone-700 text-[10px] font-medium"
              >
                {entry.value}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 pt-1">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
          Daily published count
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
          Peak day
        </span>
      </div>
    </div>
  )
}
