import { useState, useEffect } from 'react'
import { Palette, Monitor, Moon, Sun, LayoutGrid, Check, Globe } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { PRESET_COLORS, applyThemeColor, type Theme, applyTheme } from '@/lib/theme'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'



export function DisplaySettings() {
    const { workshopId } = useAuth()
    const [theme, setTheme] = useState<Theme>('system')
    const [compactMode, setCompactMode] = useState(false)
    const [accentColor, setAccentColor] = useState('#3b82f6')


    useEffect(() => {
        // Load theme from localStorage
        const savedTheme = localStorage.getItem('theme') as Theme | null
        if (savedTheme) {
            setTheme(savedTheme)
        }

        const savedCompact = localStorage.getItem('compact-mode')
        if (savedCompact === 'true') {
            setCompactMode(true)
        }

        const savedColor = localStorage.getItem('velofix-accent-color')
        if (savedColor) {
            setAccentColor(savedColor)
        }
    }, [])

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme)
        applyTheme(newTheme)
    }

    const handleCompactChange = (enabled: boolean) => {
        setCompactMode(enabled)
        import('@/lib/theme').then(({ applyCompactMode }) => {
            applyCompactMode(enabled)
        })
    }

    const handleColorChange = async (color: string) => {
        setAccentColor(color)
        applyThemeColor(color)

        if (workshopId) {
            const { error } = await supabase
                .from('workshops')
                .update({ accent_color: color })
                .eq('id', workshopId)

            if (error) {
                console.error('Error saving accent color:', error)
            } else {
                toast.success('Akzentfarbe aktualisiert')
            }
        } else {
            // Local only if no workshop
            localStorage.setItem('velofix-accent-color', color)
        }
    }

    return (
        <div className="space-y-6">
            {/* Theme Selection */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Palette className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Erscheinungsbild</CardTitle>
                            <CardDescription>
                                Wählen Sie Ihr bevorzugtes Farbschema
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <RadioGroup
                        value={theme}
                        onValueChange={(value) => handleThemeChange(value as Theme)}
                        className="grid grid-cols-3 gap-4"
                    >
                        <div>
                            <RadioGroupItem
                                value="light"
                                id="theme-light"
                                className="peer sr-only"
                            />
                            <Label
                                htmlFor="theme-light"
                                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                            >
                                <Sun className="h-6 w-6 mb-2" />
                                <span className="text-sm font-medium">Hell</span>
                            </Label>
                        </div>

                        <div>
                            <RadioGroupItem
                                value="dark"
                                id="theme-dark"
                                className="peer sr-only"
                            />
                            <Label
                                htmlFor="theme-dark"
                                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                            >
                                <Moon className="h-6 w-6 mb-2" />
                                <span className="text-sm font-medium">Dunkel</span>
                            </Label>
                        </div>

                        <div>
                            <RadioGroupItem
                                value="system"
                                id="theme-system"
                                className="peer sr-only"
                            />
                            <Label
                                htmlFor="theme-system"
                                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                            >
                                <Monitor className="h-6 w-6 mb-2" />
                                <span className="text-sm font-medium">System</span>
                            </Label>
                        </div>
                    </RadioGroup>

                    <div className="pt-4 border-t">
                        <Label className="text-base font-medium mb-4 block">Akzentfarbe</Label>
                        <div className="flex flex-wrap gap-3">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color.hex}
                                    onClick={() => handleColorChange(color.hex)}
                                    className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center transition-all p-1 border-2",
                                        accentColor === color.hex
                                            ? "border-primary bg-background"
                                            : "border-transparent hover:border-muted-foreground/20"
                                    )}
                                    aria-label={color.name}
                                >
                                    <div 
                                        className="h-full w-full rounded-full flex items-center justify-center transition-transform"
                                        style={{ backgroundColor: color.hex }}
                                    >
                                        {accentColor === color.hex && (
                                            <Check className="h-4 w-4 text-white drop-shadow-sm" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Layout Options */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <LayoutGrid className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Layout</CardTitle>
                            <CardDescription>
                                Passen Sie die Darstellung an Ihre Bedürfnisse an
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="compact-mode" className="text-base font-medium">
                                Kompaktmodus
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Reduziert Abstände für mehr Inhalte auf dem Bildschirm
                            </p>
                        </div>
                        <Switch
                            id="compact-mode"
                            checked={compactMode}
                            onCheckedChange={handleCompactChange}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Language / Region */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Globe className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Sprache & Region</CardTitle>
                            <CardDescription>
                                Stellen Sie die Anzeigesprache ein
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-3">
                            <span className="text-lg">🇩🇪</span>
                            <div>
                                <p className="font-medium text-sm">Deutsch</p>
                                <p className="text-xs text-muted-foreground">Deutschland</p>
                            </div>
                        </div>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                            Aktiv
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                        Weitere Sprachen folgen in zukünftigen Updates.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
