import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Wrench, User, Bike, FileText, ShieldCheck } from "lucide-react"

interface BikeBuildOverviewProps {
    build: any
    onStartWorkshop: () => void
    onStartControl: () => void
}

export function BikeBuildOverview({ build, onStartWorkshop, onStartControl }: BikeBuildOverviewProps) {
    const navigate = useNavigate()

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Badge variant="secondary" className="capitalize">{build.status.replace(/_/g, ' ')}</Badge>
                        <span>•</span>
                        <span>Erstellt am {new Date(build.created_at).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={onStartWorkshop}
                        size="lg"
                        className="bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25"
                    >
                        <Wrench className="mr-2 h-5 w-5" />
                        Montage starten
                    </Button>
                    <Button
                        onClick={onStartControl}
                        size="lg"
                        variant="outline"
                        className="border-green-500/20 text-green-600 hover:bg-green-500/10"
                    >
                        <ShieldCheck className="mr-2 h-5 w-5" />
                        Kontrolle
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Bike Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bike className="h-5 w-5 text-primary" />
                            Fahrrad Daten
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Marke</p>
                                <p className="text-base">{build.brand}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Modell</p>
                                <p className="text-base">{build.model}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Farbe</p>
                                <p className="text-base">{build.color || '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Rahmengröße</p>
                                <p className="text-base">{build.frame_size || '—'}</p>
                            </div>
                        </div>
                        <Separator />
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Vorlage</p>
                            <Badge variant="outline">{build.checklist_template || 'Standard'}</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Customer Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Kunde
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Name</p>
                            <p className="text-base font-medium">{build.customer_name || 'Lagerbestand'}</p>
                        </div>
                        {build.customer_email && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Email</p>
                                <p className="text-base">{build.customer_email}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Notizen</p>
                            <p className="text-sm text-muted-foreground italic">
                                {build.notes || 'Keine Notizen'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Status / History (Placeholder) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* We could show progress summary here */}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Fortschritt</p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 bg-secondary/50 rounded-full h-2">
                                    <div
                                        className="bg-primary h-2 rounded-full"
                                        style={{ width: `${build.assembly_progress?.completed_steps?.length > 0 ? '50%' : '0%'}` }} // Rough estimate or pass steps count
                                    ></div>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {build.assembly_progress?.completed_steps?.length || 0} Schritte
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Mechaniker</p>
                            <p className="text-base">
                                {build.assigned_employee_id ? 'Zugewiesen' : 'Nicht zugewiesen'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
