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
    ChevronDown,
    Hash,
    HelpCircle,
    MoreHorizontal,
} from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
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
    icon: React.ComponentType<{ className?: string }>
    href: string
    badge?: number
}

/* Todoist nav button — 34px tall, rounded-lg, active = coral text */
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
                        ? "bg-sidebar-accent text-primary font-medium"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/80"
                )}
            >
                <item.icon className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    isActive ? "text-primary" : "text-sidebar-foreground/45"
                )} />
                <span className="flex-1 truncate text-left">{item.title}</span>
                {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[12px] text-sidebar-foreground/35 tabular-nums">
                        {item.badge}
                    </span>
                )}
            </button>
        </SidebarMenuItem>
    )
}

/* Todoist project row — # icon, slightly smaller */
function ProjectNavBtn({
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
                        ? "bg-sidebar-accent text-primary font-medium"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/80"
                )}
            >
                <Hash className={cn(
                    "h-[16px] w-[16px] shrink-0",
                    isActive ? "text-primary" : "text-sidebar-foreground/35"
                )} />
                <span className="flex-1 truncate text-left">{item.title}</span>
                {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[12px] text-sidebar-foreground/35 tabular-nums">
                        {item.badge}
                    </span>
                )}
            </button>
        </SidebarMenuItem>
    )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="px-2.5 pt-5 pb-1.5 text-[12px] font-bold text-sidebar-foreground/40 select-none">
            {children}
        </p>
    )
}

export function AppSidebar({ onOrderCreated }: AppSidebarProps) {
    const { user, signOut, userRole } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
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
                    <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 rounded-full shrink-0">
                            <AvatarImage src="" />
                            <AvatarFallback className="rounded-full bg-[#e8a064] text-white text-[11px] font-bold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-[14px] font-semibold text-sidebar-foreground truncate">
                            {userName}
                        </span>
                        <ChevronDown className="h-4 w-4 text-sidebar-foreground/30 shrink-0" />
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
                                    className="w-full flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg text-[14px] font-medium text-primary hover:bg-sidebar-accent/60 transition-colors duration-100 cursor-pointer"
                                    onClick={() => setIsNewOrderOpen(true)}
                                >
                                    <PlusCircle className="h-[18px] w-[18px] shrink-0 text-primary" />
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

                    {/* ── Mehr ── */}
                    <div className="mt-0.5">
                        <button
                            className="w-full flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg text-[14px] text-sidebar-foreground/40 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/60 transition-colors duration-100 cursor-pointer"
                            onClick={() => setIsSettingsOpen(true)}
                        >
                            <MoreHorizontal className="h-[18px] w-[18px] shrink-0" />
                            <span>Mehr</span>
                        </button>
                    </div>

                    {/* ── Werkstatt (Meine Projekte style) ── */}
                    <SectionLabel>Werkstatt</SectionLabel>
                    <SidebarMenu>
                        {workshopItems.map((item) => (
                            <ProjectNavBtn
                                key={item.href}
                                item={item}
                                isActive={isActive(item.href)}
                                onClick={() => navigate(item.href)}
                            />
                        ))}
                        {(userRole === 'admin' || userRole === 'owner') && (
                            <>
                                <ProjectNavBtn
                                    item={{ title: "Papierkorb", icon: Trash2, href: "/dashboard/trash" }}
                                    isActive={isActive("/dashboard/trash")}
                                    onClick={() => navigate("/dashboard/trash")}
                                />
                                <ProjectNavBtn
                                    item={{ title: "Feedback Analyse", icon: BarChart3, href: "/dashboard/feedback-analysis" }}
                                    isActive={isActive("/dashboard/feedback-analysis")}
                                    onClick={() => navigate("/dashboard/feedback-analysis")}
                                />
                            </>
                        )}
                    </SidebarMenu>

                    {/* ── Kommunikation ── */}
                    <SectionLabel>Kommunikation</SectionLabel>
                    <SidebarMenu>
                        {commItems.map((item) => (
                            <ProjectNavBtn
                                key={item.href}
                                item={item}
                                isActive={isActive(item.href)}
                                onClick={() => navigate(item.href)}
                            />
                        ))}
                    </SidebarMenu>
                </SidebarContent>

                {/* ── Footer — Todoist "Hilfe & Ressourcen" style ── */}
                <SidebarFooter className="px-2 py-2 border-t border-sidebar-border">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-full flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg text-[14px] text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/80 transition-colors duration-100 cursor-pointer"
                    >
                        <Settings className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/40" />
                        <span>Einstellungen</span>
                    </button>

                    <div
                        className="flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg hover:bg-sidebar-accent/60 transition-colors duration-100 cursor-pointer group"
                        onClick={handleLogout}
                        title="Abmelden"
                    >
                        <HelpCircle className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/40" />
                        <span className="flex-1 text-[14px] text-sidebar-foreground/50 truncate group-hover:text-sidebar-foreground/80 transition-colors">
                            Hilfe & Abmelden
                        </span>
                        <LogOut className="h-[14px] w-[14px] text-sidebar-foreground/25 group-hover:text-sidebar-foreground/50 transition-colors" />
                    </div>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>

            <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </>
    )
}
