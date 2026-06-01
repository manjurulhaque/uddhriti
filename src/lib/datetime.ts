export const APP_TIME_ZONE = "Asia/Kolkata"
const APP_TIME_ZONE_OFFSET_MINUTES = 5 * 60 + 30

function getFormatter(
  options: Intl.DateTimeFormatOptions,
  locale = "en-US"
) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIME_ZONE,
    ...options,
  })
}

export function formatDateInAppTimeZone(value: Date | string, locale = "en-US") {
  return getFormatter(
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
    locale
  ).format(new Date(value))
}

export function formatDateTimeInAppTimeZone(value: Date | string, locale = "en-US") {
  return getFormatter(
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    },
    locale
  ).format(new Date(value))
}

export function formatDateTimeLocalInAppTimeZone(value: Date | string) {
  const parts = getFormatter({
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value))
  const partByType = new Map(parts.map((part) => [part.type, part.value]))

  return `${partByType.get("year")}-${partByType.get("month")}-${partByType.get("day")}T${partByType.get("hour")}:${partByType.get("minute")}`
}

export function parseDateTimeLocalInAppTimeZone(value: Date | string) {
  if (value instanceof Date) return value

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return new Date(value)

  const [, year, month, day, hour, minute, second = "0"] = match
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ) -
      APP_TIME_ZONE_OFFSET_MINUTES * 60 * 1000
  )
}

export function formatShortDateInAppTimeZone(value: Date | string, locale = "en-US") {
  return getFormatter(
    {
      month: "short",
      day: "numeric",
    },
    locale
  ).format(new Date(value))
}

export function subtractDays(value: Date, days: number) {
  return new Date(value.getTime() - days * 24 * 60 * 60 * 1000)
}
