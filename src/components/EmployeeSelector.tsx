import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Shield, Wrench } from "lucide-react"
import { useEmployee } from "@/contexts/EmployeeContext"

interface EmployeeSelectorProps {
    onSelect: (employeeId: string) => void
    selectedEmployeeId?: string | null
}

export function EmployeeSelector({ onSelect, selectedEmployeeId }: EmployeeSelectorProps) {
    const { employees } = useEmployee()

    // Sort employees: Admins first, then Alphabetical
    const sortedEmployees = [...employees].sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1
        if (a.role !== 'admin' && b.role === 'admin') return 1
        return a.name.localeCompare(b.name)
    })

    return (
        <div className="grid grid-cols-2 gap-3 py-4">
            {sortedEmployees.map((emp) => {
                const isSelected = selectedEmployeeId === emp.id

                return (
                    <Button
                        key={emp.id}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                            "h-auto py-4 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all",
                            emp.color && !isSelected && `hover:shadow-md`,
                            isSelected && "border-primary bg-primary/10 hover:bg-primary/20 text-primary ring-2 ring-primary ring-offset-2"
                        )}
                        style={emp.color && !isSelected ? { borderColor: `${emp.color}40` } : {}}
                        onClick={() => onSelect(emp.id)}
                    >
                        <Avatar className={cn("h-10 w-10 border-2", isSelected && "border-primary")} style={!isSelected ? { borderColor: emp.color || '#3b82f6' } : {}}>
                            <AvatarFallback
                                className={cn(isSelected && "bg-primary text-primary-foreground")}
                                style={!isSelected ? { backgroundColor: `${emp.color}20`, color: emp.color || 'inherit' } : {}}
                            >
                                {emp.initials || emp.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-center">
                            <span className={cn("font-medium text-sm", isSelected ? "text-primary font-bold" : "text-foreground")}>
                                {emp.name}
                            </span>
                            <span className={cn("text-[10px] uppercase flex items-center gap-1", isSelected ? "text-primary/80" : "text-muted-foreground")}>
                                {emp.role === 'admin' && <Shield className="w-3 h-3" />}
                                {emp.role === 'write' && <Wrench className="w-3 h-3" />}
                                {emp.role}
                            </span>
                        </div>
                    </Button>
                )
            })}
        </div>
    )
}
