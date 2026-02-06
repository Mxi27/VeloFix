import { useState } from "react"
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        const { error } = await signIn(email, password)

        if (error) {
            // Deutsche Fehlermeldungen
            if (error.message.includes("Invalid login credentials")) {
                setError("Ungültige E-Mail oder Passwort")
            } else if (error.message.includes("Email not confirmed")) {
                setError("Bitte bestätigen Sie Ihre E-Mail-Adresse")
            } else {
                setError(error.message)
            }
            setLoading(false)
        } else {
            navigate("/dashboard")
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="bg-zinc-900/80 border-zinc-800/50 backdrop-blur-sm shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-zinc-100">In Ihr Konto einloggen</CardTitle>
                    <CardDescription className="text-zinc-400">
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
                                <FieldLabel htmlFor="email" className="text-zinc-300">E-Mail</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-500"
                                />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password" className="text-zinc-300">Passwort</FieldLabel>
                                    <a
                                        href="#"
                                        className="ml-auto inline-block text-sm text-zinc-400 underline-offset-4 hover:underline hover:text-zinc-200"
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
                                    className="bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-500"
                                />
                            </Field>
                            <Field>
                                <Button type="submit" className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200" disabled={loading}>
                                    {loading ? "Wird angemeldet..." : "Anmelden"}
                                </Button>
                                <FieldDescription className="text-center text-zinc-500">
                                    Noch kein Konto? <a href="/signup" className="text-zinc-300 hover:underline">Registrieren</a>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
