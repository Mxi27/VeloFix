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
        <Card {...props}>
            <CardHeader>
                <CardTitle>Konto erstellen</CardTitle>
                <CardDescription>
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
                            <div className="bg-primary/15 text-primary p-3 rounded-md text-sm border border-primary/20">
                                Konto erfolgreich erstellt! Sie werden zum Login weitergeleitet...
                            </div>
                        )}
                        <Field>
                            <FieldLabel htmlFor="name">Vollständiger Name</FieldLabel>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Max Mustermann"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="email">E-Mail</FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                            <FieldDescription>
                                Wir verwenden diese E-Mail-Adresse, um Sie zu kontaktieren. Wir werden Ihre
                                E-Mail-Adresse nicht an Dritte weitergeben.
                            </FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="password">Passwort</FieldLabel>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                            <FieldDescription>
                                Muss mindestens 8 Zeichen lang sein.
                            </FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="confirm-password">
                                Passwort bestätigen
                            </FieldLabel>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                            <FieldDescription>Bitte bestätigen Sie Ihr Passwort.</FieldDescription>
                        </Field>
                        <Field>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Wird erstellt..." : "Konto erstellen"}
                            </Button>
                            <FieldDescription className="px-6 text-center">
                                Bereits ein Konto? <a href="/login">Anmelden</a>
                            </FieldDescription>
                        </Field>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    )
}
