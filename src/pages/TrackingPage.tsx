import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAppStore, type Order } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { formatCurrency, SERVICES, SHOE_PROCESSES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Package, Clock, CheckCircle, Home, Phone, User, ScanLine, Loader2 } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import defaultLogo from "@/assets/logo.png";

export default function TrackingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useAppStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-search from QR code
  useEffect(() => {
    const invoiceFromQR = searchParams.get("invoice");
    if (invoiceFromQR) {
      setSearchQuery(invoiceFromQR);
      handleSearch(invoiceFromQR);
    }
  }, [searchParams]);

  const handleSearch = async (query?: string) => {
    const searchTerm = (query || searchQuery).trim().toUpperCase();
    if (!searchTerm) return;

    setIsLoading(true);
    setNotFound(false);
    setFoundOrder(null);

    try {
      // Query Supabase directly for public tracking
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .ilike("invoice_number", `%${searchTerm}%`)
        .limit(1)
        .single();

      if (error || !data) {
        setFoundOrder(null);
        setNotFound(true);
      } else {
        // Map DB columns to app model
        const order: Order = {
          id: data.id,
          invoiceNumber: data.invoice_number,
          customerId: data.customer_id,
          customerName: data.customer_name,
          customerPhone: data.customer_phone,
          shoes: data.shoes || [],
          entryDate: data.entry_date,
          estimatedDate: data.estimated_date,
          pickupDate: data.pickup_date,
          notes: data.notes,
          paymentStatus: data.payment_status,
          paymentMethod: data.payment_method,
          subtotal: data.subtotal,
          discount: data.discount,
          total: data.total,
          branchId: data.branch_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setFoundOrder(order);
        setNotFound(false);
      }
    } catch (e) {
      console.error("Error searching order:", e);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = (result: string) => {
    setSearchQuery(result);
    handleSearch(result);
  };

  const getOverallStatus = (order: Order) => {
    // Get the lowest status among all shoes
    const statusOrder = SHOE_PROCESSES.map(s => s.value);
    let lowestIndex = statusOrder.length - 1;

    order.shoes.forEach(shoe => {
      const status = shoe.processStatus || "received";
      const index = statusOrder.findIndex(s => s === status);
      if (index !== -1 && index < lowestIndex) {
        lowestIndex = index;
      }
    });

    return statusOrder[lowestIndex] || "received";
  };

  const getStatusInfo = (status: string) => {
    const statusData = SHOE_PROCESSES.find((s) => s.value === status);
    const colorMap: Record<string, string> = {
      received: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      cleaning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      drying: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      finishing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      ready: "bg-green-500/10 text-green-600 border-green-500/20",
      picked_up: "bg-muted text-muted-foreground",
    };
    return {
      label: statusData?.label || status,
      color: colorMap[status] || "bg-muted text-muted-foreground"
    };
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Lunas</Badge>;
      case "dp":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">DP</Badge>;
      default:
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Belum Bayar</Badge>;
    }
  };

  const getProgressSteps = (currentStatus: string) => {
    const steps = SHOE_PROCESSES.map((p, i) => ({
      status: p.value,
      label: p.label,
      icon: i === SHOE_PROCESSES.length - 1 || i === SHOE_PROCESSES.length - 2 ? CheckCircle : i === 0 ? Package : Clock,
    }));

    const currentIndex = steps.findIndex((s) => s.status === currentStatus);
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <img
            src={settings.logo || defaultLogo}
            alt="Logo"
            className="w-20 h-20 mx-auto mb-4 object-contain cursor-pointer"
            onClick={() => navigate("/")}
          />
          <h1 className="text-2xl font-bold text-foreground">{settings.name}</h1>
          <p className="text-muted-foreground text-sm">Lacak Status Pesanan</p>
        </div>

        {/* Search */}
        <Card className="mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="Masukkan nomor invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <BarcodeScanner onScan={handleScan} />
              <Button onClick={() => handleSearch()} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Ketik nomor invoice atau scan QR code dari struk
            </p>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <Card className="animate-fade-in">
            <CardContent className="pt-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Mencari pesanan...</p>
            </CardContent>
          </Card>
        )}

        {/* Not Found */}
        {notFound && !isLoading && (
          <Card className="border-destructive/50 animate-fade-in">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive">Pesanan tidak ditemukan</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pastikan nomor invoice yang dimasukkan benar
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Found */}
        {foundOrder && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {/* Status Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{foundOrder.invoiceNumber}</CardTitle>
                  {getPaymentBadge(foundOrder.paymentStatus)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Badge className={getStatusInfo(getOverallStatus(foundOrder)).color}>
                    {getStatusInfo(getOverallStatus(foundOrder)).label}
                  </Badge>
                </div>

                {/* Progress Steps */}
                <div className="relative">
                  <div className="flex justify-between">
                    {getProgressSteps(getOverallStatus(foundOrder)).map((step) => (
                      <div key={step.status} className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${step.completed
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                            } ${step.current ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        >
                          <step.icon className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] mt-1 text-center max-w-[50px] ${step.completed ? "text-primary font-medium" : "text-muted-foreground"}`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Progress Line */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted -z-0">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${(getProgressSteps(getOverallStatus(foundOrder)).filter((s) => s.completed).length - 1) * (100 / (SHOE_PROCESSES.length - 1))}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Info Pelanggan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{foundOrder.customerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{foundOrder.customerPhone}</span>
                </div>
              </CardContent>
            </Card>

            {/* Shoe Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Detail Sepatu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {foundOrder.shoes.map((shoe) => (
                  <div key={shoe.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{shoe.brand}</p>
                      <p className="text-xs text-muted-foreground">
                        {SERVICES[shoe.service as keyof typeof SERVICES]?.name || shoe.service} - {shoe.serviceType}
                      </p>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {getStatusInfo(shoe.processStatus || "received").label}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(shoe.price)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(foundOrder.total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tanggal Masuk</p>
                    <p className="font-medium">{foundOrder.entryDate || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estimasi Selesai</p>
                    <p className="font-medium">{foundOrder.estimatedDate || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Back Button */}
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-2" /> Kembali ke Beranda
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
