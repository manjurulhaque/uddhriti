/**
 * Utility functions for formatting numbers, currency, and percentages.
 */

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value)
}

export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
}
