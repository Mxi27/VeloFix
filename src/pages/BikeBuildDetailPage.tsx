import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { PageTransition } from "@/components/PageTransition"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Save, Trash2, Bike } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"

interface BikeBuild {
    id: string
    created_at: string
    brand: string
    model: string
    color: string
    frame_size: string
    internal_number: string
    battery_serial: string | null
    notes: string | null
    mechanic_name: string | null
}

export default function BikeBuildDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    useAuth()

    const [build, setBuild] = useState<BikeBuild | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
        const fetchBuild = async () => {
            if (!id) return

            const { data, error } = await supabase
                .from('bike_builds')
                .select('*')
                .eq('id', id)
                .single()

            if (error) {
                console.error(error)
                toast.error("Fehler beim Laden")
                navigate("/dashboard/bike-builds")
                return
            }

            setBuild(data)
            setLoading(false)
        }

        fetchBuild()
    }, [id, navigate])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!build || !id) return

        setSaving(true)
        try {
            const { error } = await supabase
                .from('bike_builds')
                .update({
                    brand: build.brand,
                    model: build.model,
                    color: build.color,
                    frame_size: build.frame_size,
                    internal_number: build.internal_number,
                    battery_serial: build.battery_serial,
                    notes: build.notes,
                })
                .eq('id', id)

            if (error) throw error

            toast.success("Änderungen gespeichert")
            setHasChanges(false)
        } catch (error) {
            console.error(error)
            toast.error("Fehler beim Speichern")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("Möchten Sie diesen Eintrag wirklich löschen?")) return

        try {
            const { error } = await supabase
                .from('bike_builds')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success("Eintrag gelöscht")
            navigate("/dashboard/bike-builds")
        } catch (error) {
            console.error(error)
            toast.error("Fehler beim Löschen")
        }
    }

    const updateField = (field: keyof BikeBuild, value: string) => {
        if (!build) return
        setBuild({ ...build, [field]: value })
        setHasChanges(true)
    }

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!build) return null

    return (
        <PageTransition>
            <DashboardLayout>
                <div className="flex flex-col gap-8 max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <Button
                                variant="ghost"
                                className="pl-0 gap-2 text-muted-foreground hover:text-foreground"
                                onClick={() => navigate("/dashboard/bike-builds")}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Zurück zur Übersicht
                            </Button>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold tracking-tight">
                                    {build.brand} {build.model}
                                </h1>
                                <Badge variant="outline" className="text-lg px-3 py-1 bg-background/50">
                                    {build.internal_number}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="destructive"
                                size="icon"
                                onClick={handleDelete}
                                className="h-10 w-10 opacity-70 hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={!hasChanges || saving}
                                className="min-w-[140px] shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all"
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Speichern
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Main Info Card */}
                        <Card className="md:col-span-2 border-border/50 bg-card/30 backdrop-blur-sm shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Bike className="h-5 w-5 text-primary" />
                                    Fahrrad Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="brand">Marke</Label>
                                        <Input
                                            id="brand"
                                            value={build.brand}
                                            onChange={(e) => updateField('brand', e.target.value)}
                                            className="bg-background/50 border-input/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="model">Modell</Label>
                                        <Input
                                            id="model"
                                            value={build.model}
                                            onChange={(e) => updateField('model', e.target.value)}
                                            className="bg-background/50 border-input/50"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="color">Farbe</Label>
                                        <Input
                                            id="color"
                                            value={build.color}
                                            onChange={(e) => updateField('color', e.target.value)}
                                            className="bg-background/50 border-input/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="frame_size">Rahmenhöhe</Label>
                                        <Input
                                            id="frame_size"
                                            value={build.frame_size}
                                            onChange={(e) => updateField('frame_size', e.target.value)}
                                            className="bg-background/50 border-input/50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="internal_number">Interne Nummer</Label>
                                    <Input
                                        id="internal_number"
                                        value={build.internal_number}
                                        onChange={(e) => updateField('internal_number', e.target.value)}
                                        className="bg-background/50 border-input/50 font-mono"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Additional Info / Meta */}
                        <div className="space-y-6">
                            <Card className="border-border/50 bg-card/30 backdrop-blur-sm shadow-lg">
                                <CardHeader>
                                    <CardTitle className="text-lg">Zusatzinfos</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="battery">Akku Nummer</Label>
                                        <Input
                                            id="battery"
                                            value={build.battery_serial || ''}
                                            onChange={(e) => updateField('battery_serial', e.target.value)}
                                            placeholder="-- "
                                            className="bg-background/50 border-input/50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Mechaniker</Label>
                                        <div className="p-3 rounded-md bg-muted/30 border border-border/30 text-sm">
                                            {build.mechanic_name || "Unbekannt"}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Erstellt am</Label>
                                        <div className="p-3 rounded-md bg-muted/30 border border-border/30 text-sm">
                                            {new Date(build.created_at).toLocaleDateString('de-DE')}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-card/30 backdrop-blur-sm shadow-lg">
                                <CardHeader>
                                    <CardTitle className="text-lg">Notizen</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        value={build.notes || ''}
                                        onChange={(e) => updateField('notes', e.target.value)}
                                        className="bg-background/50 border-input/50 min-h-[150px] resize-none"
                                        placeholder="Hier ist Platz für interne Notizen..."
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </PageTransition>
    )
}
