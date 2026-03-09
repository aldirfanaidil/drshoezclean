import { useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Save, Upload, Store, CreditCard, Database, RefreshCw, Trash2, Download, FolderUp, AlertTriangle, MessageSquare } from "lucide-react";
import logo from "@/assets/logo.png";

export default function SettingsPage() {
  const { toast } = useToast();
  const { settings, updateSettings, resetAllData } = useAppStore();
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: settings.name,
    tagline: settings.tagline,
    phone: settings.phone,
    address: settings.address,
    email: settings.email,
    website: settings.website,
    bankName: settings.bankName,
    bankAccount: settings.bankAccount,
    accountHolder: settings.accountHolder,
    qrPayment: settings.qrPayment || "",
  });

  const [logoPreview, setLogoPreview] = useState(settings.logo || logo);
  const [restorePreview, setRestorePreview] = useState<{
    orders: number;
    customers: number;
    users: number;
    branches: number;
    discounts: number;
    cashFlows: number;
  } | null>(null);
  const [restoreData, setRestoreData] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        updateSettings({ logo: base64 });
        toast({ title: "Berhasil", description: "Logo berhasil diperbarui" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStoreInfo = () => {
    updateSettings({
      name: formData.name,
      tagline: formData.tagline,
      phone: formData.phone,
      address: formData.address,
      email: formData.email,
      website: formData.website,
    });
    toast({ title: "Berhasil", description: "Informasi toko berhasil disimpan" });
  };

  const handleSavePaymentInfo = () => {
    updateSettings({
      bankName: formData.bankName,
      bankAccount: formData.bankAccount,
      accountHolder: formData.accountHolder,
      qrPayment: formData.qrPayment,
    });
    toast({ title: "Berhasil", description: "Informasi pembayaran berhasil disimpan" });
  };

  const handleClearCache = () => {
    toast({ title: "Berhasil", description: "Cache berhasil dibersihkan" });
  };

  const handleResetSettings = async () => {
    setIsResetting(true);
    try {
      await resetAllData();
      toast({
        title: "Berhasil",
        description: "Semua data berhasil direset. Data superuser tetap aman.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mereset data",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleBackupDatabase = () => {
    const data = localStorage.getItem("app-storage");
    if (data) {
      const parsed = JSON.parse(data);
      const backupData = {
        ...parsed,
        backupDate: new Date().toISOString(),
        version: "1.0",
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-drshoezclean-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Berhasil", description: "Backup berhasil diunduh" });
    } else {
      toast({ title: "Error", description: "Tidak ada data untuk di-backup", variant: "destructive" });
    }
  };

  const handleExportSQL = async () => {
    try {
      toast({ title: "Mengekspor...", description: "Sedang mengambil data dari database" });

      // Fetch all data from Supabase
      const [
        { data: ordersData },
        { data: customersData },
        { data: discountsData },
        { data: cashFlowsData },
        { data: usersData },
        { data: branchesData },
        { data: settingsData },
      ] = await Promise.all([
        supabase.from("orders").select("*"),
        supabase.from("customers").select("*"),
        supabase.from("discounts").select("*"),
        supabase.from("cash_flows").select("*"),
        supabase.from("app_users").select("*"),
        supabase.from("branches").select("*"),
        supabase.from("store_settings").select("*"),
      ]);

      // Helper to escape SQL strings
      const escapeSQL = (val: any): string => {
        if (val === null || val === undefined) return "NULL";
        if (typeof val === "number") return String(val);
        if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
        if (typeof val === "object") return "'" + JSON.stringify(val).replace(/'/g, "''") + "'";
        return "'" + String(val).replace(/'/g, "''") + "'";
      };

      // Generate INSERT statements
      const generateInserts = (tableName: string, data: any[] | null): string => {
        if (!data || data.length === 0) return "-- No data in " + tableName + "\n";
        const columns = Object.keys(data[0]);
        const inserts = data.map((row) => {
          const values = columns.map((col) => escapeSQL(row[col])).join(", ");
          return "INSERT INTO " + tableName + " (" + columns.join(", ") + ") VALUES (" + values + ");";
        });
        return "-- " + tableName + " (" + data.length + " rows)\n" + inserts.join("\n") + "\n\n";
      };

      // CREATE TABLE statements
      const createTableStatements = `
-- ============================================
-- TABLE SCHEMAS (CREATE TABLES)
-- ============================================

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- App Users table
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(64) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('superuser', 'admin', 'cashier')),
  branch_id UUID REFERENCES branches(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Discounts table
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL(15,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20),
  shoes JSONB DEFAULT '[]'::jsonb,
  entry_date DATE,
  estimated_date DATE,
  pickup_date DATE,
  notes TEXT,
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'cancelled')),
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'transfer', 'qris')),
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cash Flows table
CREATE TABLE IF NOT EXISTS cash_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category VARCHAR(50) NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  date DATE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Store Settings table
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  tagline VARCHAR(200),
  phone VARCHAR(20),
  address TEXT,
  email VARCHAR(100),
  website VARCHAR(200),
  bank_name VARCHAR(50),
  bank_account VARCHAR(50),
  account_holder VARCHAR(100),
  qr_payment TEXT,
  logo TEXT,
  whatsapp_notification_enabled BOOLEAN DEFAULT false,
  invoice_terms TEXT,
  whatsapp_template TEXT
);

`;

      let sqlContent = "-- ============================================\n";
      sqlContent += "-- Dr.ShoezClean Database Export (Full Backup)\n";
      sqlContent += "-- Generated: " + new Date().toISOString() + "\n";
      sqlContent += "-- ============================================\n\n";
      sqlContent += "-- IMPORTANT: Run this in Supabase SQL Editor\n";
      sqlContent += "-- This includes both schema (CREATE TABLE) and data (INSERT)\n\n";

      // Add CREATE TABLE statements
      sqlContent += createTableStatements;

      sqlContent += "-- ============================================\n";
      sqlContent += "-- DATA (INSERT STATEMENTS)\n";
      sqlContent += "-- ============================================\n\n";

      sqlContent += generateInserts("branches", branchesData);
      sqlContent += generateInserts("app_users", usersData);
      sqlContent += generateInserts("customers", customersData);
      sqlContent += generateInserts("discounts", discountsData);
      sqlContent += generateInserts("orders", ordersData);
      sqlContent += generateInserts("cash_flows", cashFlowsData);
      sqlContent += generateInserts("store_settings", settingsData);

      // Download the SQL file
      const blob = new Blob([sqlContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "drshoezclean-backup-" + new Date().toISOString().split("T")[0] + ".sql";
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Berhasil", description: "Database SQL berhasil diekspor (termasuk schema)" });
    } catch (error) {
      console.error("Error exporting SQL:", error);
      toast({ title: "Error", description: "Gagal mengekspor database", variant: "destructive" });
    }
  };

  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);

          // Validate structure
          if (!parsed.state) {
            throw new Error("Format file tidak valid");
          }

          const state = parsed.state;
          setRestorePreview({
            orders: state.orders?.length || 0,
            customers: state.customers?.length || 0,
            users: state.users?.length || 0,
            branches: state.branches?.length || 0,
            discounts: state.discounts?.length || 0,
            cashFlows: state.cashFlows?.length || 0,
          });
          setRestoreData(content);
        } catch (error) {
          toast({
            title: "Error",
            description: "File backup tidak valid atau rusak",
            variant: "destructive",
          });
          setRestorePreview(null);
          setRestoreData(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmRestore = () => {
    if (restoreData) {
      try {
        localStorage.setItem("app-storage", restoreData);
        toast({
          title: "Berhasil",
          description: "Data berhasil di-restore. Halaman akan di-refresh.",
        });
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal me-restore data",
          variant: "destructive",
        });
      }
    }
  };

  const cancelRestore = () => {
    setRestorePreview(null);
    setRestoreData(null);
    if (restoreInputRef.current) {
      restoreInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
        <p className="text-muted-foreground">Konfigurasi aplikasi dan toko</p>
      </div>

      {/* Store Info */}
      <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Informasi Toko
          </CardTitle>
          <CardDescription>Atur informasi dasar toko Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <img
              src={logoPreview}
              alt="Logo"
              className="w-24 h-24 object-cover rounded-full border-2 border-primary/20 bg-muted shadow-md"
            />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Upload Logo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">PNG atau JPG, maks 2MB</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Toko</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Alamat</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Website / Social Media</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={handleSaveStoreInfo}>
            <Save className="w-4 h-4 mr-2" /> Simpan Informasi Toko
          </Button>
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Informasi Pembayaran
          </CardTitle>
          <CardDescription>Atur informasi rekening dan pembayaran</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Bank</Label>
              <Input
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor Rekening</Label>
              <Input
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Atas Nama</Label>
              <Input
                value={formData.accountHolder}
                onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>QR Payment (URL)</Label>
              <Input
                placeholder="URL gambar QR QRIS"
                value={formData.qrPayment}
                onChange={(e) => setFormData({ ...formData, qrPayment: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={handleSavePaymentInfo}>
            <Save className="w-4 h-4 mr-2" /> Simpan Informasi Pembayaran
          </Button>
        </CardContent>
      </Card>

      {/* System - Backup & Restore */}
      <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Backup & Restore
          </CardTitle>
          <CardDescription>Backup dan pulihkan data aplikasi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Backup Section */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" /> Backup Data (JSON)
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Download seluruh data aplikasi dalam format JSON untuk keamanan
            </p>
            <Button onClick={handleBackupDatabase}>
              <Download className="w-4 h-4 mr-2" /> Download Backup JSON
            </Button>
          </div>

          <Separator />

          {/* SQL Export Section */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" /> Export Database (SQL)
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Export seluruh data sebagai file SQL untuk restore ke database lain
            </p>
            <Button onClick={handleExportSQL} variant="outline">
              <Database className="w-4 h-4 mr-2" /> Export SQL
            </Button>
          </div>

          <Separator />

          {/* Restore Section */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FolderUp className="w-4 h-4" /> Restore Data
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Pulihkan data dari file backup JSON
            </p>

            <input
              ref={restoreInputRef}
              type="file"
              accept=".json"
              onChange={handleRestoreFileSelect}
              className="hidden"
            />

            {!restorePreview ? (
              <Button variant="outline" onClick={() => restoreInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Pilih File Backup
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-background rounded-lg border">
                  <p className="text-sm font-medium mb-2">Data yang akan di-restore:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pesanan:</span>
                      <span className="font-medium">{restorePreview.orders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pelanggan:</span>
                      <span className="font-medium">{restorePreview.customers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pengguna:</span>
                      <span className="font-medium">{restorePreview.users}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cabang:</span>
                      <span className="font-medium">{restorePreview.branches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Diskon:</span>
                      <span className="font-medium">{restorePreview.discounts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Arus Kas:</span>
                      <span className="font-medium">{restorePreview.cashFlows}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>Peringatan:</strong> Restore akan menimpa semua data saat ini. Pastikan Anda sudah backup data yang ada.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={cancelRestore}>
                    Batal
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <FolderUp className="w-4 h-4 mr-2" /> Restore Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Restore</AlertDialogTitle>
                        <AlertDialogDescription>
                          Anda yakin ingin me-restore data? Semua data saat ini akan diganti dengan data dari file backup. Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmRestore}>
                          Ya, Restore
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Notifications */}
      <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.35s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Notifikasi WhatsApp
          </CardTitle>
          <CardDescription>Kirim notifikasi otomatis ke pelanggan via WhatsApp</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <p className="font-medium">Notifikasi Sepatu Selesai</p>
              <p className="text-sm text-muted-foreground">
                Kirim pesan WhatsApp otomatis saat semua sepatu dalam pesanan sudah siap diambil
              </p>
            </div>
            <Switch
              checked={settings.whatsappNotificationEnabled || false}
              onCheckedChange={(checked) => {
                updateSettings({ whatsappNotificationEnabled: checked });
                toast({
                  title: checked ? "Notifikasi Aktif" : "Notifikasi Nonaktif",
                  description: checked
                    ? "Pelanggan akan menerima notifikasi WhatsApp saat sepatu selesai"
                    : "Notifikasi WhatsApp dinonaktifkan",
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Terms & Conditions */}
      <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.36s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Syarat & Ketentuan Invoice
          </CardTitle>
          <CardDescription>Atur syarat dan ketentuan yang muncul di invoice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Syarat & Ketentuan</Label>
            <textarea
              className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm resize-y"
              placeholder="Segala bentuk kerusakan akibat pencucian sepatu bukan tanggung jawab dari tim dr.shoezclean..."
              value={settings.invoiceTerms || "Segala bentuk kerusakan akibat pencucian sepatu bukan tanggung jawab dari tim dr.shoezclean.\n\nPerlu diketahui bahwa tidak semua noda/kotoran di sepatu dapat hilang dengan sempurna."}
              onChange={(e) => {
                updateSettings({ invoiceTerms: e.target.value });
              }}
            />
          </div>
          <Button onClick={() => toast({ title: "Berhasil", description: "Syarat & ketentuan berhasil disimpan" })}>
            <Save className="w-4 h-4 mr-2" /> Simpan Syarat & Ketentuan
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp Message Template */}
      <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.37s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Template Pesan WhatsApp
          </CardTitle>
          <CardDescription>Kustomisasi pesan yang dikirim via WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Template Pesan Invoice</Label>
            <textarea
              className="w-full min-h-[150px] p-3 rounded-md border border-input bg-background text-sm resize-y font-mono"
              placeholder="🧾 *INVOICE {storeName}*..."
              value={settings.whatsappTemplate || `🧾 * INVOICE { storeName }*
━━━━━━━━━━━━━━━━━━
📋 No.Invoice: * { invoiceNumber } *
📅 Tanggal: { date }

👤 * Pelanggan:*
    { customerName }
📱 { customerPhone }

👟 * Detail Sepatu:*
    { shoeDetails }

━━━━━━━━━━━━━━━━━━
💵 * TOTAL: { total }*

📊 Status: { status }

━━━━━━━━━━━━━━━━━━
Terima kasih telah menggunakan jasa * { storeName } * ! 🙏`}
              onChange={(e) => {
                updateSettings({ whatsappTemplate: e.target.value });
              }}
            />
            <p className="text-xs text-muted-foreground">
              Variabel: {"{storeName}"}, {"{invoiceNumber}"}, {"{date}"}, {"{customerName}"}, {"{customerPhone}"}, {"{shoeDetails}"}, {"{total}"}, {"{status}"}
            </p>
          </div>
          <Button onClick={() => toast({ title: "Berhasil", description: "Template WhatsApp berhasil disimpan" })}>
            <Save className="w-4 h-4 mr-2" /> Simpan Template
          </Button>
        </CardContent>
      </Card>

      {/* Sidebar Color Customization */}
      <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.38s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Kustomisasi Warna Sidebar
          </CardTitle>
          <CardDescription>Atur tampilan warna sidebar aplikasi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Warna Background</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-12 h-10 rounded border cursor-pointer"
                  value={settings.sidebarBgColor || "#1a1a2e"}
                  onChange={(e) => updateSettings({ sidebarBgColor: e.target.value })}
                />
                <Input
                  value={settings.sidebarBgColor || "#1a1a2e"}
                  onChange={(e) => updateSettings({ sidebarBgColor: e.target.value })}
                  placeholder="#1a1a2e"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Warna Teks</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-12 h-10 rounded border cursor-pointer"
                  value={settings.sidebarTextColor || "#e2e8f0"}
                  onChange={(e) => updateSettings({ sidebarTextColor: e.target.value })}
                />
                <Input
                  value={settings.sidebarTextColor || "#e2e8f0"}
                  onChange={(e) => updateSettings({ sidebarTextColor: e.target.value })}
                  placeholder="#e2e8f0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Warna Hover</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-12 h-10 rounded border cursor-pointer"
                  value={settings.sidebarHoverColor || "#2d2d4a"}
                  onChange={(e) => updateSettings({ sidebarHoverColor: e.target.value })}
                />
                <Input
                  value={settings.sidebarHoverColor || "#2d2d4a"}
                  onChange={(e) => updateSettings({ sidebarHoverColor: e.target.value })}
                  placeholder="#2d2d4a"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Warna Aktif</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-12 h-10 rounded border cursor-pointer"
                  value={settings.sidebarActiveColor || "#6366f1"}
                  onChange={(e) => updateSettings({ sidebarActiveColor: e.target.value })}
                />
                <Input
                  value={settings.sidebarActiveColor || "#6366f1"}
                  onChange={(e) => updateSettings({ sidebarActiveColor: e.target.value })}
                  placeholder="#6366f1"
                />
              </div>
            </div>
          </div>
          <Button onClick={() => toast({ title: "Berhasil", description: "Warna sidebar berhasil disimpan" })}>
            <Save className="w-4 h-4 mr-2" /> Simpan Warna
          </Button>
        </CardContent>
      </Card>


      {/* System Actions */}
      <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Aksi Sistem
          </CardTitle>
          <CardDescription>Pengaturan lanjutan dan reset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={handleClearCache}>
              <RefreshCw className="w-4 h-4 mr-2" /> Bersihkan Cache
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Reset Semua Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Semua Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini akan menghapus SEMUA data termasuk pesanan, pelanggan, diskon, cabang, dan arus kas. <strong>Akun superuser TIDAK akan dihapus.</strong> Data tidak dapat dikembalikan. Pastikan Anda sudah backup data sebelum melanjutkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetSettings} disabled={isResetting} className="bg-destructive hover:bg-destructive/90">
                    {isResetting ? "Mereset..." : "Ya, Reset Semua"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
