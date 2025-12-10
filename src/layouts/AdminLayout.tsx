import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAppStore } from "@/lib/store";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useToast } from "@/hooks/use-toast";

export default function AdminLayout() {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const { toast } = useToast();

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
