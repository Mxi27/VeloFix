import { useState } from 'react'
import { Copy, Check, QrCode } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import QRCode from 'qrcode'

interface WorkshopIdCardProps {
    workshopId: string
    workshopName: string
}

export function WorkshopIdCard({ workshopId, workshopName }: WorkshopIdCardProps) {
    const [copied, setCopied] = useState(false)
    const [qrCode, setQrCode] = useState<string>('')
    const [qrDialogOpen, setQrDialogOpen] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(workshopId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const generateQrCode = async () => {
        try {
            const qr = await QRCode.toDataURL(workshopId, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            })
            setQrCode(qr)
            setQrDialogOpen(true)
        } catch (error) {
            console.error('Error generating QR code:', error)
        }
    }

    return (
        <Card className="overflow-hidden border-2">
            <CardHeader>
                <CardTitle>Workshop ID</CardTitle>
                <CardDescription>
                    Teilen Sie diese ID mit Mitarbeitern, um ihnen Zugriff zu gewähren
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="workshop-name">Workshop Name</Label>
                        <Input
                            id="workshop-name"
                            value={workshopName}
                            readOnly
                            className="bg-muted font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="workshop-id">Workshop ID</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="workshop-id"
                                value={workshopId}
                                readOnly
                                className="font-mono bg-muted"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopy}
                                className="shrink-0"
                                title="Kopieren"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={generateQrCode}
                            >
                                <QrCode className="h-4 w-4 mr-2" />
                                QR-Code anzeigen
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Workshop ID QR-Code</DialogTitle>
                                <DialogDescription>
                                    Scannen Sie diesen Code mit einem Mobilgerät, um die Workshop ID zu übertragen
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col items-center gap-4 py-4">
                                {qrCode && (
                                    <img
                                        src={qrCode}
                                        alt="Workshop ID QR Code"
                                        className="border-4 border-border rounded-lg"
                                    />
                                )}
                                <p className="text-sm text-muted-foreground text-center">
                                    {workshopName}
                                </p>
                                <code className="text-xs font-mono bg-muted px-3 py-2 rounded">
                                    {workshopId}
                                </code>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    )
}
