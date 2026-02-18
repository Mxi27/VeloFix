import { Button } from "@/components/ui/button"
import { Plus, QrCode, FileText, Users, Wrench } from "lucide-react"
import { useNavigate } from "react-router-dom"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface QuickActionsProps {
  className?: string
}

export const QuickActions = ({ className }: QuickActionsProps) => {
  const navigate = useNavigate()

  const actions = [
    {
      icon: Plus,
      label: "Neuer Auftrag",
      shortcut: "⌘N",
      action: () => navigate("/dashboard/orders/new"),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: QrCode,
      label: "QR scannen",
      shortcut: "⌘K",
      action: () => navigate("/dashboard/scan"),
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: Users,
      label: "Mitarbeiter",
      shortcut: "⌘U",
      action: () => navigate("/dashboard/employees"),
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      icon: Wrench,
      label: "Aufgaben",
      shortcut: "⌘T",
      action: () => navigate("/dashboard/tasks"),
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className={cn(
            "gap-2 shadow-sm hover:shadow-md transition-all duration-200",
            "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            className
          )}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Schnellaktion</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Schnellaktionen</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <DropdownMenuItem
                key={action.label}
                onClick={action.action}
                className="gap-3 cursor-pointer"
              >
                <div className={cn("p-1.5 rounded-md", action.bgColor)}>
                  <Icon className={cn("h-4 w-4", action.color)} />
                </div>
                <span className="font-medium">{action.label}</span>
                <DropdownMenuShortcut className="ml-auto text-xs text-muted-foreground">
                  {action.shortcut}
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => navigate("/dashboard/reports")}
            className="gap-3 cursor-pointer"
          >
            <div className="p-1.5 rounded-md bg-slate-100">
              <FileText className="h-4 w-4 text-slate-600" />
            </div>
            <span className="font-medium">Berichte</span>
            <DropdownMenuShortcut className="ml-auto text-xs text-muted-foreground">
              ⌘R
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
