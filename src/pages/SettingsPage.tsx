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
import { DataManagementSettings } from '@/components/DataManagementSettings'
import { NeuradSettings } from '@/components/NeuradSettings'
import { CustomerInquiriesSettings } from '@/components/CustomerInquiriesSettings'
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
    ChevronRight,
    FileSpreadsheet,
    Database as DatabaseIcon,
    Wrench,
    MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/supabase'

type Workshop = Database['public']['Tables']['workshops']['Row']

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
    | 'display'
    | 'data'
    | 'export'

interface NavItem {
    id: SettingsSection
    label: string
    icon: React.ElementType
    adminOnly?: boolean
}

const navItems: NavItem[] = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'workshop', label: 'Werkstatt', icon: Building2, adminOnly: true },
    { id: 'employees', label: 'Mitarbeiter', icon: Users, adminOnly: true },
    { id: 'checklists', label: 'Checklisten', icon: ListChecks, adminOnly: true },
    { id: 'neurad', label: 'Neurad Konfig', icon: Wrench, adminOnly: true },
    { id: 'inquiries', label: 'Kundenanfragen', icon: MessageSquare, adminOnly: true },
    { id: 'intake', label: 'Annahme', icon: ClipboardList, adminOnly: true },
    { id: 'leasing', label: 'Leasing', icon: CreditCard, adminOnly: true },
    { id: 'data', label: 'Datenverwaltung', icon: DatabaseIcon, adminOnly: true },
    { id: 'export', label: 'Datenexport', icon: FileSpreadsheet, adminOnly: true },
    { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
    { id: 'security', label: 'Sicherheit', icon: Shield },
    { id: 'display', label: 'Darstellung', icon: Palette },
]

export default function SettingsPage() {
    const { user, workshopId, userRole, leaveWorkshop } = useAuth()
    const [workshop, setWorkshop] = useState<Workshop | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
    const [fullName, setFullName] = useState('')

    // Initialize full name from user metadata
    useEffect(() => {
        if (user?.user_metadata?.full_name) {
            setFullName(user.user_metadata.full_name)
        }
    }, [user])

    const [workshopForm, setWorkshopForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: '',
        website: '',
        opening_hours: '',
        bank_name: '',
        iban: '',
        bic: '',
        tax_id: '',
        ust_id: '',
        footer_text: '',
        terms_text: ''
    })

    useEffect(() => {
        if (workshopId) {
            fetchWorkshop()
        }
    }, [workshopId])

    const fetchWorkshop = async () => {
        if (!workshopId) return

        setLoading(true)
        const { data, error } = await supabase
            .from('workshops')
            .select('*')
            .eq('id', workshopId)
            .single()

        if (error) {
            console.error('Error fetching workshop:', error)
        } else {
            setWorkshop(data)
            setWorkshopForm({
                name: data.name || '',
                email: data.email || '',
                phone: data.phone || '',
                address: data.address || '',
                city: data.city || '',
                postal_code: data.postal_code || '',
                website: (data as any).website || '',
                opening_hours: (data as any).opening_hours || '',
                bank_name: data.bank_name || '',
                iban: data.iban || '',
                bic: data.bic || '',
                tax_id: data.tax_id || '',
                ust_id: data.ust_id || '',
                footer_text: data.footer_text || '',
                terms_text: data.terms_text || ''
            })
        }
        setLoading(false)
    }

    const handleSaveWorkshop = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!workshopId) return

        setSaving(true)
        const { error } = await supabase
            .from('workshops')
            .update({
                name: workshopForm.name,
                email: workshopForm.email,
                phone: workshopForm.phone,
                address: workshopForm.address,
                city: workshopForm.city,
                postal_code: workshopForm.postal_code,
                bank_name: workshopForm.bank_name,
                iban: workshopForm.iban,
                bic: workshopForm.bic,
                tax_id: workshopForm.tax_id,
                ust_id: workshopForm.ust_id,
                footer_text: workshopForm.footer_text,
                terms_text: workshopForm.terms_text,
                updated_at: new Date().toISOString()
            })
            .eq('id', workshopId)

        if (error) {
            console.error('Error updating workshop:', error)
            toast.error('Fehler beim Speichern', { description: error.message })
        } else {
            toast.success('Werkstatt-Daten gespeichert')
            fetchWorkshop()
        }
        setSaving(false)
    }

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

    const filteredNavItems = navItems.filter(item =>
        !item.adminOnly || (userRole === 'admin' || userRole === 'owner')
    )

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-muted-foreground">Lädt Einstellungen...</p>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    const renderContent = () => {
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
                                        <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                                            <AvatarImage src="" />
                                            <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-semibold">
                                                {user?.user_metadata?.full_name || 'Benutzer'}
                                            </h3>
                                            <p className="text-muted-foreground">{user?.email}</p>
                                            <p className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded inline-block">
                                                {userRole === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                                            </p>
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
                return (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Werkstatt-Details</CardTitle>
                                <CardDescription>
                                    Verwalten Sie Ihre Werkstatt-Informationen
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSaveWorkshop} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="workshop-name">Werkstatt-Name</Label>
                                        <Input
                                            id="workshop-name"
                                            value={workshopForm.name}
                                            onChange={(e) => setWorkshopForm({ ...workshopForm, name: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="workshop-email">E-Mail</Label>
                                            <Input
                                                id="workshop-email"
                                                type="email"
                                                value={workshopForm.email}
                                                onChange={(e) => setWorkshopForm({ ...workshopForm, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="workshop-phone">Telefon</Label>
                                            <Input
                                                id="workshop-phone"
                                                type="tel"
                                                value={workshopForm.phone}
                                                onChange={(e) => setWorkshopForm({ ...workshopForm, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="workshop-address">Adresse</Label>
                                        <Input
                                            id="workshop-address"
                                            value={workshopForm.address}
                                            onChange={(e) => setWorkshopForm({ ...workshopForm, address: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="workshop-city">Stadt</Label>
                                            <Input
                                                id="workshop-city"
                                                value={workshopForm.city}
                                                onChange={(e) => setWorkshopForm({ ...workshopForm, city: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="workshop-postal">PLZ</Label>
                                            <Input
                                                id="workshop-postal"
                                                value={workshopForm.postal_code}
                                                onChange={(e) => setWorkshopForm({ ...workshopForm, postal_code: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t pt-6 mt-6">
                                        <h3 className="text-lg font-medium mb-4">Bankverbindung & Rechtliches</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="workshop-bank">Bankname</Label>
                                                <Input
                                                    id="workshop-bank"
                                                    value={workshopForm.bank_name}
                                                    onChange={(e) => setWorkshopForm({ ...workshopForm, bank_name: e.target.value })}
                                                    placeholder="z.B. Sparkasse"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="workshop-iban">IBAN</Label>
                                                <Input
                                                    id="workshop-iban"
                                                    value={workshopForm.iban}
                                                    onChange={(e) => setWorkshopForm({ ...workshopForm, iban: e.target.value })}
                                                    placeholder="DE..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="workshop-bic">BIC</Label>
                                                <Input
                                                    id="workshop-bic"
                                                    value={workshopForm.bic}
                                                    onChange={(e) => setWorkshopForm({ ...workshopForm, bic: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="workshop-tax">Steuernummer</Label>
                                                <Input
                                                    id="workshop-tax"
                                                    value={workshopForm.tax_id}
                                                    onChange={(e) => setWorkshopForm({ ...workshopForm, tax_id: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="workshop-ust">USt-IdNr.</Label>
                                                <Input
                                                    id="workshop-ust"
                                                    value={workshopForm.ust_id}
                                                    onChange={(e) => setWorkshopForm({ ...workshopForm, ust_id: e.target.value })}
                                                    placeholder="DE..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t pt-6 mt-6">
                                        <h3 className="text-lg font-medium mb-4">Dokumente</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="workshop-footer">Fußzeile (für Rechnungen/Aufträge)</Label>
                                                <Input
                                                    id="workshop-footer"
                                                    value={workshopForm.footer_text}
                                                    onChange={(e) => setWorkshopForm({ ...workshopForm, footer_text: e.target.value })}
                                                    placeholder="z.B. Geschäftsführer: Max Mustermann • Amtsgericht Musterstadt"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="workshop-terms">Zahlungsbedingungen / AGB Kurztext</Label>
                                                <textarea
                                                    id="workshop-terms"
                                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={workshopForm.terms_text}
                                                    onChange={(e) => setWorkshopForm({ ...workshopForm, terms_text: e.target.value })}
                                                    placeholder="z.B. Zahlbar sofort ohne Abzug. Es gelten unsere allgemeinen Geschäftsbedingungen."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <Button type="submit" disabled={saving}>
                                            {saving ? 'Speichert...' : 'Änderungen speichern'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )

            case 'employees':
                return <EmployeeManagement />

            case 'checklists':
                return <ChecklistTemplateManager />

            case 'intake':
                return <AcceptanceSettings workshopName={workshop?.name} />

            case 'leasing':
                return <LeasingSettings />

            case 'notifications':
                return <NotificationSettings />

            case 'security':
                return <SecuritySettings />

            case 'display':
                return <DisplaySettings />

            case 'data':
                return <DataManagementSettings />

            case 'neurad':
                return <NeuradSettings />

            case 'inquiries':
                return <CustomerInquiriesSettings />

            case 'export':
                return <DataExport />

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
                        <nav className="space-y-1 sticky top-4 p-2 rounded-xl bg-muted/30 border">
                            {filteredNavItems.map((item) => {
                                const Icon = item.icon
                                const isActive = activeSection === item.id

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveSection(item.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                                            isActive
                                                ? "bg-background shadow-sm border text-foreground"
                                                : "hover:bg-background/50 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-1.5 rounded-md transition-colors",
                                            isActive ? "bg-primary/10 text-primary" : "bg-muted"
                                        )}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <span className="font-medium text-sm">{item.label}</span>
                                        {isActive && (
                                            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                                        )}
                                    </button>
                                )
                            })}
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
