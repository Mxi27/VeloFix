import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Trash2, AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
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

export function DataManagementSettings() {
    const { workshopId } = useAuth()
    const [loading, setLoading] = useState(false)
    const [statsLoading, setStatsLoading] = useState(false)
    const [oldRequestsCount, setOldRequestsCount] = useState(0)
    const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false)

    useEffect(() => {
        fetchStats()
        // Here we would also fetch the 'auto_delete_enabled' setting from workshop config
    }, [workshopId])

    const fetchStats = async () => {
        if (!workshopId) return
        setStatsLoading(true)
        try {
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

            const { count, error } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('workshop_id', workshopId)
                .in('status', ['abgeschlossen', 'abgeholt'])
                .lt('updated_at', sevenDaysAgo.toISOString())

            if (error) throw error
            setOldRequestsCount(count || 0)
        } catch (error) {
            console.error(error)
        } finally {
            setStatsLoading(false)
        }
    }

    const handleManualCleanup = async () => {
        if (!workshopId) return
        setLoading(true)
        try {
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('workshop_id', workshopId)
                .in('status', ['abgeschlossen', 'abgeholt'])
                .lt('updated_at', sevenDaysAgo.toISOString())

            if (error) throw error
            toast.success(`${oldRequestsCount} Einträge erfolgreich gelöscht`)
            setOldRequestsCount(0)
        } catch (error) {
            toast.error("Fehler beim Löschen")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-primary" />
                        Datenbereinigung
                    </CardTitle>
                    <CardDescription>
                        Verwalten Sie die Speicherdauer Ihrer abgeschlossenen Aufträge.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between space-x-4">
                        <div className="space-y-1">
                            <Label className="text-base">Automatische Löschung</Label>
                            <p className="text-sm text-muted-foreground">
                                Abgeschlossene Aufträge, die älter als 7 Tage sind, automatisch entfernen.
                            </p>
                        </div>
                        <Switch
                            checked={autoDeleteEnabled}
                            onCheckedChange={setAutoDeleteEnabled}
                            aria-label="Automatische Löschung aktivieren"
                        />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label className="text-base text-destructive flex items-center gap-2">
                                    Manuelle Bereinigung
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Löschen Sie sofort alle abgeschlossenen Aufträge, die älter als 7 Tage sind.
                                </p>
                            </div>
                            {statsLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                                <div className="text-sm font-medium bg-muted px-3 py-1 rounded-full">
                                    {oldRequestsCount} Kandidaten gefunden
                                </div>
                            )}
                        </div>

                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-destructive">Achtung: Unwiderruflich!</p>
                                <p className="text-sm text-destructive/80">
                                    Diese Aktion löscht alle abgeschlossenen Aufträge, die älter als 7 Tage sind, dauerhaft aus der Datenbank.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading || statsLoading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
                                Prüfen
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={loading || oldRequestsCount === 0}>
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                        Jetzt bereinigen
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Dies wird {oldRequestsCount} abgeschlossene Aufträge unwiderruflich löschen.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleManualCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                            Löschen bestätigen
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
