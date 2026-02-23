import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

import { cn } from "@/lib/utils"

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
            <SidebarInset className={cn("min-w-0 bg-background", fullWidth && "h-svh overflow-hidden")}>
                <header className="flex h-14 items-center gap-4 border-b bg-background px-6 flex-shrink-0">
                    <SidebarTrigger />
                    <div className="w-[1px] h-4 bg-border" />
                    <span className="font-medium text-sm">Dashboard</span>
                </header>
                <div className={cn(
                    "flex-1 min-h-0 min-w-0 w-full overflow-x-hidden",
                    fullWidth ? "flex flex-col overflow-hidden" : "p-4 md:p-10 space-y-8 overflow-y-auto"
                )}>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
