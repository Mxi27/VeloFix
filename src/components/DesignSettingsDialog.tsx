import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { designConfig } from "@/lib/design-config"
import { DESIGN_PRESETS, type WorkshopDesignConfig } from "@/types/design"
import { Palette, RotateCcw, Check, Upload, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

interface DesignSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DesignSettingsDialog = ({ open, onOpenChange }: DesignSettingsDialogProps) => {
  const [config, setConfig] = useState<WorkshopDesignConfig>(designConfig.getConfig())
  const [activeTab, setActiveTab] = useState("colors")

  useEffect(() => {
    if (open) {
      setConfig(designConfig.getConfig())
    }
  }, [open])

  const handleSave = () => {
    designConfig.updateConfig(config)
    toast.success("Design-Einstellungen gespeichert!")
    onOpenChange(false)
  }

  const handleReset = () => {
    designConfig.resetConfig()
    setConfig(designConfig.getConfig())
    toast.success("Design auf Standard zurückgesetzt")
  }

  const handlePresetApply = (presetName: string) => {
    const preset = DESIGN_PRESETS[presetName]
    if (preset) {
      setConfig({ ...config, ...preset })
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setConfig({ ...config, logoUrl: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Design & Branding
          </DialogTitle>
          <DialogDescription>
            Passe das Aussehen deiner VeloFix Instanz an
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors">Farben</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="pdf">PDF</TabsTrigger>
          </TabsList>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-6 mt-4">
            {/* Presets */}
            <div className="space-y-3">
              <Label>Design-Vorlagen</Label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(DESIGN_PRESETS).map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetApply(preset)}
                    className="capitalize"
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="space-y-4">
              <Label>Benutzerdefinierte Farben</Label>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary" className="text-xs text-muted-foreground">
                    Primärfarbe
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary"
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary" className="text-xs text-muted-foreground">
                    Sekundärfarbe
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary"
                      type="color"
                      value={config.secondaryColor}
                      onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={config.secondaryColor}
                      onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent" className="text-xs text-muted-foreground">
                    Akzentfarbe
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent"
                      type="color"
                      value={config.accentColor}
                      onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={config.accentColor}
                      onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-lg border space-y-2">
                <Label className="text-xs">Vorschau</Label>
                <div className="flex gap-2">
                  <Badge
                    style={{
                      backgroundColor: `${config.primaryColor}20`,
                      color: config.primaryColor,
                      border: `1px solid ${config.primaryColor}40`,
                    }}
                  >
                    Primär
                  </Badge>
                  <Badge
                    style={{
                      backgroundColor: `${config.secondaryColor}20`,
                      color: config.secondaryColor,
                      border: `1px solid ${config.secondaryColor}40`,
                    }}
                  >
                    Sekundär
                  </Badge>
                  <Badge
                    style={{
                      backgroundColor: `${config.accentColor}20`,
                      color: config.accentColor,
                      border: `1px solid ${config.accentColor}40`,
                    }}
                  >
                    Akzent
                  </Badge>
                </div>
              </div>
            </div>

            {/* Border Radius */}
            <div className="space-y-2">
              <Label>Ecken-Design</Label>
              <div className="flex gap-2">
                {(['smooth', 'rounded', 'sharp'] as const).map((radius) => (
                  <Button
                    key={radius}
                    variant={config.borderRadius === radius ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConfig({ ...config, borderRadius: radius })}
                    className="capitalize"
                  >
                    {radius}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6 mt-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex gap-4">
                <div className="w-32 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30">
                  {config.logoUrl ? (
                    <img
                      src={config.logoUrl}
                      alt="Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Logo hochladen</span>
                    </div>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </Label>
                  {config.logoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfig({ ...config, logoUrl: null })}
                      className="text-destructive"
                    >
                      Entfernen
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="space-y-4">
              <Label>Firmeninformationen (für PDFs)</Label>

              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-xs text-muted-foreground">
                  Firmenname
                </Label>
                <Input
                  id="companyName"
                  value={config.companyName || ''}
                  onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                  placeholder="Deine Werkstatt GmbH"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyAddress" className="text-xs text-muted-foreground">
                  Adresse
                </Label>
                <Textarea
                  id="companyAddress"
                  value={config.companyAddress || ''}
                  onChange={(e) => setConfig({ ...config, companyAddress: e.target.value })}
                  placeholder="Musterstraße 1&#10;12345 Musterstadt"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyPhone" className="text-xs text-muted-foreground">
                    Telefon
                  </Label>
                  <Input
                    id="companyPhone"
                    value={config.companyPhone || ''}
                    onChange={(e) => setConfig({ ...config, companyPhone: e.target.value })}
                    placeholder="+49 123 456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail" className="text-xs text-muted-foreground">
                    E-Mail
                  </Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={config.companyEmail || ''}
                    onChange={(e) => setConfig({ ...config, companyEmail: e.target.value })}
                    placeholder="info@werkstatt.de"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId" className="text-xs text-muted-foreground">
                  Steuernummer
                </Label>
                <Input
                  id="taxId"
                  value={config.taxId || ''}
                  onChange={(e) => setConfig({ ...config, taxId: e.target.value })}
                  placeholder="DE123456789"
                />
              </div>
            </div>
          </TabsContent>

          {/* PDF Tab */}
          <TabsContent value="pdf" className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label>Schriftart</Label>
              <div className="flex gap-2">
                {(['inter', 'roboto', 'opensans'] as const).map((font) => (
                  <Button
                    key={font}
                    variant={config.pdfFont === font ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConfig({ ...config, pdfFont: font })}
                    className="capitalize"
                  >
                    {font}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Logo in PDF anzeigen</Label>
                  <p className="text-xs text-muted-foreground">
                    Zeigt dein Logo oben rechts auf PDF-Dokumenten
                  </p>
                </div>
                <Button
                  variant={config.showLogoInPDF ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConfig({ ...config, showLogoInPDF: !config.showLogoInPDF })}
                >
                  {config.showLogoInPDF ? <Check className="h-4 w-4" /> : null}
                  {config.showLogoInPDF ? "An" : "Aus"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Stempel anzeigen</Label>
                  <p className="text-xs text-muted-foreground">
                    Zeigt Status-Stempel auf Auftrags-PDFs
                  </p>
                </div>
                <Button
                  variant={config.showStamps ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConfig({ ...config, showStamps: !config.showStamps })}
                >
                  {config.showStamps ? <Check className="h-4 w-4" /> : null}
                  {config.showStamps ? "An" : "Aus"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Barcode anzeigen</Label>
                  <p className="text-xs text-muted-foreground">
                    Zeigt QR-Code zum Scannen auf PDFs
                  </p>
                </div>
                <Button
                  variant={config.showBarcode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConfig({ ...config, showBarcode: !config.showBarcode })}
                >
                  {config.showBarcode ? <Check className="h-4 w-4" /> : null}
                  {config.showBarcode ? "An" : "Aus"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" onClick={handleReset} className="text-destructive">
            <RotateCcw className="h-4 w-4 mr-2" />
            Zurücksetzen
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-2" />
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
