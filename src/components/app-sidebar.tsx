import {
    LayoutDashboard,
    PlusCircle,
    Archive,
    Settings,
    LogOut,
    Bike,
    CreditCard,
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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    onOrderCreated?: () => void
}

export function AppSidebar({ onOrderCreated }: AppSidebarProps) {
    const { user, signOut } = useAuth()
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

    const initials = user?.user_metadata?.full_name
        ?.split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase() || "U"

    return (
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-2">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <Bike className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none">
                        <span className="font-semibold tracking-tight">VeloFix</span>
                        <span className="text-xs text-muted-foreground">Boxenstop</span>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menü</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {/* New Order Modal Trigger */}
                            <CreateOrderModal
                                open={isNewOrderOpen}
                                onOpenChange={setIsNewOrderOpen}
                                onOrderCreated={onOrderCreated}
                            >
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        className="text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                                        onClick={() => setIsNewOrderOpen(true)}
                                    >
                                        <span>
                                            <PlusCircle />
                                            <span>Neuer Auftrag</span>
                                        </span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </CreateOrderModal>

                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        isActive={location.pathname === item.href}
                                        asChild
                                        onClick={() => navigate(item.href)}
                                        className="cursor-pointer"
                                    >
                                        <span>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className="flex items-center gap-2 p-2">
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src="" />
                                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{user?.user_metadata?.full_name || "Benutzer"}</span>
                                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={handleLogout}>
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
