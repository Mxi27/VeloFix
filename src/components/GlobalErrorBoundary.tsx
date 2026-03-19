import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: ErrorInfo | null
    isChunkError: boolean
}

/** Returns true when the error is a failed dynamic import (e.g. stale deploy, offline). */
function isChunkLoadError(error: Error): boolean {
    return (
        error.name === 'ChunkLoadError' ||
        /Loading chunk \d+ failed/i.test(error.message) ||
        /Failed to fetch dynamically imported module/i.test(error.message) ||
        /error loading dynamically imported module/i.test(error.message)
    )
}

/**
 * Global error boundary – catches all unhandled React render errors.
 * Distinguishes between chunk-load failures (stale deploy / offline) and
 * genuine application errors, and shows an appropriate recovery UI for each.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null, isChunkError: false }
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
            isChunkError: isChunkLoadError(error),
        }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo)
        }
        this.setState({ error, errorInfo })
    }

    handleReload = () => window.location.reload()
    handleGoHome = () => { window.location.href = '/' }

    render() {
        if (!this.state.hasError) return this.props.children
        if (this.props.fallback) return this.props.fallback

        const { isChunkError, error, errorInfo } = this.state

        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                <Card className="max-w-lg w-full">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-destructive/10">
                                {isChunkError
                                    ? <WifiOff className="h-6 w-6 text-destructive" />
                                    : <AlertTriangle className="h-6 w-6 text-destructive" />
                                }
                            </div>
                            <div>
                                <CardTitle>
                                    {isChunkError ? 'Seite konnte nicht geladen werden' : 'Ein Fehler ist aufgetreten'}
                                </CardTitle>
                                <CardDescription>
                                    {isChunkError
                                        ? 'Ein Update wurde eingespielt oder die Verbindung war unterbrochen. Bitte Seite neu laden.'
                                        : 'Die Anwendung hat einen unerwarteten Fehler festgestellt.'
                                    }
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {import.meta.env.DEV && error && (
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm font-mono text-muted-foreground mb-2">
                                    {error.toString()}
                                </p>
                                {errorInfo && (
                                    <details className="text-xs font-mono text-muted-foreground">
                                        <summary className="cursor-pointer hover:text-foreground">
                                            Stack Trace
                                        </summary>
                                        <pre className="mt-2 whitespace-pre-wrap">
                                            {errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button onClick={this.handleReload} className="flex-1">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {isChunkError ? 'Neu laden' : 'Anwendung neu laden'}
                            </Button>
                            {!isChunkError && (
                                <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                                    Zur Startseite
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            Wenn dieses Problem weiterhin besteht, wenden Sie sich bitte an den Support.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }
}
