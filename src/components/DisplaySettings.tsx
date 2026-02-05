import { useState, useEffect } from 'react'
import { Palette, Monitor, Moon, Sun, LayoutGrid } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

type Theme = 'light' | 'dark' | 'system'

export function DisplaySettings() {
    const [theme, setTheme] = useState<Theme>('system')
    const [compactMode, setCompactMode] = useState(false)

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
    }, [])

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme)
        localStorage.setItem('theme', newTheme)

        // Apply theme
        const root = document.documentElement
        if (newTheme === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            root.classList.toggle('dark', systemPrefersDark)
        } else {
            root.classList.toggle('dark', newTheme === 'dark')
        }
    }

    const handleCompactChange = (enabled: boolean) => {
        setCompactMode(enabled)
        localStorage.setItem('compact-mode', enabled.toString())
        // Could apply compact mode styling here
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
                <CardContent>
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
        </div>
    )
}
