import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"

function DashboardInner({ children, fullWidth }: { children: React.ReactNode, fullWidth?: boolean }) {
    const { state } = useSidebar()
    const isCollapsed = state === "collapsed"

    return (
        <SidebarInset className={cn("min-w-0 bg-background relative", fullWidth && "h-svh overflow-hidden")}>
            {/* Floating trigger on desktop when sidebar is closed */}
            {isCollapsed && (
                <div className="hidden md:flex absolute top-[21px] left-4 z-50">
                    <SidebarTrigger className="h-8 w-8 !p-0 shadow-sm border border-border bg-background hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors" />
                </div>
            )}
            
            {/* Mobile header with sidebar trigger */}
            <header className="flex md:hidden items-center h-12 px-4 border-b border-border">
                <SidebarTrigger />
            </header>

            {/* Notion document layout — generous padding, no arbitrary max-width */}
            <div className={cn(
                "flex-1 min-h-0 min-w-0 w-full overflow-x-hidden",
                fullWidth
                    ? "flex flex-col overflow-hidden"
                    : "py-8 px-4 sm:py-12 sm:px-10 xl:px-16 overflow-y-auto"
            )}>
                {children}
            </div>
        </SidebarInset>
    )
}

export function DashboardLayout({
    children,
    onOrderCreated,
    fullWidth = false
}: {
    children: React.ReactNode,
    onOrderCreated?: () => void,
    fullWidth?: boolean
}) {
    return (
        <SidebarProvider>
            <AppSidebar onOrderCreated={onOrderCreated} />
            <DashboardInner fullWidth={fullWidth}>
                {children}
            </DashboardInner>
        </SidebarProvider>
    )
}

