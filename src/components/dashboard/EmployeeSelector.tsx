import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Users } from "lucide-react"

interface Employee {
    id: string
    name: string
    color_code?: string
}

interface EmployeeSelectorProps {
    employees: Employee[]
    selectedId: string | undefined
    onSelect: (id: string) => void
    label?: string
}

export const EmployeeSelector = ({ employees, selectedId, onSelect, label = "Ansicht für:" }: EmployeeSelectorProps) => {
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
                {label}
            </span>
            <Select value={selectedId} onValueChange={onSelect}>
                <SelectTrigger className="w-[180px] h-9 bg-background/60 backdrop-blur-sm border-blue-500/20 focus:ring-blue-500/20">
                    <div className="flex items-center gap-2 truncate">
                        <Users className="h-4 w-4 text-primary/70" />
                        <SelectValue placeholder="Mitarbeiter wählen" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id} className="cursor-pointer">
                            <div className="flex items-center gap-2">
                                {emp.color_code && (
                                    <div
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: emp.color_code }}
                                    />
                                )}
                                {emp.name}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
