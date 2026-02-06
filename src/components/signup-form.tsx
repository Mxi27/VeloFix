import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const { signUp } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess(false)

        // Passwort-Validierung
        if (password !== confirmPassword) {
            setError("Passwörter stimmen nicht überein")
            return
        }

        if (password.length < 8) {
            setError("Passwort muss mindestens 8 Zeichen lang sein")
            return
        }

        setLoading(true)

        const { data: authData, error } = await signUp(email, password, name)

        if (error) {
            // Deutsche Fehlermeldungen
            if (error.message.includes("already registered")) {
                setError("Diese E-Mail-Adresse ist bereits registriert")
            } else if (error.message.includes("invalid email")) {
                setError("Ungültige E-Mail-Adresse")
            } else {
                setError(error.message)
            }
            setLoading(false)
        } else {
            // Create employee record (orphan, no workshop yet)
            if (authData?.user) {
                const { error: empError } = await supabase
                    .from('employees')
                    .insert({
                        user_id: authData.user.id,
                        email: email,
                        name: name,
                        workshop_id: null, // Explicitly null as requested
                        role: 'read', // Default role
                        active: true
                    })

                if (empError) {
                    console.error("Error creating employee record:", empError)
                    // We don't block the user but log it. 
                    // Ideally we should rollback auth user but for now simplistic.
                }
            }

            setSuccess(true)
            setLoading(false)
            // Redirect nach 2 Sekunden zum Login
            setTimeout(() => navigate("/login"), 2000)
        }
    }

    return (
        <Card {...props} className="bg-card/80 border-border/50 backdrop-blur-sm shadow-2xl">
            <CardHeader>
                <CardTitle className="text-card-foreground">Konto erstellen</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Geben Sie Ihre Daten ein, um Ihr Konto zu erstellen
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit}>
                    <FieldGroup>
                        {error && (
                            <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm border border-destructive/20">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-500/15 text-green-400 p-3 rounded-md text-sm border border-green-500/20">
                                Konto erfolgreich erstellt! Sie werden zum Login weitergeleitet...
                            </div>
                        )}
                        <Field>
                            <FieldLabel htmlFor="name" className="text-foreground">Vollständiger Name</FieldLabel>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Max Mustermann"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-background/50 border-input text-foreground placeholder:text-muted-foreground"
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="email" className="text-foreground">E-Mail</FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-background/50 border-input text-foreground placeholder:text-muted-foreground"
                            />
                            <FieldDescription className="text-muted-foreground">
                                Wir verwenden diese E-Mail-Adresse, um Sie zu kontaktieren.
                            </FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="password" className="text-foreground">Passwort</FieldLabel>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-background/50 border-input text-foreground"
                            />
                            <FieldDescription className="text-muted-foreground">
                                Muss mindestens 8 Zeichen lang sein.
                            </FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="confirm-password" className="text-foreground">
                                Passwort bestätigen
                            </FieldLabel>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-background/50 border-input text-foreground"
                            />
                            <FieldDescription className="text-muted-foreground">Bitte bestätigen Sie Ihr Passwort.</FieldDescription>
                        </Field>
                        <Field>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Wird erstellt..." : "Konto erstellen"}
                            </Button>
                            <FieldDescription className="px-6 text-center text-muted-foreground">
                                Bereits ein Konto? <a href="/login" className="text-foreground hover:underline">Anmelden</a>
                            </FieldDescription>
                        </Field>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    )
}
