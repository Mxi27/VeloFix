import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { EmployeeManagement } from '@/components/EmployeeManagement'
import { ChecklistTemplateManager } from '@/components/ChecklistTemplateManager'
import { LeasingSettings } from '@/components/LeasingSettings'
import { AcceptanceSettings } from '@/components/AcceptanceSettings'
import { NotificationSettings } from '@/components/NotificationSettings'
import { SecuritySettings } from '@/components/SecuritySettings'
import { DisplaySettings } from '@/components/DisplaySettings'
import { DataExport } from '@/components/DataExport'
import { DataLifecycleManager } from '@/components/DataLifecycleManager'
import { NeuradSettings } from '@/components/NeuradSettings'
import { CustomerInquiriesSettings } from '@/components/CustomerInquiriesSettings'
import { TagsSettings } from '@/components/TagsSettings'
import { WorkshopSettings } from '@/components/WorkshopSettings'
import { TrashSettings } from '@/components/TrashSettings'
import { FeedbackAnalysisSettings } from '@/components/FeedbackAnalysisSettings'
import {
    User, Building2, Users, ListChecks, CreditCard,
    ClipboardList, Bell, Shield, Palette,
    FileSpreadsheet, Database as DatabaseIcon,
    Wrench, MessageSquare, Tag, X, ArrowLeft,
    Trash2, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SettingsSection =
    | 'profile' | 'workshop' | 'employees' | 'checklists' | 'neurad'
    | 'inquiries' | 'intake' | 'leasing' | 'notifications' | 'security'
    | 'display' | 'data_archive' | 'export' | 'tags' | 'trash' | 'feedback_analysis'

interface NavItem {
    id: SettingsSection
    label: string
    icon: React.ElementType
    adminOnly?: boolean
}

interface NavGroup {
    label: string
    items: NavItem[]
}

const navGroups: NavGroup[] = [
    {
        label: 'Persönlich',
        items: [
            { id: 'profile', label: 'Profil', icon: User },
            { id: 'display', label: 'Darstellung', icon: Palette },
            { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
            { id: 'security', label: 'Sicherheit', icon: Shield },
        ],
    },
    {
        label: 'Werkstatt',
        items: [
            { id: 'workshop', label: 'Werkstatt-Details', icon: Building2, adminOnly: true },
            { id: 'employees', label: 'Mitarbeiter', icon: Users, adminOnly: true },
            { id: 'checklists', label: 'Checklisten', icon: ListChecks, adminOnly: true },
            { id: 'tags', label: 'Auftrags-Tags', icon: Tag, adminOnly: true },
            { id: 'neurad', label: 'Neurad Konfig', icon: Wrench, adminOnly: true },
            { id: 'inquiries', label: 'Kundenanfragen', icon: MessageSquare, adminOnly: true },
            { id: 'intake', label: 'Annahme & QR', icon: ClipboardList, adminOnly: true },
            { id: 'leasing', label: 'Leasing', icon: CreditCard, adminOnly: true },
        ],
    },
    {
        label: 'System',
        items: [
            { id: 'data_archive', label: 'Daten & Archiv', icon: DatabaseIcon, adminOnly: true },
            { id: 'export', label: 'Datenexport', icon: FileSpreadsheet, adminOnly: true },
            { id: 'feedback_analysis', label: 'Feedback Analyse', icon: BarChart3, adminOnly: true },
            { id: 'trash', label: 'Papierkorb', icon: Trash2, adminOnly: true },
        ],
    },
]

interface SettingsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultSection?: SettingsSection
}

export function SettingsModal({ open, onOpenChange, defaultSection = 'profile' }: SettingsModalProps) {
    const { user, workshopId, userRole, leaveWorkshop } = useAuth()
    const [saving, setSaving] = useState(false)
    const [activeSection, setActiveSection] = useState<SettingsSection>(defaultSection)
    const [fullName, setFullName] = useState('')
    // Mobile: null = show nav, string = show content
    const [mobileView, setMobileView] = useState<'nav' | 'content'>('nav')

    useEffect(() => {
        if (user?.user_metadata?.full_name) {
            setFullName(user.user_metadata.full_name)
        }
    }, [user])

    useEffect(() => {
        if (open) {
            setActiveSection(defaultSection)
            setMobileView('nav')
        }
    }, [open, defaultSection])

    const handleSelectSection = (id: SettingsSection) => {
        setActiveSection(id)
        setMobileView('content')
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } })
            if (error) throw error
            toast.success("Profil aktualisiert")
        } catch (error: any) {
            toast.error("Fehler beim Aktualisieren", { description: error.message })
        } finally {
            setSaving(false)
        }
    }

    const handleLeaveWorkshop = async () => {
        try {
            await leaveWorkshop()
            toast.success("Werkstatt erfolgreich verlassen")
        } catch (error: any) {
            toast.error("Fehler beim Verlassen", { description: error.message })
        }
    }

    const initials = user?.user_metadata?.full_name
        ?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'

    const isAdmin = userRole === 'admin' || userRole === 'owner'
    const filteredNavGroups = navGroups
        .map(group => ({ ...group, items: group.items.filter(item => !item.adminOnly || isAdmin) }))
        .filter(group => group.items.length > 0)

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
        : null

    const renderContent = () => {
        const isAdminSection = navGroups.some(group =>
            group.items.some(item => item.id === activeSection && item.adminOnly)
        )
        if (isAdminSection && !isAdmin) {
            return (
                <div className="p-6 text-sm text-muted-foreground">
                    Sie benötigen Administrator-Rechte für diesen Bereich.
                </div>
            )
        }

        switch (activeSection) {
            case 'profile':
                return (
                    <div className="space-y-6">
                        {/* Avatar + Name block */}
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 rounded-full shrink-0">
                                <AvatarImage src="" />
                                <AvatarFallback className="rounded-full bg-[#e8a064] text-white text-base font-semibold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[15px] truncate">{user?.user_metadata?.full_name || 'Benutzer'}</p>
                                <p className="text-[13px] text-muted-foreground truncate">{user?.email}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={cn(
                                        "text-[11px] font-medium px-2 py-0.5 rounded-md",
                                        isAdmin ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground"
                                    )}>
                                        {userRole === 'owner' ? 'Inhaber' : userRole === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                                    </span>
                                    {memberSince && (
                                        <span className="text-[11px] text-muted-foreground">Seit {memberSince}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="border-t border-border pt-4 space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="fullname" className="text-[13px]">Name</Label>
                                    <Input id="fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[13px]">E-Mail</Label>
                                    <Input value={user?.email || ''} disabled className="opacity-50 cursor-not-allowed" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" size="sm" disabled={saving}>
                                    {saving ? "Speichert..." : "Speichern"}
                                </Button>
                            </div>
                        </form>

                        {/* Danger zone */}
                        {userRole !== 'owner' && userRole !== 'admin' && (
                            <div className="border-t border-border pt-5 space-y-3">
                                <p className="text-[13px] font-medium text-destructive">Gefahrenzone</p>
                                <p className="text-[13px] text-muted-foreground">
                                    Werkstatt verlassen — Sie verlieren sofort den Zugriff.
                                </p>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">Werkstatt verlassen</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Sicher?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Ihr Zugriff wird sofort widerrufen.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleLeaveWorkshop} className="bg-destructive hover:bg-destructive/90">
                                                Verlassen
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                    </div>
                )

            case 'workshop': return workshopId ? <WorkshopSettings workshopId={workshopId} /> : null
            case 'employees': return <EmployeeManagement />
            case 'checklists': return <ChecklistTemplateManager />
            case 'intake': return <AcceptanceSettings />
            case 'leasing': return <LeasingSettings />
            case 'tags': return <TagsSettings />
            case 'notifications': return <NotificationSettings />
            case 'security': return <SecuritySettings />
            case 'display': return <DisplaySettings />
            case 'neurad': return <NeuradSettings />
            case 'inquiries': return <CustomerInquiriesSettings />
            case 'export': return <DataExport />
            case 'data_archive': return <DataLifecycleManager />
            case 'trash': return <TrashSettings />
            case 'feedback_analysis': return <FeedbackAnalysisSettings />
            default: return null
        }
    }

    // Get active section label for header
    const activeSectionLabel = navGroups.flatMap(g => g.items).find(i => i.id === activeSection)?.label ?? 'Einstellungen'

    /* ── Sidebar Nav (shared between desktop inline + mobile fullscreen) ── */
    const renderNav = () => (
        <div className="space-y-3">
            {filteredNavGroups.map((group, gi) => (
                <div key={group.label}>
                    {gi > 0 && <div className="border-t border-border/50 mb-1 mt-2" />}
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-0.5 select-none">
                        {group.label}
                    </p>
                    <div className="space-y-px">
                        {group.items.map((item) => {
                            const Icon = item.icon
                            const isActive = activeSection === item.id
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelectSection(item.id)}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 h-[34px] px-2.5 rounded-md text-[13px] transition-colors duration-100 cursor-pointer outline-none relative text-left",
                                        isActive
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                                    )}
                                >
                                    <Icon className={cn("h-[16px] w-[16px] shrink-0", isActive ? "text-primary" : "text-muted-foreground/60")} />
                                    <span className="truncate">{item.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="w-[calc(100vw-2rem)] max-w-none sm:max-w-[95vw] md:max-w-[1024px] h-[min(90vh,820px)] p-0 gap-0 overflow-hidden flex flex-col rounded-xl border border-border shadow-[var(--shadow-floating)] bg-background"
            >
                {/* Visually hidden title for a11y */}
                <DialogTitle className="sr-only">Einstellungen</DialogTitle>

                {/* ── Desktop: side-by-side layout (md+) ── */}
                <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
                    {/* Left nav */}
                    <div className="w-[260px] shrink-0 border-r border-border bg-sidebar flex flex-col overflow-y-auto py-5 px-3 custom-scrollbar">
                        <div className="px-2.5 mb-4">
                            <p className="text-[14px] font-semibold text-foreground truncate">
                                {user?.user_metadata?.full_name || 'Einstellungen'}
                            </p>
                            <p className="text-[12px] text-muted-foreground truncate">{user?.email}</p>
                        </div>
                        {renderNav()}
                    </div>

                    {/* Right content */}
                    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                        <div className="shrink-0 flex items-center justify-between px-8 pt-6 pb-4 border-b border-border/50">
                            <h2 className="text-lg font-bold tracking-tight">{activeSectionLabel}</h2>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                                <X className="h-[18px] w-[18px]" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                            {renderContent()}
                        </div>
                    </div>
                </div>

                {/* ── Mobile: full-width stack (< md) ── */}
                <div className="flex md:hidden flex-1 min-h-0 overflow-hidden flex-col">
                    {mobileView === 'nav' ? (
                        /* Nav view */
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50">
                                <div className="min-w-0">
                                    <h2 className="text-lg font-bold tracking-tight">Einstellungen</h2>
                                    <p className="text-[12px] text-muted-foreground truncate">{user?.email}</p>
                                </div>
                                <button
                                    onClick={() => onOpenChange(false)}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
                                {renderNav()}
                            </div>
                        </div>
                    ) : (
                        /* Content view */
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="shrink-0 flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border/50">
                                <button
                                    onClick={() => setMobileView('nav')}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                                <h2 className="text-base font-bold tracking-tight flex-1 min-w-0 truncate">{activeSectionLabel}</h2>
                                <button
                                    onClick={() => onOpenChange(false)}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                                {renderContent()}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
