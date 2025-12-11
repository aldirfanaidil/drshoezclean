import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAppStore } from "@/lib/store";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useToast } from "@/hooks/use-toast";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useEffect } from "react";

export default function AdminLayout() {
  const { currentUser, isLoading, isInitialized, fetchInitialData } = useAppStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Enable real-time sync for auto-refresh when data changes
  useRealtimeSync();

  // Fetch data on mount if not already initialized
  useEffect(() => {
    if (currentUser && !isInitialized && !isLoading) {
      console.log("AdminLayout: triggering fetchInitialData");
      fetchInitialData();
    }
  }, [currentUser, isInitialized, isLoading, fetchInitialData]);

  // Session timeout - auto logout after 30 minutes of inactivity
  useSessionTimeout({
    onWarning: () => {
      toast({
        title: "Sesi akan berakhir",
        description: "Anda akan logout dalam 5 menit karena tidak aktif",
        variant: "destructive",
      });
    },
    onTimeout: () => {
      toast({
        title: "Sesi berakhir",
        description: "Anda telah logout karena tidak aktif",
        variant: "destructive",
      });
      navigate("/login");
    },
  });

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Show loading while fetching initial data
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <main className="lg:ml-64 min-h-screen">
          <div className="p-6 lg:p-8 pt-20 lg:pt-8">
            <LoadingSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 pt-20 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

