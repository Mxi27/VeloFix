import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: ErrorInfo | null
}

/**
 * Enhanced Error Boundary Component with logging and custom handlers
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo)

        // Update state with error info
        this.setState({ errorInfo })

        // TODO: Log to error reporting service (e.g., Sentry)
        // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } })
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} onReset={this.handleReset} />
        }

        return this.props.children
    }
}

/**
 * Error Fallback Component with improved UI
 */
interface ErrorFallbackProps {
    error: Error | null
    errorInfo: ErrorInfo | null
    onReset: () => void
}

const ErrorFallback = ({ error, errorInfo, onReset }: ErrorFallbackProps) => {
    const navigate = useNavigate()

    return (
        <div className="flex min-h-svh w-full items-center justify-center bg-muted/20 p-6">
            <Card className="w-full max-w-lg">
                <CardContent className="p-8 space-y-6">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                        </div>
                    </div>

                    {/* Message */}
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Etwas ist schiefgelaufen</h1>
                        <p className="text-sm text-muted-foreground">
                            Ein unerwarteter Fehler ist aufgetreten. Die Fehlermeldung wurde protokolliert.
                        </p>
                    </div>

                    {/* Error Details (Dev Mode) */}
                    {import.meta.env.DEV && error && (
                        <details className="rounded-lg border border-border bg-muted/30 p-4">
                            <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                                <Bug className="h-4 w-4" />
                                Technische Details (nur Entwicklung)
                            </summary>
                            <div className="mt-3 space-y-2">
                                <div className="p-3 bg-background rounded-md">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Fehlermeldung:</p>
                                    <pre className="text-xs text-destructive overflow-auto">
                                        {error.message}
                                    </pre>
                                </div>
                                {errorInfo && (
                                    <div className="p-3 bg-background rounded-md">
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Component Stack:</p>
                                        <pre className="text-xs text-muted-foreground overflow-auto max-h-32">
                                            {errorInfo.componentStack}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </details>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <Button onClick={onReset} className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Erneut versuchen
                        </Button>
                        <Button
                            onClick={() => navigate('/dashboard')}
                            variant="outline"
                            className="gap-2"
                        >
                            <Home className="h-4 w-4" />
                            Zum Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

/**
 * HOC to wrap components with ErrorBoundary
 */
export const withErrorBoundary = <P extends object>(
    Component: React.ComponentType<P>,
    fallback?: ReactNode,
    onError?: (error: Error, errorInfo: ErrorInfo) => void
) => {
    return (props: P) => (
        <ErrorBoundary fallback={fallback} onError={onError}>
            <Component {...props} />
        </ErrorBoundary>
    )
}
