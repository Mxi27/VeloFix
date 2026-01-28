import React, { Component, type ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="flex min-h-svh w-full items-center justify-center bg-background p-6">
                    <div className="w-full max-w-md space-y-6 text-center">
                        <div className="space-y-2">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                                <svg
                                    className="h-10 w-10 text-destructive"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight">Etwas ist schief gelaufen</h1>
                            <p className="text-sm text-muted-foreground">
                                Die Anwendung ist auf einen unerwarteten Fehler gestoßen.
                            </p>
                        </div>

                        {this.state.error && (
                            <details className="rounded-lg border border-border bg-muted/30 p-4 text-left">
                                <summary className="cursor-pointer text-sm font-medium">
                                    Technische Details
                                </summary>
                                <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}

                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                Seite neu laden
                            </button>
                            <button
                                onClick={() => (window.location.href = '/dashboard')}
                                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                Zum Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
