import { useState, useEffect } from 'react'
import { Plus, Trash2, CreditCard, Save, Pencil, X, Check } from 'lucide-react'
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

export function LeasingSettings() {
    const { workshopId } = useAuth()
    const [providers, setProviders] = useState<string[]>([])
    const [newProvider, setNewProvider] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Editing state
    const [editingProvider, setEditingProvider] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [providerToDelete, setProviderToDelete] = useState<string | null>(null)

    useEffect(() => {
        if (workshopId) {
            fetchProviders()
        }
    }, [workshopId])

    const fetchProviders = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('workshops')
            .select('leasing_providers')
            .eq('id', workshopId)
            .single()

        if (error) {
            console.error('Error fetching leasing providers:', error)
        } else {
            // Ensure we handle null or undefined gracefully by defaulting to empty array
            const fetchedProviders = data?.leasing_providers
            if (Array.isArray(fetchedProviders)) {
                setProviders(fetchedProviders)
            } else {
                setProviders([])
            }
        }
        setLoading(false)
    }

    const handleAddProvider = () => {
        if (!newProvider.trim()) return
        if (providers.includes(newProvider.trim())) return

        const updatedProviders = [...providers, newProvider.trim()]
        setProviders(updatedProviders)
        setNewProvider('')
        saveProviders(updatedProviders)
    }

    const startEditing = (provider: string) => {
        setEditingProvider(provider)
        setEditValue(provider)
    }

    const cancelEditing = () => {
        setEditingProvider(null)
        setEditValue('')
    }

    const saveEditing = () => {
        if (!editValue.trim() || !editingProvider) return

        // Prevent duplicates (excluding self)
        if (providers.some(p => p === editValue.trim() && p !== editingProvider)) {
            alert("Dieser Anbieter existiert bereits.")
            return
        }

        const updatedProviders = providers.map(p =>
            p === editingProvider ? editValue.trim() : p
        )

        setProviders(updatedProviders)
        setEditingProvider(null)
        setEditValue('')
        saveProviders(updatedProviders)
    }

    const confirmDelete = (provider: string) => {
        setProviderToDelete(provider)
    }

    const executeDelete = () => {
        if (!providerToDelete) return

        const updatedProviders = providers.filter(p => p !== providerToDelete)
        setProviders(updatedProviders)
        saveProviders(updatedProviders)
        setProviderToDelete(null)
    }

    const saveProviders = async (updatedProviders: string[]) => {
        if (!workshopId) return

        setSaving(true)
        const { error } = await supabase
            .from('workshops')
            .update({ leasing_providers: updatedProviders })
            .eq('id', workshopId)

        if (error) {
            console.error('Error saving providers:', error)
            // Revert on error? Or just show alert
            alert("Fehler beim Speichern der Anbieter")
        }
        setSaving(false)
    }

    if (loading) {
        return <div className="p-4 text-center text-muted-foreground">Lade Anbieter...</div>
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Leasing-Anbieter</CardTitle>
                            <CardDescription>
                                Verwalten Sie die Liste der verfügbaren Leasing-Anbieter für Ihre Aufträge.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-2 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="new-provider">Neuer Anbieter</Label>
                            <Input
                                id="new-provider"
                                placeholder="z.B. JobRad"
                                value={newProvider}
                                onChange={(e) => setNewProvider(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddProvider()
                                }}
                            />
                        </div>
                        <Button onClick={handleAddProvider} disabled={saving || !newProvider.trim()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Hinzufügen
                        </Button>
                    </div>

                    <div className="bg-muted/30 rounded-lg border border-border/50 overflow-hidden">
                        {providers.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                Keine Anbieter konfiguriert
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {providers.map((provider) => (
                                    <div key={provider} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors h-14">
                                        {editingProvider === provider ? (
                                            <div className="flex items-center gap-2 flex-1 mr-2">
                                                <Input
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="h-8"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveEditing()
                                                        if (e.key === 'Escape') cancelEditing()
                                                    }}
                                                />
                                                <Button size="sm" variant="ghost" onClick={saveEditing} className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30">
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-medium px-2">{provider}</span>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                                        onClick={() => startEditing(provider)}
                                                        disabled={saving}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => confirmDelete(provider)}
                                                        disabled={saving}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {saving && (
                        <div className="flex items-center justify-end text-xs text-muted-foreground animate-pulse">
                            <Save className="h-3 w-3 mr-1" />
                            Speichert...
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!providerToDelete} onOpenChange={(open) => !open && setProviderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Anbieter löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Möchten Sie "{providerToDelete}" wirklich aus der Liste entfernen?
                            Dies hat keine Auswirkungen auf bestehende Aufträge.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Löschen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
