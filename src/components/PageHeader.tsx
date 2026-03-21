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
        <div className="mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        {title}
                    </h1>
                    {titleBadge}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>

            {description && (
                <p className="text-sm text-muted-foreground mt-1">
                    {description}
                </p>
            )}

            {children && (
                <div className="mt-4">{children}</div>
            )}
        </div>
    )
}
