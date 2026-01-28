import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { PageTransition } from "@/components/PageTransition"
import { Home, ArrowLeft } from "lucide-react"

export default function NotFoundPage() {
    const navigate = useNavigate()

    return (
        <PageTransition>
            <div className="flex min-h-svh w-full items-center justify-center bg-background p-6">
                <div className="w-full max-w-md space-y-6 text-center">
                    <div className="space-y-2">
                        <div className="mx-auto mb-4">
                            <span className="text-9xl font-bold text-primary/20">404</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Seite nicht gefunden</h1>
                        <p className="text-muted-foreground">
                            Die von Ihnen gesuchte Seite existiert nicht oder wurde verschoben.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <Button
                            onClick={() => navigate(-1)}
                            variant="outline"
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Zurück
                        </Button>
                        <Button
                            onClick={() => navigate('/dashboard')}
                            className="gap-2"
                        >
                            <Home className="h-4 w-4" />
                            Zum Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        </PageTransition>
    )
}
