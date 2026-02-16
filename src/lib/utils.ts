import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, differenceInDays, differenceInHours } from "date-fns"
import { de } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date relative to now in German
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const days = differenceInDays(date, now)
  const hours = differenceInHours(date, now)

  if (days === 0) {
    if (hours < 1) return "Jetzt"
    return `Heute, ${format(date, "HH:mm", { locale: de })}`
  }
  if (days === 1) return "Morgen"
  if (days < 7) return format(date, "EEEE", { locale: de })
  return format(date, "dd. MMM", { locale: de })
}
