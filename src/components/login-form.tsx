import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
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
    const mounted = useRef(true)

    useEffect(() => {
        return () => {
            mounted.current = false
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        console.log("LoginForm: handleSubmit started")
        try {
            console.log("LoginForm: Calling signIn...")
            const result = await signIn(email, password)
            console.log("LoginForm: signIn returned", result)
            const { error: authError } = result

            if (!mounted.current) {
                console.warn("LoginForm: Component unmounted during request. Proceeding carefully.")
                // Should we return? If we return, the UI stays stuck "Loading..." if the component is somehow still visible.
                // Let's try to update state anyway. React will warn if it's truly dead, but if it's a zombie, it might fix the UI.
                // return
            }

            if (authError) {
                console.error("LoginForm: Login error caught:", authError)
                // Deutsche Fehlermeldungen
                if (authError.message.includes("Invalid login credentials")) {
                    setError("Ungültige E-Mail oder Passwort")
                } else if (authError.message.includes("Email not confirmed")) {
                    setError("Bitte bestätigen Sie Ihre E-Mail-Adresse")
                } else {
                    setError(authError.message)
                }
                console.log("LoginForm: Setting loading to false")
                setLoading(false)
            } else {
                console.log("LoginForm: Login success, navigating")
                navigate("/dashboard")
            }
        } catch (e) {
            console.error("Unexpected login error in form:", e)
            if (mounted.current) {
                setError("Ein unerwarteter Fehler ist aufgetreten")
                setLoading(false)
            }
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="bg-card/80 border-border/50 backdrop-blur-sm shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-card-foreground">In Ihr Konto einloggen</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Geben Sie unten Ihre E-Mail-Adresse ein, um sich anzumelden
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
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password" className="text-foreground">Passwort</FieldLabel>
                                    <a
                                        href="#"
                                        className="ml-auto inline-block text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
                                    >
                                        Passwort vergessen?
                                    </a>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="bg-background/50 border-input text-foreground placeholder:text-muted-foreground"
                                />
                            </Field>
                            <Field>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? "Wird angemeldet..." : "Anmelden"}
                                </Button>
                                <FieldDescription className="text-center text-muted-foreground">
                                    Noch kein Konto? <a href="/signup" className="text-foreground hover:underline">Registrieren</a>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
