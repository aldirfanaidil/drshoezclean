import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// Eager load: Critical pages that users see first
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

// Lazy load: Admin pages (only downloaded when accessed)
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const OrdersPage = lazy(() => import("./pages/admin/OrdersPage"));
const CustomersPage = lazy(() => import("./pages/admin/CustomersPage"));
const DiscountsPage = lazy(() => import("./pages/admin/DiscountsPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const CashFlowPage = lazy(() => import("./pages/admin/CashFlowPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const PasswordPage = lazy(() => import("./pages/admin/PasswordPage"));
const BranchesPage = lazy(() => import("./pages/admin/BranchesPage"));
const ShoeProcessPage = lazy(() => import("./pages/admin/ShoeProcessPage"));

// Lazy load: Public pages that are less frequently accessed
const TrackingPage = lazy(() => import("./pages/TrackingPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Cache for 10 minutes
      refetchOnWindowFocus: false, // Don't refetch when switching tabs
      retry: 1, // Only retry once on failure
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner size="lg" text="Loading..." />}>
          <Routes>
            {/* Eager loaded routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Lazy loaded public routes */}
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/install" element={<InstallPage />} />

            {/* Lazy loaded admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="shoe-process" element={<ShoeProcessPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="discounts" element={<DiscountsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="branches" element={<BranchesPage />} />
              <Route path="cashflow" element={<CashFlowPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="password" element={<PasswordPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
