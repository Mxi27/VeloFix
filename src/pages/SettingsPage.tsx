import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
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
import {
    User,
    Building2,
    Users,
    ListChecks,
    CreditCard,
    ClipboardList,
    Bell,
    Shield,
    Palette,
    FileSpreadsheet,
    Database as DatabaseIcon,
    Wrench,
    MessageSquare,
    Tag,
    Archive,
    Trash2,
    LogOut,
    X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrdersTable } from '@/components/OrdersTable'

type SettingsSection =
    | 'profile'
    | 'workshop'
    | 'employees'
    | 'checklists'
    | 'neurad'
    | 'inquiries'
    | 'intake'
    | 'leasing'
    | 'notifications'
    | 'security'
    | 'display'
    | 'data_archive'
    | 'export'
    | 'tags'
    | 'archive'
    | 'leasing_billing'
    | 'trash'
    | 'logout'

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
            { id: 'logout', label: 'Abmelden', icon: LogOut },
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
            { id: 'archive', label: 'Reparatur Archiv', icon: Archive },
            { id: 'leasing_billing', label: 'Leasing Abrechnung', icon: CreditCard, adminOnly: true },
            { id: 'trash', label: 'Papierkorb', icon: Trash2, adminOnly: true },
            { id: 'data_archive', label: 'Daten & Archiv', icon: DatabaseIcon, adminOnly: true },
            { id: 'export', label: 'Datenexport', icon: FileSpreadsheet, adminOnly: true },
        ],
    },
]

export default function SettingsPage() {
    const navigate = useNavigate()
    const { user, workshopId, userRole, leaveWorkshop, signOut } = useAuth()
    const [saving, setSaving] = useState(false)
    const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
    const [fullName, setFullName] = useState('')

    // Initialize full name from user metadata
    useEffect(() => {
        if (user?.user_metadata?.full_name) {
            setFullName(user.user_metadata.full_name)
        }
    }, [user])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            })
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                navigate(-1)
            }
        }
        window.addEventListener('keydown', handleKeyDown, true)
        return () => window.removeEventListener('keydown', handleKeyDown, true)
    }, [navigate])


    const handleLogout = async () => {
        try {
            await signOut()
            // AuthContext will handle navigation usually, but for good measure:
            window.location.href = '/login'
        } catch (error: any) {
            toast.error("Fehler beim Abmelden", { description: error.message })
        }
    }

    const initials = user?.user_metadata?.full_name
        ?.split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase() || 'U'

    const isAdmin = userRole === 'admin' || userRole === 'owner'
    const filteredNavGroups = navGroups
        .map(group => ({
            ...group,
            items: group.items.filter(item => !item.adminOnly || isAdmin),
        }))
        .filter(group => group.items.length > 0)

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
        : null


    const renderContent = () => {
        // Double check admin sections for safety
        const isAdminSection = navGroups.some(group => 
            group.items.some(item => item.id === activeSection && item.adminOnly)
        )
        
        if (isAdminSection && !isAdmin) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Zugriff verweigert</CardTitle>
                        <CardDescription>
                            Sie benötigen Administrator-Rechte, um diese Einstellungen zu sehen oder zu bearbeiten.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )
        }

        switch (activeSection) {
            case 'profile':
                return (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Benutzerprofil</CardTitle>
                                <CardDescription>
                                    Bearbeiten Sie Ihre persönlichen Informationen.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div className="flex items-center gap-6">
                                        <Avatar className="h-24 w-24 border-4 border-background shadow-lg ring-2 ring-primary/10">
                                            <AvatarImage src="" />
                                            <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1.5">
                                            <h3 className="text-xl font-semibold tracking-tight">
                                                {user?.user_metadata?.full_name || 'Benutzer'}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-xs font-medium px-2.5 py-1 rounded-full",
                                                    (userRole === 'admin' || userRole === 'owner')
                                                        ? "bg-primary/10 text-primary"
                                                        : "bg-muted text-muted-foreground"
                                                )}>
                                                    {userRole === 'owner' ? 'Inhaber' : userRole === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                                                </span>
                                                {memberSince && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Mitglied seit {memberSince}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="fullname">Name</Label>
                                            <Input
                                                id="fullname"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>E-Mail</Label>
                                            <Input value={user?.email || ''} disabled className="bg-muted text-muted-foreground" />
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={saving}>
                                            {saving ? "Speichert..." : "Profil speichern"}
                                        </Button>
                                    </div>
                                </form>

                                {/* Leave Workshop Section - Only for non-admins/non-owners */}
                                {userRole !== 'owner' && userRole !== 'admin' && (
                                    <div className="pt-6 mt-6 border-t border-border">
                                        <h3 className="text-lg font-semibold text-destructive mb-2">Werkstatt verlassen</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Wenn Sie die Werkstatt verlassen, verlieren Sie Zugriff auf alle Daten.
                                            Sie benötigen einen neuen Einladungscode, um wieder beizutreten.
                                        </p>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive">
                                                    Werkstatt verlassen
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Sie verlassen die aktuelle Werkstatt. Ihr Zugriff wird sofort widerrufen.
                                                        Sie können nur mit einem neuen Einladungscode wieder beitreten.
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
                            </CardContent>
                        </Card>
                    </div>
                )

            case 'workshop':
                return workshopId ? <WorkshopSettings workshopId={workshopId} /> : null

            case 'employees':
                return <EmployeeManagement />

            case 'checklists':
                return <ChecklistTemplateManager />

            case 'intake':
                return <AcceptanceSettings />

            case 'leasing':
                return <LeasingSettings />

            case 'tags':
                return <TagsSettings />

            case 'notifications':
                return <NotificationSettings />

            case 'security':
                return <SecuritySettings />

            case 'display':
                return <DisplaySettings />

            case 'neurad':
                return <NeuradSettings />

            case 'inquiries':
                return <CustomerInquiriesSettings />

            case 'export':
                return <DataExport />

            case 'data_archive':
                return <DataLifecycleManager />

            case 'archive':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Archive className="h-5 w-5" />
                             </div>
                             <div>
                                <h2 className="text-xl font-bold">Reparatur Archiv</h2>
                                <p className="text-sm text-muted-foreground text-pretty">Alle abgeschlossenen Aufträge und Leasing-Abrechnungen.</p>
                             </div>
                        </div>
                        <OrdersTable showArchived={true} />
                    </div>
                )

            case 'leasing_billing':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <CreditCard className="h-5 w-5" />
                             </div>
                             <div>
                                <h2 className="text-xl font-bold">Leasing Abrechnung</h2>
                                <p className="text-sm text-muted-foreground">Leasing Aufträge, die abgeholt wurden, aber noch nicht abgeschlossen sind.</p>
                             </div>
                        </div>
                        <OrdersTable mode="leasing_billing" />
                    </div>
                )

            case 'trash':
                return (
                    <div className="space-y-6">
                         <div className="flex items-center gap-3 mb-2">
                             <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                                <Trash2 className="h-5 w-5" />
                             </div>
                             <div>
                                <h2 className="text-xl font-bold">Papierkorb</h2>
                                <p className="text-sm text-muted-foreground">Gelöschte Aufträge. Diese werden nach 30 Tagen automatisch endgültig gelöscht.</p>
                             </div>
                        </div>
                        <OrdersTable mode="trash" />
                    </div>
                )

            case 'logout':
                return (
                    <Card className="border-destructive/20 bg-destructive/5">
                        <CardHeader>
                            <CardTitle className="text-destructive">Abmelden</CardTitle>
                            <CardDescription>
                                Möchten Sie sich wirklich abmelden? Sie müssen sich erneut anmelden, um auf Ihre Werkstatt zuzugreifen.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="destructive" onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Jetzt abmelden
                            </Button>
                        </CardContent>
                    </Card>
                )

            default:
                return null
        }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-background overflow-hidden flex flex-col">
            {/* Header */}
            <header className="h-16 border-b flex items-center justify-between px-6 shrink-0 bg-background sticky top-0 z-[110]">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight">Einstellungen</h1>
                </div>
                <button
                    onPointerDown={() => window.history.back()}
                    className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted cursor-pointer transition-none"
                    title="Schließen (Esc)"
                >
                    <X className="h-5 w-5" />
                    <span className="sr-only">Schließen</span>
                </button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex w-full h-full overflow-hidden">
                    {/* Settings Sidebar */}
                    <aside className="w-full md:w-80 border-r bg-muted/30 overflow-y-auto shrink-0 hidden md:block">
                        <nav className="p-4 space-y-6">
                            {filteredNavGroups.map((group) => (
                                <div key={group.label} className="space-y-1">
                                    <h3 className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                                        {group.label}
                                    </h3>
                                    {group.items.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveSection(item.id)}
                                            className={cn(
                                                'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                                                activeSection === item.id
                                                    ? 'bg-primary text-primary-foreground shadow-md'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            )}
                                        >
                                            <item.icon className="h-4 w-4 shrink-0" />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </nav>
                    </aside>

                    {/* Mobile Nav */}

                    {/* Content Area */}
                    <main className="flex-1 overflow-y-auto bg-background/50 relative">
                        <div className="max-w-4xl mx-auto p-6 md:p-10 pb-32">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}
