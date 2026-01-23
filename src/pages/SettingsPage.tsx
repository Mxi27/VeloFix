import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { PageTransition } from '@/components/PageTransition'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { User, Building2, Users, ListChecks, CreditCard, ClipboardList } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Workshop = Database['public']['Tables']['workshops']['Row']

export default function SettingsPage() {
    const { user, workshopId } = useAuth()
    const [workshop, setWorkshop] = useState<Workshop | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [workshopForm, setWorkshopForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: ''
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
                postal_code: data.postal_code || ''
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

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-screen">
                    <p className="text-muted-foreground">Lädt Einstellungen...</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <PageTransition>
            <DashboardLayout>
                <div className="flex flex-col gap-2 mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Einstellungen</h1>
                    <p className="text-muted-foreground">
                        Verwalten Sie Ihr Profil, Werkstatt-Details und Mitarbeiter
                    </p>
                </div>

                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList variant="line" className="w-full justify-start border-b mb-6 overflow-x-auto flex-nowrap no-scrollbar pb-1">
                        <TabsTrigger value="profile" className="gap-2 whitespace-nowrap">
                            <User className="h-4 w-4" />
                            <span className="hidden sm:inline">Profil</span>
                        </TabsTrigger>
                        <TabsTrigger value="workshop" className="gap-2 whitespace-nowrap">
                            <Building2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Werkstatt</span>
                        </TabsTrigger>
                        <TabsTrigger value="employees" className="gap-2 whitespace-nowrap">
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Mitarbeiter</span>
                        </TabsTrigger>
                        <TabsTrigger value="checklists" className="gap-2 whitespace-nowrap">
                            <ListChecks className="h-4 w-4" />
                            <span className="hidden sm:inline">Checklisten</span>
                        </TabsTrigger>
                        <TabsTrigger value="intake" className="gap-2 whitespace-nowrap">
                            <ClipboardList className="h-4 w-4" />
                            <span className="hidden sm:inline">Annahme</span>
                        </TabsTrigger>
                        <TabsTrigger value="leasing" className="gap-2 whitespace-nowrap">
                            <CreditCard className="h-4 w-4" />
                            <span className="hidden sm:inline">Leasing</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Profile Tab */}
                    <TabsContent value="profile" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Benutzerprofil</CardTitle>
                                <CardDescription>
                                    Ihre persönlichen Informationen
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src="" />
                                        <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {user?.user_metadata?.full_name || 'Benutzer'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-muted-foreground">Name</Label>
                                            <p className="font-medium">
                                                {user?.user_metadata?.full_name || 'Nicht angegeben'}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">E-Mail</Label>
                                            <p className="font-medium">{user?.email}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Benutzer-ID</Label>
                                        <p className="font-mono text-sm text-muted-foreground">{user?.id}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Workshop Tab */}
                    <TabsContent value="workshop" className="space-y-6">
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
                                <form onSubmit={handleSaveWorkshop} className="space-y-4">
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

                                    <div className="pt-4">
                                        <Button type="submit" disabled={saving}>
                                            {saving ? 'Speichert...' : 'Änderungen speichern'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Employees Tab */}
                    <TabsContent value="employees">
                        <EmployeeManagement />
                    </TabsContent>

                    {/* Checklists Tab */}
                    <TabsContent value="checklists">
                        <ChecklistTemplateManager />
                    </TabsContent>

                    {/* Intake Tab */}
                    <TabsContent value="intake">
                        <AcceptanceSettings />
                    </TabsContent>

                    {/* Leasing Tab */}
                    <TabsContent value="leasing">
                        <LeasingSettings />
                    </TabsContent>
                </Tabs>
            </DashboardLayout>
        </PageTransition>
    )
}
