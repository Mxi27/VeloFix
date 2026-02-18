import { isPast, isToday, format, differenceInHours, differenceInDays } from "date-fns"
import { de } from "date-fns/locale"
import { AlertTriangle, Clock, ShieldCheck, Calendar } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface UrgencyInfo {
  icon: LucideIcon
  color: string
  bg: string
  label: string
  shortLabel?: string
  isOverdue: boolean
  isDueToday: boolean
  isUrgent: boolean
}

/**
 * Calculates urgency information for orders and tasks
 * Returns consistent urgency data across the application
 */
export const getUrgencyInfo = (dueDate: string | null): UrgencyInfo => {
  if (!dueDate) {
    return {
      icon: Calendar,
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-50 dark:bg-slate-900/20",
      label: "Kein Datum",
      shortLabel: "–",
      isOverdue: false,
      isDueToday: false,
      isUrgent: false,
    }
  }

  const date = new Date(dueDate)
  const isOverdue = isPast(date) && !isToday(date)
  const dueToday = isToday(date)

  if (isOverdue) {
    return {
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20",
      label: "Überfällig",
      shortLabel: "!",
      isOverdue: true,
      isDueToday: false,
      isUrgent: true,
    }
  }

  if (dueToday) {
    return {
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      label: "Heute fällig",
      shortLabel: "Heute",
      isOverdue: false,
      isDueToday: true,
      isUrgent: true,
    }
  }

  const hoursUntil = differenceInHours(date, new Date())
  if (hoursUntil < 24) {
    return {
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      label: "Morgen fällig",
      shortLabel: "Morgen",
      isOverdue: false,
      isDueToday: false,
      isUrgent: true,
    }
  }

  const daysUntil = differenceInDays(date, new Date())
  if (daysUntil <= 3) {
    return {
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      label: `In ${daysUntil} Tagen`,
      shortLabel: `${daysUntil}T`,
      isOverdue: false,
      isDueToday: false,
      isUrgent: false,
    }
  }

  return {
    icon: ShieldCheck,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    label: format(date, "d. MMM", { locale: de }),
    shortLabel: format(date, "d.MM."),
    isOverdue: false,
    isDueToday: false,
    isUrgent: false,
  }
}

/**
 * Sort orders by urgency (overdue first, then by due date)
 */
export const sortByUrgency = <T extends { due_date: string | null }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const urgencyA = getUrgencyInfo(a.due_date)
    const urgencyB = getUrgencyInfo(b.due_date)

    // Overdue items first
    if (urgencyA.isOverdue && !urgencyB.isOverdue) return -1
    if (!urgencyA.isOverdue && urgencyB.isOverdue) return 1

    // Then by due date
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })
}

/**
 * Filter items by urgency status
 */
export const filterByUrgency = <T extends { due_date: string | null }>(
  items: T[],
  filter: 'overdue' | 'today' | 'urgent' | 'upcoming'
): T[] => {
  return items.filter(item => {
    const urgency = getUrgencyInfo(item.due_date)

    switch (filter) {
      case 'overdue':
        return urgency.isOverdue
      case 'today':
        return urgency.isDueToday
      case 'urgent':
        return urgency.isUrgent
      case 'upcoming':
        return !urgency.isOverdue && !urgency.isDueToday && !urgency.isUrgent
      default:
        return true
    }
  })
}
