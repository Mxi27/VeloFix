import { toastSuccess, toastError } from '@/lib/toast-utils'
import { useState, useRef, useEffect } from 'react'
import { ClipboardList, Download, Copy, Loader2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import QRCode from 'react-qr-code'
import { SelfCheckIn } from '@/components/documents/SelfCheckIn'

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
    const printRef = useRef<HTMLDivElement>(null)

    // Generate high-res QR code for the print component
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')

    // Generate the QR code data URL once when component mounts or url changes
    // Fixed: moved side effect from useState initializer to useEffect, and used dynamic import
    useEffect(() => {
        let mounted = true
        const generateQR = async () => {
            try {
                const QRCodeModule = await import('qrcode')
                // Handle both ES and CommonJS module exports
                const toDataURL = QRCodeModule.default?.toDataURL || QRCodeModule.toDataURL

                if (toDataURL) {
                    const url = await toDataURL(intakeUrl, {
                        width: 1000,
                        margin: 1,
                        errorCorrectionLevel: 'H',
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    })
                    if (mounted) setQrCodeDataUrl(url)
                }
            } catch (err) {
                console.error("Failed to load qrcode library", err)
            }
        }
        generateQR()
        return () => { mounted = false }
    }, [intakeUrl])

    const handleDownloadPDF = async () => {
        setGenerating(true)
        try {
            if (!printRef.current) {
                throw new Error("Print element not found")
            }

            // Dynamically import heavy libraries for PDF generation
            const html2canvasModule = await import('html2canvas')
            const html2canvas = html2canvasModule.default || html2canvasModule

            const jsPDFModule = await import('jspdf')
            const jsPDF = jsPDFModule.default ? jsPDFModule.default : (jsPDFModule as any).jsPDF || jsPDFModule

            // Temporarily show the element to capture it (it's hidden via css)
            // But html2canvas needs it to be rendered. We can use a hidden div that is technically "visible" but positioned off-screen
            // The current implementation puts it in a hidden div, let's see if html2canvas can capture it.
            // Usually it needs to be in the DOM.

            const element = printRef.current

            const canvas = await html2canvas(element, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    // Remove global stylesheets to prevent oklch errors from Tailwind v4
                    // html2canvas crashes if it encounters oklch() in computed styles
                    const links = clonedDoc.getElementsByTagName('link')
                    const styles = clonedDoc.getElementsByTagName('style')

                    // Remove all external stylesheets
                    Array.from(links).forEach(link => {
                        if (link.rel === 'stylesheet') link.remove()
                    })

                    // Remove all style tags (including global styles)
                    // Note: This also removes the reset style we added in SelfCheckIn, 
                    // but that's fine because without Tailwind globals, the browser defaults (transparent/black) are safe.
                    Array.from(styles).forEach(style => style.remove())
                }
            })

            const imgData = canvas.toDataURL('image/png')

            // A4 dimensions in mm
            const pdfWidth = 210
            const pdfHeight = 297

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save(`${workshopName ? workshopName.replace(/[^a-z0-9]/gi, '_') : 'Velofix'}_Annahme_QR.pdf`)

            toastSuccess('PDF erfolgreich heruntergeladen', `${workshopName}_Annahme_QR.pdf`)

        } catch (error) {
            console.error(error)
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

                {/* Hidden container for PDF generation */}
                <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
                    <SelfCheckIn
                        ref={printRef}
                        shopName={workshopName}
                        qrCodeSrc={qrCodeDataUrl}
                        accentColor="#D32F2F"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
