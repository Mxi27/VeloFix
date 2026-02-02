import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { useEmployee } from "@/contexts/EmployeeContext"
import { EmployeeSelector } from "./EmployeeSelector"

interface EmployeeSelectionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    triggerAction?: string // Optional context, e.g. "Start Service"
    onEmployeeSelected?: (employeeId: string) => void
}

export function EmployeeSelectionModal({ open, onOpenChange, triggerAction, onEmployeeSelected }: EmployeeSelectionModalProps) {
    const { selectEmployee } = useEmployee()

    const handleSelect = (employeeId: string) => {
        if (onEmployeeSelected) {
            onEmployeeSelected(employeeId)
        } else {
            selectEmployee(employeeId)
        }
        onOpenChange(false)
    }



    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Wer bearbeitet diesen Schritt?</DialogTitle>
                    <DialogDescription>
                        {triggerAction ? `Um "${triggerAction}" auszuführen, wähle bitte deinen Namen.` : "Bitte wähle deinen Namen aus der Liste."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 py-4">
                    <EmployeeSelector onSelect={handleSelect} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
