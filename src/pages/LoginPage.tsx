import { LoginForm } from "@/components/login-form"
import { Bike } from "lucide-react"

export default function LoginPage() {
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background">
            <div className="w-full max-w-[360px] space-y-6">
                {/* Logo */}
                <div className="flex items-center gap-2.5 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Bike className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-bold text-[18px] text-foreground">VeloFix</span>
                </div>

                <div>
                    <h1 className="text-2xl font-bold tracking-tight mb-1">Einloggen</h1>
                    <p className="text-sm text-muted-foreground">Gib deine E-Mail und dein Passwort ein.</p>
                </div>

                <LoginForm />

                <p className="text-xs text-muted-foreground/60">
                    &copy; {new Date().getFullYear()} VeloFix
                </p>
            </div>
        </div>
    )
}
