import { LoginForm } from "@/components/login-form"
import { PageTransition } from "@/components/PageTransition"
import { Bike } from "lucide-react"

export default function LoginPage() {
    return (
        <PageTransition>
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background">
                <div className="w-full max-w-sm space-y-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-muted p-4 rounded-2xl border border-border">
                            <Bike className="h-10 w-10 text-foreground" />
                        </div>
                        <div className="text-center">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">VeloFix</h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Werkstatt-Management
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <LoginForm />

                    {/* Footer */}
                    <p className="text-center text-xs text-muted-foreground">
                        © {new Date().getFullYear()} VeloFix
                    </p>
                </div>
            </div>
        </PageTransition>
    )
}
