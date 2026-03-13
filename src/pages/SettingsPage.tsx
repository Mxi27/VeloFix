import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { PageTransition } from '@/components/PageTransition'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'



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
        ],
    },
]

export default function SettingsPage() {
    const { user, workshopId, userRole, leaveWorkshop } = useAuth()
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
            // Redirect happens automatically via AuthContext/AppRoutes
        } catch (error: any) {
            toast.error("Fehler beim Verlassen", { description: error.message })
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

            default:
                return null
        }
    }

    return (
        <PageTransition>
            <DashboardLayout>
                {/* Premium Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-purple-500/5 border border-primary/10 p-6 mb-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="relative">
                        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {(userRole === 'admin' || userRole === 'owner')
                                ? 'Profil, Werkstatt und Mitarbeiter verwalten'
                                : 'Profil und Präferenzen anpassen'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Premium Sidebar Navigation */}
                    <div className="lg:w-64 shrink-0">
                        <nav className="sticky top-4 p-2 rounded-xl bg-muted/30 border space-y-4">
                            {filteredNavGroups.map((group, gi) => (
                                <div key={group.label}>
                                    {gi > 0 && <div className="border-t border-border/50 mb-3" />}
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 mb-1.5">
                                        {group.label}
                                    </p>
                                    <div className="space-y-0.5">
                                        {group.items.map((item) => {
                                            const Icon = item.icon
                                            const isActive = activeSection === item.id

                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setActiveSection(item.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200",
                                                        isActive
                                                            ? "bg-background shadow-sm border text-foreground"
                                                            : "hover:bg-background hover:shadow-sm hover:border-border/50 border border-transparent text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "p-1.5 rounded-md transition-colors",
                                                        isActive ? "bg-primary/10 text-primary" : "bg-transparent"
                                                    )}>
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-medium text-sm">{item.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0">
                        {renderContent()}
                    </div>
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
