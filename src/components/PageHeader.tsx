import type { LucideIcon } from "lucide-react"

interface PageHeaderProps {
    icon: LucideIcon
    title: string
    description: string
    titleBadge?: React.ReactNode
    action?: React.ReactNode
    children?: React.ReactNode
}

export function PageHeader({ icon: Icon, title, description, titleBadge, action, children }: PageHeaderProps) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 mb-6 shadow-[var(--shadow-card)]">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-primary/6 dark:bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-primary/4 dark:bg-primary/7 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex relative shrink-0">
                        <div className="absolute inset-[-4px] rounded-2xl bg-primary/15 blur-md pointer-events-none" />
                        <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/15 to-primary/8 border border-primary/20 shadow-sm">
                            <Icon className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                            {titleBadge}
                        </div>
                        <p className="text-muted-foreground text-sm mt-0.5">{description}</p>
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>

            {children && (
                <div className="relative mt-5">
                    {children}
                </div>
            )}
        </div>
    )
}
