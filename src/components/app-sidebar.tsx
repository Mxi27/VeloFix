import {
    LayoutDashboard,
    PlusCircle,
    Archive,
    Settings,
    LogOut,
    Bike,
    CreditCard,
    Trash2,
} from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate, useLocation } from "react-router-dom"
import { CreateOrderModal } from "@/components/CreateOrderModal"
import { useState } from "react"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    onOrderCreated?: () => void
}

export function AppSidebar({ onOrderCreated }: AppSidebarProps) {
    const { user, signOut, userRole } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)

    const handleLogout = async () => {
        try {
            await signOut()
            navigate("/login", { replace: true })
        } catch (error) {
            console.error("Logout error:", error)
        }
    }

    const navItems = [
        {
            title: "Dashboard",
            icon: LayoutDashboard,
            href: "/dashboard",
        },
        {
            title: "Neuradaufbau",
            icon: Bike,
            href: "/dashboard/bike-builds",
        },
        {
            title: "Leasing Abrechnung",
            icon: CreditCard,
            href: "/dashboard/leasing-billing",
        },
        {
            title: "Archiv",
            icon: Archive,
            href: "/dashboard/archive",
        },
        {
            title: "Einstellungen",
            icon: Settings,
            href: "/settings",
        },
    ]

    if (userRole === 'admin') {
        navItems.splice(4, 0, {
            title: "Papierkorb",
            icon: Trash2,
            href: "/dashboard/trash",
        })
    }

    const initials = user?.user_metadata?.full_name
        ?.split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase() || "U"

    return (
        <Sidebar>
            <SidebarHeader className="border-b">
                <div className="flex items-center gap-3 px-2 py-3">
                    <div className="bg-primary p-2 rounded-lg">
                        <Bike className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold tracking-tight">VeloFix</span>
                        <span className="text-[11px] text-muted-foreground">
                            Werkstatt Pro
                        </span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent className="px-2">
                <SidebarGroup>
                    <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground/70 px-2 pt-3 pb-2">
                        Navigation
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-0.5">
                            {/* New Order Button */}
                            {userRole !== 'read' && (
                                <CreateOrderModal
                                    open={isNewOrderOpen}
                                    onOpenChange={setIsNewOrderOpen}
                                    onOrderCreated={onOrderCreated}
                                >
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-lg h-9 font-medium"
                                            onClick={() => setIsNewOrderOpen(true)}
                                        >
                                            <span className="flex items-center gap-2">
                                                <PlusCircle className="h-4 w-4" />
                                                <span>Neuer Auftrag</span>
                                            </span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </CreateOrderModal>
                            )}

                            <div className="h-1" />

                            {navItems.map((item) => {
                                const isActive = location.pathname === item.href
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            isActive={isActive}
                                            asChild
                                            onClick={() => navigate(item.href)}
                                            className={cn(
                                                "cursor-pointer rounded-lg h-9",
                                                isActive && "bg-sidebar-accent font-medium"
                                            )}
                                        >
                                            <span className="flex items-center gap-2.5">
                                                <item.icon className={cn(
                                                    "h-4 w-4",
                                                    isActive ? "text-primary" : "text-muted-foreground"
                                                )} />
                                                <span>{item.title}</span>
                                            </span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src="" />
                                <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-medium">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium text-sm">
                                    {user?.user_metadata?.full_name || "Benutzer"}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {user?.email}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
