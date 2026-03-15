import {
    LayoutDashboard,
    PlusCircle,
    Archive,
    Settings,
    LogOut,
    Bike,
    CreditCard,
    Trash2,
    Star,
    CheckSquare,
    BookOpen,
    BarChart3,
    ListTodo,
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

interface SidebarItemProps {
    item: {
        title: string
        icon: any
        href: string
    }
    location: any
    navigate: any
}

function SidebarItem({ item, location, navigate }: SidebarItemProps) {
    const isActive = location.pathname === item.href || (item.href === "/dashboard/notebook" && location.pathname.startsWith("/dashboard/notebook"))
    
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                isActive={isActive}
                asChild
                onClick={() => navigate(item.href)}
                className={cn(
                    "cursor-pointer rounded-lg h-9",
                    isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                )}
            >
                <div className="flex items-center gap-2.5 w-full">
                    <item.icon className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className="truncate">{item.title}</span>
                </div>
            </SidebarMenuButton>
        </SidebarMenuItem>
    )
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
                        Werkstatt
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
                                            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground cursor-pointer rounded-lg h-9 font-medium"
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

                            {[
                                { title: "Reparaturen", icon: ListTodo, href: "/dashboard" },
                                { title: "Mein Cockpit", icon: LayoutDashboard, href: "/dashboard/cockpit" },
                                { title: "Aufgaben", icon: CheckSquare, href: "/dashboard/tasks" },
                                { title: "Neuradaufbau", icon: Bike, href: "/dashboard/bike-builds" },
                            ].map((item) => (
                                <SidebarItem key={item.title} item={item} location={location} navigate={navigate} />
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground/70 px-2 pt-3 pb-2">
                        Verwaltung
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-0.5">
                            {[
                                { title: "Reparatur Archiv", icon: Archive, href: "/dashboard/archive" },
                                { title: "Leasing Abrechnung", icon: CreditCard, href: "/dashboard/leasing-billing" },
                            ].map((item) => (
                                <SidebarItem key={item.title} item={item} location={location} navigate={navigate} />
                            ))}
                            {(userRole === 'admin' || userRole === 'owner') && (
                                <>
                                    <SidebarItem 
                                        item={{ title: "Papierkorb", icon: Trash2, href: "/dashboard/trash" }} 
                                        location={location} 
                                        navigate={navigate} 
                                    />
                                    <SidebarItem 
                                        item={{ title: "Feedback Analyse", icon: BarChart3, href: "/dashboard/feedback-analysis" }} 
                                        location={location} 
                                        navigate={navigate} 
                                    />
                                </>
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground/70 px-2 pt-3 pb-2">
                        Kommunikation
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-0.5">
                            {[
                                { title: "Notizbuch", icon: BookOpen, href: "/dashboard/notebook" },
                                { title: "Feedback", icon: Star, href: "/dashboard/feedback" },
                            ].map((item) => (
                                <SidebarItem key={item.title} item={item} location={location} navigate={navigate} />
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="mt-auto">
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarItem 
                                item={{ title: "Einstellungen", icon: Settings, href: "/settings" }} 
                                location={location} 
                                navigate={navigate} 
                            />
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
