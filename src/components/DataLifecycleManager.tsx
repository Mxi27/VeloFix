import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Shield,
    Trash2,
    RefreshCcw,
    History,
    Settings2,
    AlertTriangle,
    Database,
    Clock,
    BarChart3
} from "lucide-react"
import { toastSuccess, toastError } from "@/lib/toast-utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { OrdersTable } from "./OrdersTable"
import { BikeBuildsTable } from "./BikeBuildsTable"
import { Progress } from "@/components/ui/progress"

export function DataLifecycleManager() {
    const { workshopId } = useAuth()
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState({
        activeOrders: 0,
        archivedOrders: 0,
        trashedOrders: 0,
        bikeBuilds: 0,
        trashedBuilds: 0,
        inquiries: 0
    })

    // Policy settings
    const [inquiryRetention, setInquiryRetention] = useState(30)
    const [orderRetention, setOrderRetention] = useState(365)
    const [trashRetention, setTrashRetention] = useState(30)

    useEffect(() => {
        if (workshopId) {
            fetchStats()
            fetchSettings()
        }
    }, [workshopId])

    const fetchStats = async () => {
        if (!workshopId) return

        try {
            const [
                { count: activeCount },
                { count: archivedCount },
                { count: trashedOrderCount },
                { count: buildCount },
                { count: trashedBuildCount },
                { count: inquiryCount }
            ] = await Promise.all([
                supabase.from('orders').select('*', { count: 'exact', head: true }).eq('workshop_id', workshopId).neq('status', 'trash').neq('status', 'abgeschlossen'),
                supabase.from('orders').select('*', { count: 'exact', head: true }).eq('workshop_id', workshopId).eq('status', 'abgeschlossen'),
                supabase.from('orders').select('*', { count: 'exact', head: true }).eq('workshop_id', workshopId).eq('status', 'trash'),
                supabase.from('bike_builds').select('*', { count: 'exact', head: true }).eq('workshop_id', workshopId).neq('status', 'trash'),
                supabase.from('bike_builds').select('*', { count: 'exact', head: true }).eq('workshop_id', workshopId).eq('status', 'trash'),
                supabase.from('intake_requests').select('*', { count: 'exact', head: true }).eq('workshop_id', workshopId)
            ])

            setStats({
                activeOrders: activeCount || 0,
                archivedOrders: archivedCount || 0,
                trashedOrders: trashedOrderCount || 0,
                bikeBuilds: buildCount || 0,
                trashedBuilds: trashedBuildCount || 0,
                inquiries: inquiryCount || 0
            })
        } catch (error) {
            console.error("Error fetching data stats:", error)
        }
    }

    const fetchSettings = async () => {
        if (!workshopId) return
        const { data, error } = await supabase
            .from('workshops')
            .select('inquiry_retention_days, order_retention_days, trash_retention_days')
            .eq('id', workshopId)
            .single()

        if (data && !error) {
            setInquiryRetention(data.inquiry_retention_days || 30)
            setOrderRetention(data.order_retention_days || 365)
            setTrashRetention(data.trash_retention_days || 30)
        }
    }

    const handleUpdateSettings = async () => {
        if (!workshopId) return
        setLoading(true)
        try {
            const { error } = await supabase
                .from('workshops')
                .update({
                    inquiry_retention_days: inquiryRetention,
                    order_retention_days: orderRetention,
                    trash_retention_days: trashRetention
                })
                .eq('id', workshopId)

            if (error) throw error
            toastSuccess("Einstellungen gespeichert", "Die Aufbewahrungsrichtlinien wurden aktualisiert.")
        } catch (error) {
            toastError("Fehler", "Einstellungen konnten nicht gespeichert werden.")
        } finally {
            setLoading(false)
        }
    }

    const handleManualCleanup = async (days: number) => {
        if (!workshopId) return
        setLoading(true)
        try {
            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - days)

            const { error, count } = await supabase
                .from('orders')
                .update({ status: 'trash', trash_date: new Date().toISOString() })
                .eq('workshop_id', workshopId)
                .eq('status', 'abgeschlossen')
                .lt('created_date', cutoffDate.toISOString())

            if (error) throw error
            toastSuccess("Bereinigung abgeschlossen", `${count || 0} Aufträge wurden in den Papierkorb verschoben.`)
            fetchStats()
        } catch (error) {
            toastError("Fehler", "Manuelle Bereinigung fehlgeschlagen.")
        } finally {
            setLoading(false)
        }
    }

    const handleEmptyTrash = async () => {
        if (!workshopId) return
        setLoading(true)
        try {
            const { error: error1 } = await supabase
                .from('orders')
                .delete()
                .eq('workshop_id', workshopId)
                .eq('status', 'trash')

            const { error: error2 } = await supabase
                .from('bike_builds')
                .delete()
                .eq('workshop_id', workshopId)
                .eq('status', 'trash')

            if (error1 || error2) throw (error1 || error2)
            toastSuccess("Papierkorb geleert", "Alle gelöschten Daten wurden dauerhaft entfernt.")
            fetchStats()
        } catch (error) {
            toastError("Fehler", "Papierkorb konnte nicht geleert werden.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Daten & Archiv</h2>
                    <p className="text-muted-foreground">Verwalten Sie Ihre Datenbestände, Aufbewahrungsfristen und den Papierkorb.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-muted/30 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Database className="h-4 w-4 text-blue-500" />
                            Aufträge Gesamt
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeOrders + stats.archivedOrders}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.activeOrders} aktiv, {stats.archivedOrders} archiviert
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <History className="h-4 w-4 text-amber-500" />
                            Im Papierkorb
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.trashedOrders + stats.trashedBuilds}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ablauf nach {trashRetention} Tagen
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-green-500" />
                            Systemlast
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">Speicherbelegung</span>
                            <span className="text-xs text-muted-foreground">Niedrig</span>
                        </div>
                        <Progress value={15} className="h-1.5" />
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="recovery" className="w-full">
                <TabsList className="w-auto inline-flex h-11 items-center justify-center rounded-xl bg-muted/40 p-1 text-muted-foreground border border-border/40 backdrop-blur-sm">
                    <TabsTrigger
                        value="recovery"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Wiederherstellung
                    </TabsTrigger>
                    <TabsTrigger
                        value="policy"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md gap-2"
                    >
                        <Settings2 className="h-4 w-4" />
                        Richtlinien
                    </TabsTrigger>
                    <TabsTrigger
                        value="cleanup"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md gap-2"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Bereinigung
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="recovery" className="mt-6 space-y-6">
                    <Card className="border-none shadow-sm bg-card/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle>Papierkorb</CardTitle>
                                <CardDescription>Stellen Sie versehentlich gelöschte Daten innerhalb von {trashRetention} Tagen wieder her.</CardDescription>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                                        Papierkorb leeren
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Papierkorb endgültig leeren?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Diese Aktion löscht alle {stats.trashedOrders + stats.trashedBuilds} Einträge unwiderruflich aus der Datenbank.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleEmptyTrash} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                            Endgültig löschen
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="orders" className="w-full">
                                <TabsList variant="line" className="mb-4">
                                    <TabsTrigger value="orders">Werkstatt-Aufträge ({stats.trashedOrders})</TabsTrigger>
                                    <TabsTrigger value="builds">Neurad-Montagen ({stats.trashedBuilds})</TabsTrigger>
                                </TabsList>
                                <TabsContent value="orders">
                                    <OrdersTable mode="trash" />
                                </TabsContent>
                                <TabsContent value="builds">
                                    <BikeBuildsTable mode="trash" />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="policy" className="mt-6">
                    <Card className="border-none shadow-sm bg-card/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Aufbewahrungsfristen
                            </CardTitle>
                            <CardDescription>Automatisierte Datenlöschung zur Einhaltung der DSGVO-Minimierung.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6">
                                <div className="grid gap-3">
                                    <Label htmlFor="inquiry-retention" className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        Digitale Annahme: Anfragen aufbewahren (Tage)
                                    </Label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            id="inquiry-retention"
                                            type="number"
                                            value={inquiryRetention}
                                            onChange={(e) => setInquiryRetention(parseInt(e.target.value))}
                                            className="max-w-[120px]"
                                        />
                                        <p className="text-sm text-muted-foreground">Unbearbeitete Anfragen werden nach diesem Zeitraum gelöscht.</p>
                                    </div>
                                </div>

                                <div className="grid gap-3">
                                    <Label htmlFor="order-retention" className="flex items-center gap-2">
                                        <History className="h-4 w-4 text-muted-foreground" />
                                        Archivierte Aufträge aufbewahren (Tage)
                                    </Label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            id="order-retention"
                                            type="number"
                                            value={orderRetention}
                                            onChange={(e) => setOrderRetention(parseInt(e.target.value))}
                                            className="max-w-[120px]"
                                        />
                                        <p className="text-sm text-muted-foreground">Abgeschlossene Aufträge werden nach diesem Zeitraum automatisch gelöscht.</p>
                                    </div>
                                </div>

                                <div className="grid gap-3">
                                    <Label htmlFor="trash-retention" className="flex items-center gap-2">
                                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                                        Papierkorb automatisch leeren nach (Tage)
                                    </Label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            id="trash-retention"
                                            type="number"
                                            value={trashRetention}
                                            onChange={(e) => setTrashRetention(parseInt(e.target.value))}
                                            className="max-w-[120px]"
                                        />
                                        <p className="text-sm text-muted-foreground">Gibt Ihnen Zeit zur Wiederherstellung versehentlicher Löschungen.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-border/40">
                                <Button onClick={handleUpdateSettings} disabled={loading} className="gap-2">
                                    {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
                                    Änderungen speichern
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="cleanup" className="mt-6">
                    <Card className="border-none shadow-sm bg-card/50 border-amber-500/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Manuelle Bereinigung
                            </CardTitle>
                            <CardDescription>Einmaliges Entfernen alter Datenbestände außerhalb der automatischen Zyklen.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                                <p className="text-sm text-amber-800 dark:text-amber-300">
                                    <strong>Hinweis:</strong> Die manuelle Bereinigung verschiebt Aufträge erst in den Papierkorb. Erst nach Ablauf der Papierkorb-Frist ({trashRetention} Tage) werden sie endgültig gelöscht.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-border/60 rounded-xl bg-background/50">
                                    <div className="space-y-1">
                                        <h4 className="font-medium">Veraltete Aufträge (älter als 6 Monate)</h4>
                                        <p className="text-xs text-muted-foreground">Verschiebt abgeschlossene Aufträge vor dem {new Date(Date.now() - 180 * 86400000).toLocaleDateString()} in den Papierkorb.</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => handleManualCleanup(180)} disabled={loading}>
                                        Jetzt bereinigen
                                    </Button>
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-border/60 rounded-xl bg-background/50">
                                    <div className="space-y-1">
                                        <h4 className="font-medium">Alte Aufträge (älter als 1 Jahr)</h4>
                                        <p className="text-xs text-muted-foreground">Befreit Ihr System von Altlasten, die älter als ein Jahr sind.</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => handleManualCleanup(365)} disabled={loading}>
                                        Jetzt bereinigen
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
