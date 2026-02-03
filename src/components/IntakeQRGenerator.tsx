import { useState } from 'react'
import { ClipboardList, Download, Copy, Loader2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import QRCode from 'react-qr-code'
import QRCodeLib from 'qrcode'
import jsPDF from 'jspdf'

interface IntakeQRGeneratorProps {
    workshopId: string
    workshopName: string
}

export function IntakeQRGenerator({ workshopId, workshopName }: IntakeQRGeneratorProps) {
    // Logic: Use production URL if on localhost, otherwise current origin
    const productionUrl = 'https://velo-fix.vercel.app'
    const origin = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? productionUrl
        : window.location.origin

    const intakeUrl = `${origin}/intake/${workshopId}`
    const [generating, setGenerating] = useState(false)

    const handleDownloadPDF = async () => {
        setGenerating(true)
        try {
            // 1. Generate QR Code Data URL (High Res)
            const qrDataUrl = await QRCodeLib.toDataURL(intakeUrl, {
                width: 1000,
                margin: 1,
                errorCorrectionLevel: 'H'
            })

            // 2. Create PDF (A4 Portrait)
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pageWidth = doc.internal.pageSize.getWidth() // 210mm
            const pageHeight = doc.internal.pageSize.getHeight() // 297mm

            // Helper for centering text
            const centerText = (text: string, y: number, fontSize: number, fontStyle: string = 'normal', color: string = '#000000') => {
                doc.setFontSize(fontSize)
                doc.setFont("helvetica", fontStyle)
                doc.setTextColor(color)
                const textWidth = doc.getTextWidth(text)
                doc.text(text, (pageWidth - textWidth) / 2, y)
            }

            // --- DESIGN ---

            // Top Bar
            doc.setFillColor(9, 9, 11) // #09090b
            doc.rect(0, 0, pageWidth, 20, 'F')

            // Shop Name
            centerText(workshopName || 'Werkstatt', 60, 36, 'bold', '#000000')
            centerText('Reparatur-Annahme', 75, 18, 'normal', '#666666')

            // QR Code Box (Moved UP to Y=85 to prevent bottom overlap)
            const boxSize = 100
            const boxX = (pageWidth - boxSize) / 2
            const boxY = 85

            // Draw Box Border
            doc.setDrawColor(26, 26, 26) // #1a1a1a
            doc.setLineWidth(1)
            doc.roundedRect(boxX, boxY, boxSize, boxSize, 5, 5, 'S')

            // Add QR Image
            const qrSize = 85
            const qrX = boxX + (boxSize - qrSize) / 2
            const qrY = boxY + (boxSize - qrSize) / 2
            doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

            // Instructions
            // boxY(85) + boxSize(100) + 25 = 210
            const textStartY = boxY + boxSize + 25
            centerText('Hier Scannen & Starten', textStartY, 28, 'bold', '#000000')

            doc.setFontSize(14)
            doc.setFont("helvetica", "normal")
            doc.setTextColor('#444444')
            const desc = "Bitte scannen Sie den QR-Code mit Ihrer Smartphone-Kamera,\num Ihren Reparaturauftrag zu erfassen."
            const splitDesc = doc.splitTextToSize(desc, 160)
            doc.text(splitDesc, pageWidth / 2, textStartY + 15, { align: 'center' })

            // Benefits
            // 210 + 40 = 250 (Well above footer at 282)
            const checkY = textStartY + 40
            doc.setFontSize(16)
            doc.setFont("helvetica", "bold")
            doc.setTextColor('#09090b')

            // Draw simple checkmarks and text
            // Left Benefit
            doc.text('✓ Keine Wartezeit', pageWidth / 2 - 55, checkY)

            // Right Benefit
            doc.text('✓ Einfache Erfassung', pageWidth / 2 + 5, checkY)

            // Footer
            centerText('Powered by VeloFix', pageHeight - 15, 10, 'normal', '#999999')

            // Save
            doc.save(`${workshopName.replace(/[^a-z0-9]/gi, '_')}_Annahme_QR.pdf`)

        } catch (error) {
            console.error('Error generating PDF:', error)
            alert('Fehler beim Erstellen des PDFs.')
        } finally {
            setGenerating(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Kunden-Selbstannahme (QR-Code)</CardTitle>
                        <CardDescription>
                            Drucken Sie diesen QR-Code aus, damit Kunden ihre Reparatur selbst erfassen können.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    {/* Visual Preview */}
                    <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center gap-4">
                        <QRCode value={intakeUrl} size={150} />
                        <span className="text-xs font-mono text-muted-foreground">Scan mich</span>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div>
                            <Label>Link zur Annahme ({origin === productionUrl ? 'Live' : 'Lokal'})</Label>
                            <div className="flex gap-2 mt-1.5">
                                <Input readOnly value={intakeUrl} className="font-mono text-xs bg-muted" />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        navigator.clipboard.writeText(intakeUrl)
                                    }}
                                    title="Link kopieren"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button onClick={handleDownloadPDF} disabled={generating}>
                                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                                Plakat herunterladen (PDF)
                            </Button>
                            <Button variant="secondary" onClick={() => window.open(intakeUrl, '_blank')}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Formular testen
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
