import {
    LayoutDashboard,
    Archive,
    Settings,
    LogOut,
    Bike,
    CreditCard,
    Star,
    CheckSquare,
    BookOpen,
    ListTodo,
    ChevronDown,
    HelpCircle,
    PanelLeft,
    Plus,
} from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate, useLocation } from "react-router-dom"
import { CreateOrderModal } from "@/components/CreateOrderModal"
import { SettingsModal } from "@/components/SettingsModal"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    onOrderCreated?: () => void
}

interface NavItem {
    title: string
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
    href: string
    badge?: number
}

/* Todoist nav button */
function NavBtn({
    item,
    isActive,
    onClick,
}: {
    item: NavItem
    isActive: boolean
    onClick: () => void
}) {
    return (
        <SidebarMenuItem>
            <button
                onClick={onClick}
                className={cn(
                    "w-full flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg text-[14px] transition-colors duration-100 cursor-pointer select-none outline-none",
                    isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
            >
                <item.icon
                    strokeWidth={isActive ? 2 : 1.5}
                    className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        isActive ? "text-primary" : "text-sidebar-foreground/50"
                    )}
                />
                <span className="flex-1 truncate text-left">{item.title}</span>
                {item.badge !== undefined && item.badge > 0 && (
                    <span className={cn(
                        "text-[12px] tabular-nums",
                        isActive ? "text-primary" : "text-sidebar-foreground/40"
                    )}>
                        {item.badge}
                    </span>
                )}
            </button>
        </SidebarMenuItem>
    )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="px-2.5 pt-5 pb-1.5 text-[13px] font-semibold text-sidebar-foreground/50 select-none">
            {children}
        </p>
    )
}

export function AppSidebar({ onOrderCreated }: AppSidebarProps) {
    const { user, signOut, userRole } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const { toggleSidebar } = useSidebar()
    const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    const handleLogout = async () => {
        try {
            await signOut()
            navigate("/login", { replace: true })
        } catch (err) {
            console.error("Logout error:", err)
        }
    }

    const isActive = (href: string) =>
        href === "/dashboard"
            ? location.pathname === "/dashboard"
            : location.pathname.startsWith(href)

    const userName = user?.user_metadata?.full_name || user?.email || "Benutzer"
    const initials = user?.user_metadata?.full_name
        ?.split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase() || "U"

    const mainItems: NavItem[] = [
        { title: "Reparaturen", icon: ListTodo, href: "/dashboard" },
        { title: "Mein Cockpit", icon: LayoutDashboard, href: "/dashboard/cockpit" },
        { title: "Aufgaben", icon: CheckSquare, href: "/dashboard/tasks" },
    ]

    const workshopItems: NavItem[] = [
        { title: "Neuradaufbau", icon: Bike, href: "/dashboard/bike-builds" },
        { title: "Reparatur Archiv", icon: Archive, href: "/dashboard/archive" },
        { title: "Leasing", icon: CreditCard, href: "/dashboard/leasing-billing" },
    ]

    const commItems: NavItem[] = [
        { title: "Notizbuch", icon: BookOpen, href: "/dashboard/notebook" },
        { title: "Feedback", icon: Star, href: "/dashboard/feedback" },
    ]

    return (
        <>
            <Sidebar className="border-r border-sidebar-border">
                {/* ── User header — Todoist style: round avatar + name + chevron ── */}
                <SidebarHeader className="px-3 py-3">
                    <div className="flex items-center gap-1.5 w-full">
                        {/* Profile Row */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="flex items-center gap-2 cursor-pointer hover:bg-sidebar-accent/50 p-1.5 -ml-1.5 rounded-md transition-colors min-w-0 flex-1">
                                    <Avatar className="h-6 w-6 rounded-full shrink-0">
                                        <AvatarImage src="" />
                                        <AvatarFallback className="rounded-full bg-[#e8a064] text-white text-[10px] font-bold">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 text-[13px] font-semibold text-sidebar-foreground truncate min-w-0">
                                        {userName}
                                    </span>
                                    <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[240px]">
                                <div className="px-2 py-1.5 text-sm">
                                    <p className="font-semibold truncate">{userName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                                    <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span>Einstellungen</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Abmelden</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Top Row: Toggle (right aligned) */}
                        <div className="flex items-center shrink-0">
                            <button 
                                onClick={toggleSidebar} 
                                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
                                title="Menü ein/ausklappen"
                            >
                                <PanelLeft className="h-[20px] w-[20px]" strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>
                </SidebarHeader>

                <SidebarContent className="px-2 py-1 overflow-y-auto">
                    {/* ── New Order — Todoist "Aufgabe hinzufügen" style ── */}
                    {userRole !== 'read' && (
                        <div className="mb-1.5">
                            <CreateOrderModal
                                open={isNewOrderOpen}
                                onOpenChange={setIsNewOrderOpen}
                                onOrderCreated={onOrderCreated}
                            >
                                <button
                                    className="w-full flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg text-[14px] font-bold text-primary hover:bg-sidebar-accent/60 transition-colors duration-100 cursor-pointer"
                                    onClick={() => setIsNewOrderOpen(true)}
                                >
                                    <div className="rounded-full bg-primary flex items-center justify-center h-[22px] w-[22px] shrink-0">
                                        <Plus className="h-[14px] w-[14px] text-white stroke-[3]" />
                                    </div>
                                    <span>Neuer Auftrag</span>
                                </button>
                            </CreateOrderModal>
                        </div>
                    )}

                    {/* ── Main navigation ── */}
                    <SidebarMenu>
                        {mainItems.map((item) => (
                            <NavBtn
                                key={item.href}
                                item={item}
                                isActive={isActive(item.href)}
                                onClick={() => navigate(item.href)}
                            />
                        ))}
                    </SidebarMenu>



                    {/* ── Werkstatt (Meine Projekte style) ── */}
                    <SectionLabel>Werkstatt</SectionLabel>
                    <SidebarMenu>
                        {workshopItems.map((item) => (
                            <NavBtn
                                key={item.href}
                                item={item}
                                isActive={isActive(item.href)}
                                onClick={() => navigate(item.href)}
                            />
                        ))}

                    </SidebarMenu>

                    {/* ── Kommunikation ── */}
                    <SectionLabel>Kommunikation</SectionLabel>
                    <SidebarMenu>
                        {commItems.map((item) => (
                            <NavBtn
                                key={item.href}
                                item={item}
                                isActive={isActive(item.href)}
                                onClick={() => navigate(item.href)}
                            />
                        ))}
                    </SidebarMenu>
                </SidebarContent>

                {/* ── Footer — Todoist "Hilfe & Ressourcen" style ── */}
                <SidebarFooter className="px-2 py-2">
                    <div
                        className="flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg hover:bg-sidebar-accent/60 transition-colors duration-100 cursor-pointer group"
                        title="Hilfe & Ressourcen"
                    >
                        <HelpCircle strokeWidth={1.5} className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/50" />
                        <span className="flex-1 text-[13px] font-medium text-sidebar-foreground/70 truncate group-hover:text-sidebar-foreground transition-colors">
                            Hilfe & Ressourcen
                        </span>
                    </div>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>

            <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </>
    )
}
