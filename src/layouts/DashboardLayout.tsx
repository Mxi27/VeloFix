import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export function DashboardLayout({ children, onOrderCreated }: { children: React.ReactNode, onOrderCreated?: () => void }) {
    return (
        <SidebarProvider>
            <AppSidebar onOrderCreated={onOrderCreated} />
            <SidebarInset>
                <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
                    <SidebarTrigger />
                    <div className="w-[1px] h-4 bg-border" />
                    <span className="font-medium text-sm">Dashboard</span>
                </header>
                <div className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
