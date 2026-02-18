import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Filter, X, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

export type UrgencyFilter = 'all' | 'overdue' | 'today' | 'urgent' | 'upcoming'

interface CockpitFiltersProps {
  activeFilter: UrgencyFilter
  onFilterChange: (filter: UrgencyFilter) => void
  counts: {
    all: number
    overdue: number
    today: number
    urgent: number
    upcoming: number
  }
}

const FILTER_CONFIG: Record<UrgencyFilter, { label: string; color: string; bgColor: string }> = {
  all: { label: 'Alle', color: 'text-slate-600', bgColor: 'bg-slate-50' },
  overdue: { label: 'Überfällig', color: 'text-red-600', bgColor: 'bg-red-50' },
  today: { label: 'Heute', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  urgent: { label: 'Dringend', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  upcoming: { label: 'Demnächst', color: 'text-blue-600', bgColor: 'bg-blue-50' },
}

export const CockpitFilters = ({ activeFilter, onFilterChange, counts }: CockpitFiltersProps) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <div className="flex items-center gap-1.5 px-2 shrink-0">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Filter:</span>
      </div>

      {(Object.keys(FILTER_CONFIG) as UrgencyFilter[]).map((filter) => {
        const config = FILTER_CONFIG[filter]
        const count = counts[filter]
        const isActive = activeFilter === filter

        return (
          <Button
            key={filter}
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange(filter)}
            className={cn(
              "h-7 gap-1.5 px-3 text-xs font-medium rounded-full transition-all duration-200 shrink-0",
              "hover:scale-105 active:scale-95",
              isActive
                ? `${config.bgColor} ${config.color} border-2 border-current shadow-sm`
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            {config.label}
            <Badge
              variant="secondary"
              className={cn(
                "h-4 px-1.5 text-[10px] font-bold",
                isActive ? `${config.bgColor} ${config.color}` : "bg-background"
              )}
            >
              {count}
            </Badge>
            {isActive && (
              <X className="h-3 w-3 ml-0.5 opacity-70" />
            )}
          </Button>
        )
      })}
    </div>
  )
}
