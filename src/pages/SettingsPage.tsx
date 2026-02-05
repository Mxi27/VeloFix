import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { WorkshopIdCard } from '@/components/WorkshopIdCard'
import { EmployeeManagement } from '@/components/EmployeeManagement'
import { ChecklistTemplateManager } from '@/components/ChecklistTemplateManager'
import { LeasingSettings } from '@/components/LeasingSettings'
import { AcceptanceSettings } from '@/components/AcceptanceSettings'
import { NotificationSettings } from '@/components/NotificationSettings'
import { SecuritySettings } from '@/components/SecuritySettings'
import { DisplaySettings } from '@/components/DisplaySettings'
import { DataExport } from '@/components/DataExport'
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
    FileSpreadsheet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/supabase'

type Workshop = Database['public']['Tables']['workshops']['Row']

type SettingsSection =
    | 'profile'
    | 'workshop'
    | 'employees'
    | 'checklists'
    | 'intake'
    | 'leasing'
    | 'notifications'
    | 'security'
    | 'display'
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
    { id: 'intake', label: 'Annahme', icon: ClipboardList, adminOnly: true },
    { id: 'leasing', label: 'Leasing', icon: CreditCard, adminOnly: true },
    { id: 'export', label: 'Datenexport', icon: FileSpreadsheet, adminOnly: true },
    { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
    { id: 'security', label: 'Sicherheit', icon: Shield },
    { id: 'display', label: 'Darstellung', icon: Palette },
]

export default function SettingsPage() {
    const { user, workshopId, userRole } = useAuth()
    const [workshop, setWorkshop] = useState<Workshop | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

    const [workshopForm, setWorkshopForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: '',
        website: '',
        opening_hours: ''
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
                opening_hours: (data as any).opening_hours || ''
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
                updated_at: new Date().toISOString()
            })
            .eq('id', workshopId)

        if (error) {
            console.error('Error updating workshop:', error)
        } else {
            fetchWorkshop()
        }
        setSaving(false)
    }

    const initials = user?.user_metadata?.full_name
        ?.split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase() || 'U'

    const filteredNavItems = navItems.filter(item =>
        !item.adminOnly || userRole === 'admin'
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
                                    Ihre persönlichen Informationen
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
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

                                <div className="pt-6 border-t space-y-4">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                                                Name
                                            </Label>
                                            <p className="font-medium">
                                                {user?.user_metadata?.full_name || 'Nicht angegeben'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                                                E-Mail
                                            </Label>
                                            <p className="font-medium">{user?.email}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                                            Benutzer-ID
                                        </Label>
                                        <p className="font-mono text-xs text-muted-foreground bg-muted px-3 py-2 rounded">
                                            {user?.id}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )

            case 'workshop':
                return (
                    <div className="space-y-6">
                        {workshop && workshopId && (
                            <WorkshopIdCard
                                workshopId={workshopId}
                                workshopName={workshop.name}
                            />
                        )}

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

            case 'export':
                return <DataExport />

            default:
                return null
        }
    }

    return (
        <PageTransition>
            <DashboardLayout>
                <div className="flex flex-col gap-2 mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Einstellungen</h1>
                    <p className="text-muted-foreground">
                        {userRole === 'admin'
                            ? 'Verwalten Sie Ihr Profil, Werkstatt-Details und Mitarbeiter'
                            : 'Verwalten Sie Ihr Benutzerprofil und Präferenzen'}
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <div className="lg:w-64 shrink-0">
                        <nav className="space-y-1 sticky top-4">
                            {filteredNavItems.map((item) => {
                                const Icon = item.icon
                                const isActive = activeSection === item.id

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveSection(item.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-md"
                                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Icon className="h-5 w-5 shrink-0" />
                                        <span className="font-medium">{item.label}</span>
                                        {isActive && (
                                            <ChevronRight className="h-4 w-4 ml-auto" />
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
