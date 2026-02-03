import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import ArchivePage from "@/pages/ArchivePage";
import LeasingBillingPage from "@/pages/LeasingBillingPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import ServiceModePage from "@/pages/ServiceModePage";
import ControlModePage from "@/pages/ControlModePage";
import TrashPage from "@/pages/TrashPage";
import BikeBuildsPage from "@/pages/BikeBuildsPage";
import BikeBuildDetailPage from "@/pages/BikeBuildDetailPage";
import OrderStatusPage from "@/pages/OrderStatusPage";
import IntakePage from "@/pages/IntakePage";

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

            {/* Public Status Page */}
            <Route path="/status/:orderId" element={<OrderStatusPage />} />

            {/* Public Intake Page */}
            <Route path="/intake/:workshopId" element={<IntakePage />} />

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
                path="/dashboard/bike-builds"
                element={
                    <ProtectedRoute>
                        {workshopId ? <BikeBuildsPage /> : <Navigate to="/onboarding" replace />}
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard/bike-builds/:id"
                element={
                    <ProtectedRoute>
                        {workshopId ? <BikeBuildDetailPage /> : <Navigate to="/onboarding" replace />}
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard/orders/:orderId/work"
                element={
                    <ProtectedRoute>
                        {workshopId ? <ServiceModePage /> : <Navigate to="/onboarding" replace />}
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard/orders/:orderId/control"
                element={
                    <ProtectedRoute>
                        {workshopId ? <ControlModePage /> : <Navigate to="/onboarding" replace />}
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
                path="/dashboard/trash"
                element={
                    <ProtectedRoute>
                        {workshopId ? <TrashPage /> : <Navigate to="/onboarding" replace />}
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard/archive"
                element={
                    <ProtectedRoute>
                        {workshopId ? <ArchivePage /> : <Navigate to="/onboarding" replace />}
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard/leasing-billing"
                element={
                    <ProtectedRoute>
                        {workshopId ? <LeasingBillingPage /> : <Navigate to="/onboarding" replace />}
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
        // Assuming AuthProvider and EmployeeProvider are intended to wrap the BrowserRouter
        // and that their opening tags are implicitly added or already exist in the user's mental model.
        // This change adds the closing tags as requested, implying the structure:
        // <AuthProvider>
        //   <EmployeeProvider>
        //     <BrowserRouter>
        //       <AppRoutes />
        //     </BrowserRouter>
        //   </EmployeeProvider>
        // </AuthProvider>
        <AuthProvider>
            <EmployeeProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </EmployeeProvider>
        </AuthProvider>
    );
}

export default App;