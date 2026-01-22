import { useState, useEffect } from 'react'
import { Plus, Pencil, UserX, UserCheck, Trash2, MoreHorizontal } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@/types/supabase'

type Employee = Database['public']['Tables']['employees']['Row']

export function EmployeeManagement() {
    const { workshopId } = useAuth()
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'read' as 'admin' | 'write' | 'read'
    })

    useEffect(() => {
        if (workshopId) {
            fetchEmployees()
        }
    }, [workshopId])

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
            const { error } = await supabase
                .from('employees')
                .insert({
                    workshop_id: workshopId,
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    active: true
                })

            if (error) {
                console.error('Error creating employee:', error)
                return
            }
        }

        setDialogOpen(false)
        resetForm()
        fetchEmployees()
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
            email: employee.email,
            role: employee.role
        })
        setDialogOpen(true)
    }

    const resetForm = () => {
        setEditingEmployee(null)
        setFormData({ name: '', email: '', role: 'read' })
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
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Mitarbeiter</CardTitle>
                        <CardDescription>
                            Verwalten Sie Ihre Werkstatt-Mitarbeiter und deren Zugriffsrechte
                        </CardDescription>
                    </div>
                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        setDialogOpen(open)
                        if (!open) resetForm()
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Mitarbeiter hinzufügen
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {editingEmployee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
                                </DialogTitle>
                                <DialogDescription>
                                    {editingEmployee
                                        ? 'Bearbeiten Sie die Mitarbeiterdaten'
                                        : 'Fügen Sie einen neuen Mitarbeiter hinzu'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-Mail</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
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
                                <TableHead>E-Mail</TableHead>
                                <TableHead>Rolle</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aktionen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.map((employee) => (
                                <TableRow key={employee.id}>
                                    <TableCell className="font-medium">{employee.name}</TableCell>
                                    <TableCell>{employee.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={getRoleBadgeVariant(employee.role)}>
                                            {getRoleLabel(employee.role)}
                                        </Badge>
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
                                                            <UserX className="mr-2 h-4 w-4" />
                                                            Deaktivieren
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserCheck className="mr-2 h-4 w-4" />
                                                            Aktivieren
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => deleteEmployee(employee.id)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Löschen
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
    )
}
