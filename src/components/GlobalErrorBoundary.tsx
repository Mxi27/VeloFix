import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
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
}

/**
 * Enterprise-grade Error Boundary to catch and handle React errors gracefully
 * Prevents the entire app from crashing when a component throws an error
 */
export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        }
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to error reporting service in production
        // For now, only log in development
        if (process.env.NODE_ENV === 'development') {
            console.error('ErrorBoundary caught an error:', error, errorInfo)
        }

        this.setState({
            error,
            errorInfo
        })
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        })
        // Reload the page to reset the app state
        window.location.href = '/'
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                    <Card className="max-w-lg w-full">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-destructive/10">
                                    <AlertTriangle className="h-6 w-6 text-destructive" />
                                </div>
                                <div>
                                    <CardTitle>Ein Fehler ist aufgetreten</CardTitle>
                                    <CardDescription>
                                        Die Anwendung hat einen unerwarteten Fehler festgestellt
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm font-mono text-muted-foreground mb-2">
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo && (
                                        <details className="text-xs font-mono text-muted-foreground">
                                            <summary className="cursor-pointer hover:text-foreground">
                                                Stack Trace
                                            </summary>
                                            <pre className="mt-2 whitespace-pre-wrap">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button onClick={this.handleReset} className="flex-1">
                                    Anwendung neu laden
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => window.history.back()}
                                    className="flex-1"
                                >
                                    Zurück
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                Wenn dieses Problem weiterhin besteht, wenden Sie sich bitte an den Support.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )
        }

        return this.props.children
    }
}
