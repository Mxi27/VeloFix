import { SignupForm } from "@/components/signup-form"
import { PageTransition } from "@/components/PageTransition"
import { Bike } from "lucide-react"

export default function SignupPage() {
    return (
        <PageTransition>
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="w-full max-w-sm space-y-6">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="bg-primary p-3 rounded-xl shadow-lg">
                            <Bike className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold tracking-tight">Willkommen</h1>
                            <p className="text-muted-foreground text-sm">
                                Erstellen Sie Ihr VeloFix Konto
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <SignupForm />

                    {/* Footer */}
                    <p className="text-center text-xs text-muted-foreground/60">
                        © {new Date().getFullYear()} VeloFix
                    </p>
                </div>
            </div>
        </PageTransition>
    )
}
