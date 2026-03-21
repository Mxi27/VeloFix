import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const { signIn } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const { error: authError } = await signIn(email, password)

            if (authError) {
                if (authError.message.includes("Invalid login credentials")) {
                    setError("Ungültige E-Mail oder Passwort")
                } else if (authError.message.includes("Email not confirmed")) {
                    setError("Bitte bestätigen Sie Ihre E-Mail-Adresse")
                } else {
                    setError(authError.message)
                }
                setLoading(false)
            } else {
                navigate("/dashboard")
            }
        } catch (e) {
            console.error("Unexpected login error in form:", e)
            setError("Ein unerwarteter Fehler ist aufgetreten")
            setLoading(false)
        }
    }

    return (
        <div className={cn("flex flex-col gap-4", className)} {...props}>
            <form onSubmit={handleSubmit}>
                <FieldGroup className="gap-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-sm border border-destructive/20">
                            {error}
                        </div>
                    )}
                    <Field>
                        <FieldLabel htmlFor="email" className="text-sm font-medium">E-Mail</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </Field>
                    <Field>
                        <div className="flex items-center justify-between mb-1.5">
                            <FieldLabel htmlFor="password" className="text-sm font-medium">Passwort</FieldLabel>
                            <a
                                href="#"
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Vergessen?
                            </a>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </Field>
                    <Button type="submit" className="w-full mt-1" disabled={loading}>
                        {loading ? "Wird angemeldet…" : "Anmelden"}
                    </Button>
                </FieldGroup>
            </form>
            <p className="text-sm text-muted-foreground">
                Noch kein Konto?{" "}
                <a href="/signup" className="text-foreground hover:underline underline-offset-4">
                    Registrieren
                </a>
            </p>
        </div>
    )
}
