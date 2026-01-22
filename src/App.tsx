import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

import OnboardingPage from "@/pages/OnboardingPage";

function AppRoutes() {
    const { user, workshopId, loading } = useAuth();

    // Show loading ONLY during initial authentication check
    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={
                    user
                        ? (workshopId ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />)
                        : <LoginPage />
                }
            />
            <Route
                path="/signup"
                element={
                    user
                        ? (workshopId ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />)
                        : <SignupPage />
                }
            />

            <Route
                path="/onboarding"
                element={
                    user ? (
                        workshopId ? <Navigate to="/dashboard" replace /> : <OnboardingPage />
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }
            />

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        {workshopId ? <DashboardPage /> : <Navigate to="/onboarding" replace />}
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard/orders/:orderId"
                element={
                    <ProtectedRoute>
                        {workshopId ? <OrderDetailPage /> : <Navigate to="/onboarding" replace />}
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        {workshopId ? <SettingsPage /> : <Navigate to="/onboarding" replace />}
                    </ProtectedRoute>
                }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

export function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}

export default App;