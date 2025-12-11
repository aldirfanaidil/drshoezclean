import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Percent,
  FileText,
  Wallet,
  UserCog,
  Settings,
  KeyRound,
  LogOut,
  Menu,
  X,
  Building2,
  Footprints,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import defaultLogo from "@/assets/logo.png";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: ("superuser" | "admin" | "cashier")[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin", roles: ["superuser", "admin", "cashier"] },
  { icon: ClipboardList, label: "Pesanan", path: "/admin/orders", roles: ["superuser", "admin", "cashier"] },
  { icon: Footprints, label: "Proses Sepatu", path: "/admin/shoe-process", roles: ["superuser", "admin", "cashier"] },
  { icon: Users, label: "Pelanggan", path: "/admin/customers", roles: ["superuser", "admin", "cashier"] },
  { icon: Percent, label: "Diskon", path: "/admin/discounts", roles: ["superuser", "admin", "cashier"] },
  { icon: FileText, label: "Laporan", path: "/admin/reports", roles: ["superuser", "admin", "cashier"] },
  { icon: Building2, label: "Cabang", path: "/admin/branches", roles: ["superuser"] },
  { icon: Wallet, label: "Arus Kas", path: "/admin/cashflow", roles: ["superuser"] },
  { icon: UserCog, label: "Pengguna", path: "/admin/users", roles: ["superuser"] },
  { icon: Settings, label: "Pengaturan", path: "/admin/settings", roles: ["superuser"] },
  { icon: KeyRound, label: "Ubah Password", path: "/admin/password", roles: ["superuser", "admin", "cashier"] },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, settings } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredMenuItems = menuItems.filter((item) =>
    currentUser ? item.roles.includes(currentUser.role) : false
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={settings.logo || defaultLogo} alt="Logo" className="w-10 h-10 object-cover rounded-full" />
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">{settings.name}</h1>
            <p className="text-xs text-sidebar-foreground/60">{settings.tagline}</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "sidebar-item w-full",
                isActive && "sidebar-item-active"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-sidebar-foreground">{currentUser?.username}</p>
          <p className="text-xs text-sidebar-foreground/60 capitalize">{currentUser?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-64 z-40 transform transition-transform duration-300 lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          backgroundColor: settings.sidebarBgColor || "#1a1a2e",
          color: settings.sidebarTextColor || "#e2e8f0",
          "--sidebar-hover": settings.sidebarHoverColor || "#2d2d4a",
          "--sidebar-active": settings.sidebarActiveColor || "#6366f1",
        } as React.CSSProperties}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
