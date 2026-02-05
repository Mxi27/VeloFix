import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toastSuccess, toastError } from '@/lib/toast-utils'
import * as XLSX from 'xlsx'

export function DataExport() {
    const { workshopId } = useAuth()
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
    const [exporting, setExporting] = useState(false)

    // Generate years from 2020 to current + 1
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: currentYear - 2019 }, (_, i) => (currentYear - i).toString())

    const handleExport = async () => {
        if (!workshopId) {
            toastError('Fehler', 'Werkstatt-ID nicht gefunden')
            return
        }

        setExporting(true)
        try {
            const year = parseInt(selectedYear)
            const startDate = `${year}-01-01T00:00:00.000Z`
            const endDate = `${year}-12-31T23:59:59.999Z`

            // Fetch orders
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .eq('workshop_id', workshopId)
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: false })

            if (ordersError) throw ordersError

            // Fetch bike builds
            const { data: bikeBuilds, error: bikeBuildsError } = await supabase
                .from('bike_builds')
                .select('*')
                .eq('workshop_id', workshopId)
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: false })

            if (bikeBuildsError) throw bikeBuildsError

            // Format orders for Excel
            const ordersData = (orders || []).map(order => ({
                'Auftragsnummer': order.order_number,
                'Status': formatStatus(order.status),
                'Kundenname': order.customer_name,
                'E-Mail': order.customer_email || '—',
                'Telefon': order.customer_phone || '—',
                'Fahrradmodell': order.bike_model || '—',
                'Fahrradtyp': order.bike_type || '—',
                'Leasing': order.is_leasing ? 'Ja' : 'Nein',
                'Leasing-Anbieter': order.leasing_provider || '—',
                'Geschätzter Preis': order.estimated_price ? `${order.estimated_price} €` : '—',
                'Endpreis': order.final_price ? `${order.final_price} €` : '—',
                'Erstellt am': formatDate(order.created_at),
                'Aktualisiert am': formatDate(order.updated_at),
            }))

            // Format bike builds for Excel
            const bikeBuildsData = (bikeBuilds || []).map(build => ({
                'Auftragsnummer': build.order_number,
                'Status': formatBuildStatus(build.status),
                'Kundenname': build.customer_name,
                'E-Mail': build.customer_email || '—',
                'Telefon': build.customer_phone || '—',
                'Fahrradmodell': build.bike_model || '—',
                'Rahmennummer': build.frame_number || '—',
                'Leasing': build.is_leasing ? 'Ja' : 'Nein',
                'Leasing-Anbieter': build.leasing_provider || '—',
                'Erstellt am': formatDate(build.created_at),
            }))

            // Create workbook
            const wb = XLSX.utils.book_new()

            // Add orders sheet
            if (ordersData.length > 0) {
                const ordersSheet = XLSX.utils.json_to_sheet(ordersData)

                // Set column widths
                ordersSheet['!cols'] = [
                    { wch: 15 }, // Auftragsnummer
                    { wch: 18 }, // Status
                    { wch: 25 }, // Kundenname
                    { wch: 30 }, // E-Mail
                    { wch: 18 }, // Telefon
                    { wch: 25 }, // Fahrradmodell
                    { wch: 15 }, // Fahrradtyp
                    { wch: 10 }, // Leasing
                    { wch: 20 }, // Leasing-Anbieter
                    { wch: 18 }, // Geschätzter Preis
                    { wch: 15 }, // Endpreis
                    { wch: 18 }, // Erstellt am
                    { wch: 18 }, // Aktualisiert am
                ]

                XLSX.utils.book_append_sheet(wb, ordersSheet, 'Aufträge')
            } else {
                const emptySheet = XLSX.utils.aoa_to_sheet([['Keine Aufträge in diesem Jahr']])
                XLSX.utils.book_append_sheet(wb, emptySheet, 'Aufträge')
            }

            // Add bike builds sheet
            if (bikeBuildsData.length > 0) {
                const bikeBuildsSheet = XLSX.utils.json_to_sheet(bikeBuildsData)

                // Set column widths
                bikeBuildsSheet['!cols'] = [
                    { wch: 15 }, // Auftragsnummer
                    { wch: 18 }, // Status
                    { wch: 25 }, // Kundenname
                    { wch: 30 }, // E-Mail
                    { wch: 18 }, // Telefon
                    { wch: 25 }, // Fahrradmodell
                    { wch: 20 }, // Rahmennummer
                    { wch: 10 }, // Leasing
                    { wch: 20 }, // Leasing-Anbieter
                    { wch: 18 }, // Erstellt am
                ]

                XLSX.utils.book_append_sheet(wb, bikeBuildsSheet, 'Neuradaufbau')
            } else {
                const emptySheet = XLSX.utils.aoa_to_sheet([['Keine Neuradaufbauten in diesem Jahr']])
                XLSX.utils.book_append_sheet(wb, emptySheet, 'Neuradaufbau')
            }

            // Download
            const filename = `VeloFix_Export_${selectedYear}.xlsx`
            XLSX.writeFile(wb, filename)

            toastSuccess(
                'Export erfolgreich',
                `${ordersData.length} Aufträge und ${bikeBuildsData.length} Neuradaufbauten exportiert`
            )
        } catch (error) {
            console.error('Export error:', error)
            toastError('Export fehlgeschlagen', 'Bitte versuchen Sie es erneut.')
        } finally {
            setExporting(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Daten exportieren</CardTitle>
                        <CardDescription>
                            Exportieren Sie alle Aufträge und Neuradaufbauten als Excel-Datei
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="space-y-2 flex-1 max-w-xs">
                        <Label htmlFor="year">Jahr auswählen</Label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger id="year">
                                <SelectValue placeholder="Jahr wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(year => (
                                    <SelectItem key={year} value={year}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleExport} disabled={exporting}>
                        {exporting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Exportiert...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                Excel herunterladen
                            </>
                        )}
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                    Die Excel-Datei enthält zwei Tabellenblätter: "Aufträge" und "Neuradaufbau"
                </p>
            </CardContent>
        </Card>
    )
}

// Helper functions
function formatStatus(status: string): string {
    const statusLabels: Record<string, string> = {
        'eingegangen': 'Eingegangen',
        'in_bearbeitung': 'In Bearbeitung',
        'warten_auf_teile': 'Warten auf Teile',
        'wartet_auf_teile': 'Warten auf Teile',
        'bereit_zur_abholung': 'Bereit zur Abholung',
        'abholbereit': 'Abholbereit',
        'abgeholt': 'Abgeholt',
        'abgeschlossen': 'Abgeschlossen',
        'trash': 'Gelöscht',
    }
    return statusLabels[status] || status
}

function formatBuildStatus(status: string): string {
    const statusLabels: Record<string, string> = {
        'pending': 'Ausstehend',
        'in_progress': 'In Bearbeitung',
        'completed': 'Abgeschlossen',
    }
    return statusLabels[status] || status
}

function formatDate(dateString: string | null): string {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}
