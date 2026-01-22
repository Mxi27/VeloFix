import { useAuth } from "@/contexts/AuthContext"
import { Navigate } from "react-router-dom"
import type { ReactNode } from "react"

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex min-h-svh w-full items-center justify-center">
                <div className="text-center">
                    <p className="text-lg">Laden...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}
