import { useState, useEffect } from 'react'
import { Plus, Pencil, UserX, UserCheck, Trash2, MoreHorizontal, RefreshCw, Smartphone, Monitor } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@/types/supabase'
import { toast } from 'sonner'

type Employee = Database['public']['Tables']['employees']['Row']

export function EmployeeManagement() {
    const { workshopId } = useAuth()
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

    // Workshop Settings
    const [inviteCode, setInviteCode] = useState<string | null>(null)
    const [allowGuestJoin, setAllowGuestJoin] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'read' as 'admin' | 'write' | 'read',
        isGhost: false
    })

    useEffect(() => {
        if (workshopId) {
            fetchEmployees()
            fetchWorkshopSettings()
        }
    }, [workshopId])

    const fetchWorkshopSettings = async () => {
        if (!workshopId) return
        const { data, error } = await supabase
            .from('workshops')
            .select('invite_code, allow_guest_join')
            .eq('id', workshopId)
            .single()

        if (!error && data) {
            setInviteCode(data.invite_code)
            setAllowGuestJoin(data.allow_guest_join || false)
        }
    }

    const fetchEmployees = async () => {
        if (!workshopId) return

        setLoading(true)
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('workshop_id', workshopId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching employees:', error)
        } else {
            setEmployees(data || [])
        }
        setLoading(false)
    }

    const generateInviteCode = async () => {
        if (!workshopId) return
        const { data, error } = await supabase
            .rpc('generate_invite_code', { target_workshop_id: workshopId })

        if (error) {
            toast.error("Fehler beim Generieren des Codes")
        } else {
            setInviteCode(data)
            toast.success("Neuer Einladungscode generiert")
        }
    }

    const toggleGuestJoin = async (enabled: boolean) => {
        if (!workshopId) return
        const { error } = await supabase
            .from('workshops')
            .update({ allow_guest_join: enabled })
            .eq('id', workshopId)

        if (error) {
            toast.error("Fehler beim Speichern")
        } else {
            setAllowGuestJoin(enabled)
            toast.success(enabled ? "Beitritt aktiviert" : "Beitritt deaktiviert")
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!workshopId) return

        if (editingEmployee) {
            // Update existing employee
            const { error } = await supabase
                .from('employees')
                .update({
                    name: formData.name,
                    email: formData.email,
                    role: formData.role
                })
                .eq('id', editingEmployee.id)

            if (error) {
                console.error('Error updating employee:', error)
                return
            }
        } else {
            // Create new employee
            const emailToUse = formData.isGhost
                ? `ghost_${crypto.randomUUID()}@placeholder.local`
                : formData.email

            const { error } = await supabase
                .from('employees')
                .insert({
                    workshop_id: workshopId,
                    name: formData.name,
                    email: emailToUse,
                    role: formData.role,
                    active: true,
                    // If ghost user, user_id is null (schema allows it)
                    user_id: null
                })

            if (error) {
                console.error('Error creating employee:', JSON.stringify(error, null, 2))
                toast.error("Fehler beim Erstellen: " + error.message)
                return
            }
        }

        setDialogOpen(false)
        resetForm()
        fetchEmployees()
        toast.success(editingEmployee ? "Mitarbeiter aktualisiert" : "Mitarbeiter hinzugefügt")
    }

    // Toggle Kiosk Mode (Only relevant for users with accounts)
    const toggleKioskMode = async (employee: Employee) => {
        if (!employee.user_id) return // Ghost users can't be kiosk mode users (they are just resources)

        const { error } = await supabase
            .from('employees')
            .update({ is_kiosk_mode: !employee.is_kiosk_mode })
            .eq('id', employee.id)

        if (error) {
            toast.error("Fehler beim Ändern des Modus")
        } else {
            fetchEmployees()
            toast.success(employee.is_kiosk_mode ? "Kiosk-Modus deaktiviert" : "Kiosk-Modus aktiviert")
        }
    }

    const toggleEmployeeStatus = async (employee: Employee) => {
        const { error } = await supabase
            .from('employees')
            .update({ active: !employee.active })
            .eq('id', employee.id)

        if (error) {
            console.error('Error toggling employee status:', error)
            return
        }

        fetchEmployees()
    }

    const deleteEmployee = async (employeeId: string) => {
        if (!confirm('Möchten Sie diesen Mitarbeiter wirklich löschen?')) return

        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('id', employeeId)

        if (error) {
            console.error('Error deleting employee:', error)
            return
        }

        fetchEmployees()
    }

    const openEditDialog = (employee: Employee) => {
        setEditingEmployee(employee)
        setFormData({
            name: employee.name,
            email: employee.email.includes('@placeholder.local') ? '' : employee.email,
            role: employee.role,
            isGhost: !employee.user_id
        })
        setDialogOpen(true)
    }

    const resetForm = () => {
        setEditingEmployee(null)
        setFormData({ name: '', email: '', role: 'read', isGhost: false })
    }

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'admin': return 'default'
            case 'write': return 'secondary'
            case 'read': return 'outline'
            default: return 'outline'
        }
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'admin': return 'Administrator'
            case 'write': return 'Bearbeiter'
            case 'read': return 'Nur Lesen'
            default: return role
        }
    }

    return (
        <div className="space-y-6">
            {/* Workshop Settings Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Einladungs-Einstellungen</CardTitle>
                    <CardDescription>Steuern Sie, wie neue Mitarbeiter beitreten können</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Mitarbeiter-Beitritt erlauben</Label>
                            <p className="text-sm text-muted-foreground">
                                Wenn aktiviert, können Mitarbeiter mit dem Code beitreten
                            </p>
                        </div>
                        <Switch
                            checked={allowGuestJoin}
                            onCheckedChange={toggleGuestJoin}
                        />
                    </div>

                    {allowGuestJoin && (
                        <div className="flex items-center gap-4 mt-4 p-4 border rounded-lg bg-muted/50">
                            <div className="flex-1">
                                <Label>Ihr Einladungscode</Label>
                                <div className="text-2xl font-mono font-bold tracking-widest mt-1">
                                    {inviteCode || '---'}
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={generateInviteCode}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Generieren
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Employee List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Mitarbeiter</CardTitle>
                            <CardDescription>
                                Verwalten Sie Ihre Werkstatt-Mitarbeiter und deren Zugriffsrechte
                            </CardDescription>
                        </div>
                        <Button onClick={() => {
                            setEditingEmployee(null)
                            setFormData({
                                name: '',
                                email: '',
                                role: 'read',
                                isGhost: true // Default to Ghost for manual creation
                            })
                            setDialogOpen(true)
                        }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Lokalen Mitarbeiter erstellen (Ghost)
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-center text-muted-foreground py-8">Lade Mitarbeiter...</p>
                    ) : employees.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            Noch keine Mitarbeiter hinzugefügt
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Typ</TableHead>
                                    <TableHead>Rolle</TableHead>
                                    <TableHead>Kiosk-Modus</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aktionen</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees.map((employee) => (
                                    <TableRow key={employee.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                    style={{ backgroundColor: employee.color || '#666' }}
                                                >
                                                    {employee.initials || employee.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                {employee.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {employee.user_id ? (
                                                <Badge variant="outline" className="flex w-fit items-center gap-1">
                                                    <Smartphone className="h-3 w-3" /> Account
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="flex w-fit items-center gap-1">
                                                    <Monitor className="h-3 w-3" /> Ghost
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getRoleBadgeVariant(employee.role)}>
                                                {getRoleLabel(employee.role)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {employee.user_id ? (
                                                <Switch
                                                    checked={employee.is_kiosk_mode || false}
                                                    onCheckedChange={() => toggleKioskMode(employee)}
                                                />
                                            ) : (
                                                <span className="text-muted-foreground text-xs text-center block">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={employee.active ? 'default' : 'secondary'}>
                                                {employee.active ? 'Aktiv' : 'Inaktiv'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Menü öffnen</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => openEditDialog(employee)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Bearbeiten
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => toggleEmployeeStatus(employee)}>
                                                        {employee.active ? (
                                                            <>
                                                                <UserX className="mr-2 h-4 w-4" /> Deaktivieren
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserCheck className="mr-2 h-4 w-4" /> Aktivieren
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteEmployee(employee.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Löschen
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open)
                if (!open) {
                    setEditingEmployee(null)
                    setFormData({
                        name: '',
                        email: '',
                        role: 'read',
                        isGhost: false
                    })
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingEmployee ? 'Mitarbeiter bearbeiten' : 'Lokalen Mitarbeiter erstellen'}
                        </DialogTitle>
                        <DialogDescription>
                            Erstellen Sie einen "Ghost-User" für den Kiosk-Modus (z.B. für Tablets in der Werkstatt).
                            <br />
                            <strong>Hinweis:</strong> Echte Mitarbeiter mit eigenem Login treten über den <u>Invite Code</u> bei.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">

                            {!editingEmployee && (
                                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-200 dark:border-blue-800 text-sm mb-4">
                                    Dieser Mitarbeiter hat <strong>keinen</strong> Login. Er wird nur lokal verwaltet.
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    disabled={!!editingEmployee?.user_id}
                                />
                                {editingEmployee?.user_id && (
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Der Name wird vom Benutzerkonto verwaltet.
                                    </p>
                                )}
                            </div>

                            {!formData.isGhost && (
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-Mail</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required={!formData.isGhost}
                                        disabled={!!editingEmployee?.user_id}
                                    />
                                    {editingEmployee?.user_id && (
                                        <p className="text-[0.8rem] text-muted-foreground">
                                            Die E-Mail wird vom Benutzerkonto verwaltet.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="role">Rolle</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value: 'admin' | 'write' | 'read') =>
                                        setFormData({ ...formData, role: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Administrator</SelectItem>
                                        <SelectItem value="write">Bearbeiter</SelectItem>
                                        <SelectItem value="read">Nur Lesen</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button type="submit">
                                {editingEmployee ? 'Speichern' : 'Hinzufügen'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
