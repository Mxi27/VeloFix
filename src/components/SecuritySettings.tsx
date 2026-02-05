import { useState } from 'react'
import { Shield, Key, Trash2, LogOut, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from 'sonner'

export function SecuritySettings() {
    const { user } = useAuth()
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [changingPassword, setChangingPassword] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            toast.error('Die Passwörter stimmen nicht überein')
            return
        }

        if (newPassword.length < 8) {
            toast.error('Das Passwort muss mindestens 8 Zeichen lang sein')
            return
        }

        setChangingPassword(true)
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        })

        if (error) {
            toast.error('Fehler beim Ändern des Passworts: ' + error.message)
        } else {
            toast.success('Passwort erfolgreich geändert')
            setNewPassword('')
            setConfirmPassword('')
        }
        setChangingPassword(false)
    }

    const handleSignOutAll = async () => {
        const { error } = await supabase.auth.signOut({ scope: 'global' })
        if (error) {
            toast.error('Fehler beim Abmelden')
        } else {
            toast.success('Von allen Geräten abgemeldet')
        }
    }

    return (
        <div className="space-y-6">
            {/* Password Change */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Key className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Passwort ändern</CardTitle>
                            <CardDescription>
                                Aktualisieren Sie Ihr Anmeldepasswort
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">Neues Passwort</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mindestens 8 Zeichen"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Passwort wiederholen"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={changingPassword || !newPassword || !confirmPassword}
                        >
                            {changingPassword ? 'Wird geändert...' : 'Passwort ändern'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Sessions */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Aktive Sitzungen</CardTitle>
                            <CardDescription>
                                Verwalten Sie Ihre angemeldeten Geräte
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                            <p className="font-medium text-sm">Aktuelle Sitzung</p>
                            <p className="text-xs text-muted-foreground">
                                Angemeldet als {user?.email}
                            </p>
                        </div>
                        <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded">
                            Aktiv
                        </span>
                    </div>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleSignOutAll}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Von allen Geräten abmelden
                    </Button>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-destructive">Gefahrenzone</CardTitle>
                            <CardDescription>
                                Unwiderrufliche Aktionen für Ihr Konto
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                        <div>
                            <p className="font-medium text-sm">Konto löschen</p>
                            <p className="text-xs text-muted-foreground">
                                Alle Daten werden unwiderruflich gelöscht
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Löschen
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Account Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">
                            Konto wirklich löschen?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>
                                Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre Daten,
                                Aufträge und Werkstattinformationen werden permanent gelöscht.
                            </p>
                            <div className="space-y-2 pt-2">
                                <Label htmlFor="delete-confirm">
                                    Geben Sie "LÖSCHEN" ein um zu bestätigen:
                                </Label>
                                <Input
                                    id="delete-confirm"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder="LÖSCHEN"
                                    className="border-destructive/50"
                                />
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
                            Abbrechen
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteConfirmText !== 'LÖSCHEN'}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                toast.info('Kontaktieren Sie den Support um Ihr Konto zu löschen')
                                setShowDeleteDialog(false)
                                setDeleteConfirmText('')
                            }}
                        >
                            Konto löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
