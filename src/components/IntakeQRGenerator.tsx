import { toastSuccess, toastError } from '@/lib/toast-utils'
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
                errorCorrectionLevel: 'H',
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            })

            // 2. Create PDF (A4 Portrait)
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pageWidth = doc.internal.pageSize.getWidth() // 210mm
            const pageHeight = doc.internal.pageSize.getHeight() // 297mm

            // Colors (White Theme)
            const bgWhite = [255, 255, 255]
            const textBlack = [9, 9, 11] // #09090b
            const textGray = [82, 82, 91] // #52525b
            const accentGreen = [22, 163, 74] // #16a34a (Slightly darker for better contrast on white)

            // Helper for centering text
            const centerText = (text: string, y: number, fontSize: number, fontStyle: string = 'normal', color: number[] = textBlack) => {
                doc.setFontSize(fontSize)
                doc.setFont("helvetica", fontStyle)
                doc.setTextColor(color[0], color[1], color[2])
                const textWidth = doc.getTextWidth(text)
                doc.text(text, (pageWidth - textWidth) / 2, y)
            }

            // --- DESIGN IMPLEMENTATION ---

            // 1. Background (White)
            doc.setFillColor(bgWhite[0], bgWhite[1], bgWhite[2])
            doc.rect(0, 0, pageWidth, pageHeight, 'F')

            // 2. Header Section
            // Accent Line
            doc.setDrawColor(accentGreen[0], accentGreen[1], accentGreen[2])
            doc.setLineWidth(1)
            doc.line(20, 15, pageWidth - 20, 15)

            centerText(workshopName ? workshopName.toUpperCase() : 'VELOFIX', 30, 14, 'bold', textGray)
            centerText('SELF CHECK-IN', 48, 38, 'bold', textBlack)
            centerText('Starten Sie Ihre Reparatur-Annahme hier.', 58, 12, 'normal', textGray)

            // 3. QR Code Hero Section
            const boxSize = 100
            const boxX = (pageWidth - boxSize) / 2
            const boxY = 80

            // Frame Effect
            doc.setDrawColor(228, 228, 231) // Light gray border
            doc.setLineWidth(0.5)
            doc.roundedRect(boxX - 5, boxY - 5, boxSize + 10, boxSize + 10, 5, 5, 'S') // Outer thin

            doc.setDrawColor(accentGreen[0], accentGreen[1], accentGreen[2])
            doc.setLineWidth(1)
            doc.roundedRect(boxX, boxY, boxSize, boxSize, 3, 3, 'S') // Main border (Green)

            // QR Image
            const qrSize = 90
            const qrX = boxX + (boxSize - qrSize) / 2
            const qrY = boxY + (boxSize - qrSize) / 2
            doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

            // "Scan Me" indicator badge
            doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2])
            doc.roundedRect(pageWidth / 2 - 25, boxY + boxSize - 8, 50, 10, 5, 5, 'F')

            doc.setFontSize(10)
            doc.setFont("helvetica", "bold")
            doc.setTextColor(255, 255, 255) // White text on green badge
            const badgeText = "JETZT SCANNEN"
            const badgeWidth = doc.getTextWidth(badgeText)
            doc.text(badgeText, (pageWidth - badgeWidth) / 2, boxY + boxSize - 1.5)


            // 4. Instructions / Steps
            const stepsY = boxY + boxSize + 35
            const listGap = 20

            // Clean Step Drawer
            const renderStepRow = (num: string, text: string, y: number) => {
                // Circle for number
                doc.setDrawColor(accentGreen[0], accentGreen[1], accentGreen[2])
                doc.setFillColor(240, 253, 244) // Very light green bg
                doc.setLineWidth(0.5)
                doc.circle(55, y - 2, 7, 'FD')

                doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2])
                doc.setFontSize(12)
                doc.setFont("helvetica", "bold")
                doc.text(num, 53.5, y + 2)

                doc.setTextColor(textBlack[0], textBlack[1], textBlack[2])
                doc.setFontSize(14)
                doc.text(text, 70, y + 2)
            }

            renderStepRow("1", "QR-Code mit Kamera scannen", stepsY)
            renderStepRow("2", "Details zum Fahrrad eingeben", stepsY + listGap)
            renderStepRow("3", "Auftrag unverbindlich absenden", stepsY + listGap * 2)


            // 5. Footer
            const footerY = pageHeight - 20

            doc.setDrawColor(228, 228, 231) // Light gray line
            doc.setLineWidth(0.5)
            doc.line(60, footerY - 10, pageWidth - 60, footerY - 10)

            centerText('POWERED BY VELOFIX OS', footerY, 9, 'bold', [161, 161, 170])
            centerText('Digital • Schnell • Sicher', footerY + 5, 9, 'normal', [161, 161, 170])

            // Save
            doc.save(`${workshopName ? workshopName.replace(/[^a-z0-9]/gi, '_') : 'Velofix'}_Annahme_QR.pdf`)
            toastSuccess('PDF erfolgreich heruntergeladen', `${workshopName}_Annahme_QR.pdf`)

        } catch (error) {
            toastError('Fehler beim Erstellen des PDFs', 'Bitte versuchen Sie es erneut.')
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
