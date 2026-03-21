import type { LucideIcon } from "lucide-react"

interface PageHeaderProps {
    icon?: LucideIcon
    title: string
    description?: string
    titleBadge?: React.ReactNode
    action?: React.ReactNode
    children?: React.ReactNode
}

export function PageHeader({ title, description, titleBadge, action, children }: PageHeaderProps) {
    return (
        <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-[26px] font-bold leading-[1.15] tracking-[-0.01em] text-foreground">
                        {title}
                    </h1>
                    {titleBadge}
                </div>
                {action && <div className="shrink-0 sm:pt-1">{action}</div>}
            </div>

            {description && (
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                    {description}
                </p>
            )}

            {children && (
                <div className="mt-4">{children}</div>
            )}
        </div>
    )
}
