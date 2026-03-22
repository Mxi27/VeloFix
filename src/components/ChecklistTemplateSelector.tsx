import React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChecklistTemplate } from "@/types/checklist"

interface ChecklistTemplateSelectorProps {
    templates: ChecklistTemplate[]
    selectedTemplateIds: string[]
    onToggleTemplate: (templateId: string) => void
    onClearAll: () => void
    alreadySelectedIds?: string[]
}

export const ChecklistTemplateSelector: React.FC<ChecklistTemplateSelectorProps> = ({
    templates,
    selectedTemplateIds,
    onToggleTemplate,
    onClearAll,
    alreadySelectedIds = []
}) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 p-1">
                <div
                    className={cn(
                        "flex items-center p-4 border rounded-lg cursor-pointer transition-all",
                        selectedTemplateIds.length === 0
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:bg-accent/50"
                    )}
                    onClick={onClearAll}
                >
                    <div className="flex-1">
                        <h4 className="font-medium">Keine Vorlage</h4>
                        <p className="text-sm text-muted-foreground">Leere Checkliste starten</p>
                    </div>
                    {selectedTemplateIds.length === 0 && <Check className="h-5 w-5 text-primary" />}
                </div>
                
                {templates.map(template => {
                    const isSelected = selectedTemplateIds.includes(template.id)
                    const isAlreadyInUse = alreadySelectedIds.includes(template.id)
                    
                    return (
                        <div
                            key={template.id}
                            className={cn(
                                "flex items-center p-4 border rounded-lg cursor-pointer transition-all relative group",
                                isSelected
                                    ? "border-primary bg-primary/5 outline outline-1 outline-primary"
                                    : "border-border hover:bg-accent/50"
                            )}
                            onClick={() => onToggleTemplate(template.id)}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{template.name}</h4>
                                    {isAlreadyInUse && (
                                        <span className="text-[10px] bg-primary/10 px-1.5 py-0.5 rounded-full text-primary font-medium uppercase tracking-wider">
                                            Aktiv
                                        </span>
                                    )}
                                </div>
                                {template.description && (
                                    <p className="text-sm text-muted-foreground">{template.description}</p>
                                )}
                            </div>
                            {isSelected && <Check className="h-5 w-5 text-primary" />}
                        </div>
                    )
                })}

                {templates.length === 0 && (
                    <div className="text-center p-6 border border-dashed rounded-lg text-muted-foreground">
                        <p>Keine Vorlagen gefunden.</p>
                        <p className="text-sm">Erstellen Sie Vorlagen in den Einstellungen.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
