import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { FeaturesProvider, useFeatures } from "@/contexts/FeaturesContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoadingScreen } from "@/components/LoadingScreen";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { Toaster } from "sonner";
import { loadThemeColor, loadTheme, loadCompactMode } from "@/lib/theme";
import type { FeatureKey } from "@/types";

// Pages needed on the very first render (auth flow) — keep as static imports
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";

// All other pages are lazy-loaded to enable route-level code splitting.
// Each page becomes its own JS chunk that is only fetched on first navigation.
const OnboardingPage       = lazy(() => import("@/pages/OnboardingPage"));
const DashboardPage        = lazy(() => import("@/pages/DashboardPage"));
const OrderDetailPage      = lazy(() => import("@/pages/OrderDetailPage"));
const ServiceModePage      = lazy(() => import("@/pages/ServiceModePage"));
const ControlModePage      = lazy(() => import("@/pages/ControlModePage"));
const SettingsPage         = lazy(() => import("@/pages/SettingsPage"));
const ArchivePage          = lazy(() => import("@/pages/ArchivePage"));
const LeasingBillingPage   = lazy(() => import("@/pages/LeasingBillingPage"));
const BikeBuildsPage       = lazy(() => import("@/pages/BikeBuildsPage"));
const BikeBuildDetailPage  = lazy(() => import("@/pages/BikeBuildDetailPage"));
const TasksPage            = lazy(() => import("@/pages/TasksPage"));
const CockpitPage          = lazy(() => import("@/pages/CockpitPage"));
const NotebookPage         = lazy(() => import("@/pages/NotebookPage"));
const FeedbackPage         = lazy(() => import("@/pages/FeedbackPage"));
const OrderStatusPage      = lazy(() => import("@/pages/OrderStatusPage"));
const IntakePage           = lazy(() => import("@/pages/IntakePage"));
const BookingPage          = lazy(() => import("@/pages/BookingPage"));
const AppointmentsPage     = lazy(() => import("@/pages/AppointmentsPage"));

/** Redirects to /dashboard if a feature is disabled */
function FeatureRoute({ featureKey, children }: { featureKey: FeatureKey; children: React.ReactNode }) {
    const { isEnabled, loading } = useFeatures()
    if (loading) return <LoadingScreen />
    if (!isEnabled(featureKey)) return <Navigate to="/dashboard" replace />
    return <>{children}</>
}

function AppRoutes() {
    const { user, workshopId, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    const dashboardRedirect = workshopId
        ? undefined
        : <Navigate to="/onboarding" replace />;

    return (
        <Suspense fallback={<LoadingScreen />}>
            <Routes>
                {/* Auth */}
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

                {/* Public pages */}
                <Route path="/status/:orderId" element={<OrderStatusPage />} />
                <Route path="/intake/:workshopId" element={<IntakePage />} />
                <Route path="/feedback/:orderId" element={<FeedbackPage />} />
                <Route path="/booking/:workshopId" element={<BookingPage />} />

                {/* Onboarding */}
                <Route
                    path="/onboarding"
                    element={
                        user
                            ? (workshopId ? <Navigate to="/dashboard" replace /> : <OnboardingPage />)
                            : <Navigate to="/login" replace />
                    }
                />

                {/* Protected dashboard routes */}
                <Route path="/dashboard" element={<ProtectedRoute>{dashboardRedirect ?? <DashboardPage />}</ProtectedRoute>} />
                <Route path="/dashboard/appointments" element={<ProtectedRoute>{dashboardRedirect ?? <FeatureRoute featureKey="appointments"><AppointmentsPage /></FeatureRoute>}</ProtectedRoute>} />
                <Route path="/dashboard/cockpit" element={<ProtectedRoute>{dashboardRedirect ?? <FeatureRoute featureKey="cockpit"><CockpitPage /></FeatureRoute>}</ProtectedRoute>} />
                <Route path="/dashboard/tasks" element={<ProtectedRoute>{dashboardRedirect ?? <FeatureRoute featureKey="tasks"><TasksPage /></FeatureRoute>}</ProtectedRoute>} />
                <Route path="/dashboard/notebook" element={<ProtectedRoute>{dashboardRedirect ?? <FeatureRoute featureKey="notebook"><NotebookPage /></FeatureRoute>}</ProtectedRoute>} />
                <Route path="/dashboard/bike-builds" element={<ProtectedRoute>{dashboardRedirect ?? <FeatureRoute featureKey="bike_builds"><BikeBuildsPage /></FeatureRoute>}</ProtectedRoute>} />
                <Route path="/dashboard/bike-builds/:id" element={<ProtectedRoute>{dashboardRedirect ?? <FeatureRoute featureKey="bike_builds"><BikeBuildDetailPage /></FeatureRoute>}</ProtectedRoute>} />
                <Route path="/dashboard/orders/:orderId/work" element={<ProtectedRoute>{dashboardRedirect ?? <FeatureRoute featureKey="service_mode"><ServiceModePage /></FeatureRoute>}</ProtectedRoute>} />
                <Route path="/dashboard/orders/:orderId/control" element={<ProtectedRoute>{dashboardRedirect ?? <FeatureRoute featureKey="control_mode"><ControlModePage /></FeatureRoute>}</ProtectedRoute>} />
                <Route path="/dashboard/orders/:orderId" element={<ProtectedRoute>{dashboardRedirect ?? <OrderDetailPage />}</ProtectedRoute>} />
                <Route path="/dashboard/archive" element={<ProtectedRoute>{dashboardRedirect ?? <ArchivePage />}</ProtectedRoute>} />
                <Route path="/dashboard/leasing-billing" element={<ProtectedRoute>{dashboardRedirect ?? <FeatureRoute featureKey="leasing"><LeasingBillingPage /></FeatureRoute>}</ProtectedRoute>} />
                <Route path="/dashboard/feedback" element={<ProtectedRoute>{dashboardRedirect ?? <FeatureRoute featureKey="feedback"><FeedbackPage /></FeatureRoute>}</ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute>{dashboardRedirect ?? <SettingsPage />}</ProtectedRoute>} />

                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
        </Suspense>
    );
}

export function App() {
    useEffect(() => {
        loadThemeColor();
        loadTheme();
        loadCompactMode();
    }, []);

    return (
        <GlobalErrorBoundary>
            <AuthProvider>
                <FeaturesProvider>
                    <EmployeeProvider>
                        <BrowserRouter>
                            <AppRoutes />
                        </BrowserRouter>
                        <Toaster richColors position="top-right" />
                    </EmployeeProvider>
                </FeaturesProvider>
            </AuthProvider>
        </GlobalErrorBoundary>
    );
}

export default App;
