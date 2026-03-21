import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
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
                {/* Notion document layout — generous padding, no arbitrary max-width */}
                <div className={cn(
                    "flex-1 min-h-0 min-w-0 w-full overflow-x-hidden",
                    fullWidth
                        ? "flex flex-col overflow-hidden"
                        : "py-12 px-6 sm:px-10 xl:px-16 overflow-y-auto"
                )}>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

