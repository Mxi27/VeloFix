import { useState, useEffect } from 'react'
import { Mail, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface NotificationPreferences {
    email_new_orders: boolean
    email_status_changes: boolean
    email_daily_summary: boolean
}

const defaultPreferences: NotificationPreferences = {
    email_new_orders: true,
    email_status_changes: true,
    email_daily_summary: false
}

export function NotificationSettings() {
    const { workshopId } = useAuth()
    const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (workshopId) {
            fetchPreferences()
        }
    }, [workshopId])

    const fetchPreferences = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('workshops')
            .select('notification_preferences')
            .eq('id', workshopId)
            .single()

        if (error) {
            console.error('Error fetching notification preferences:', error)
        } else if (data?.notification_preferences) {
            setPreferences({ ...defaultPreferences, ...data.notification_preferences })
        }
        setLoading(false)
    }

    const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
        if (!workshopId) return

        const newPreferences = { ...preferences, [key]: value }
        setPreferences(newPreferences)
        setSaving(true)

        const { error } = await supabase
            .from('workshops')
            .update({ notification_preferences: newPreferences })
            .eq('id', workshopId)

        if (error) {
            console.error('Error saving preferences:', error)
            // Revert on error
            setPreferences(preferences)
        }
        setSaving(false)
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-muted rounded-lg" />
                    <div className="h-32 bg-muted rounded-lg" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Email Notifications */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">E-Mail Benachrichtigungen</CardTitle>
                            <CardDescription>
                                Konfigurieren Sie, wann Sie E-Mails erhalten möchten
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="new-orders" className="text-base font-medium">
                                Neue Aufträge
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Erhalten Sie eine Benachrichtigung bei neuen Kundenanfragen
                            </p>
                        </div>
                        <Switch
                            id="new-orders"
                            checked={preferences.email_new_orders}
                            onCheckedChange={(checked) => updatePreference('email_new_orders', checked)}
                            disabled={saving}
                        />
                    </div>

                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="status-changes" className="text-base font-medium">
                                    Statusänderungen
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Benachrichtigungen wenn sich der Auftragsstatus ändert
                                </p>
                            </div>
                            <Switch
                                id="status-changes"
                                checked={preferences.email_status_changes}
                                onCheckedChange={(checked) => updatePreference('email_status_changes', checked)}
                                disabled={saving}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="daily-summary" className="text-base font-medium">
                                    Tägliche Zusammenfassung
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Erhalten Sie jeden Morgen eine Übersicht der offenen Aufträge
                                </p>
                            </div>
                            <Switch
                                id="daily-summary"
                                checked={preferences.email_daily_summary}
                                onCheckedChange={(checked) => updatePreference('email_daily_summary', checked)}
                                disabled={saving}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Push Notifications - Coming Soon */}
            <Card className="opacity-60">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                Push-Benachrichtigungen
                                <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded">
                                    Demnächst
                                </span>
                            </CardTitle>
                            <CardDescription>
                                Browser-Benachrichtigungen in Echtzeit
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </div>
    )
}
