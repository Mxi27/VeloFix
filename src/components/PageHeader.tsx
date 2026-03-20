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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-orange-500/5 border border-primary/10 p-6 mb-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <Icon className="h-6 w-6 text-primary" />
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
