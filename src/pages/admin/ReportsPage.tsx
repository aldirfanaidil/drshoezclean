import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { TrendingUp, DollarSign, Calendar, FileText, Download, FileSpreadsheet, CalendarRange } from "lucide-react";
import { format, subDays, startOfWeek, startOfMonth, startOfYear, isAfter, parseISO, isBefore, startOfDay, endOfDay } from "date-fns";
import { id } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { BranchFilter } from "@/components/BranchFilter";
import { cn } from "@/lib/utils";

type FilterPeriod = "week" | "month" | "year" | "custom";

export default function ReportsPage() {
  const { orders, branches } = useAppStore();
  const { toast } = useToast();
  const [period, setPeriod] = useState<FilterPeriod>("month");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(subDays(new Date(), 7));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(new Date());

  const filterStartDate = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "week":
        return startOfWeek(now, { locale: id });
      case "month":
        return startOfMonth(now);
      case "year":
        return startOfYear(now);
      case "custom":
        return customStartDate ? startOfDay(customStartDate) : startOfMonth(now);
      default:
        return startOfMonth(now);
    }
  }, [period, customStartDate]);

  const filterEndDate = useMemo(() => {
    if (period === "custom" && customEndDate) {
      return endOfDay(customEndDate);
    }
    return endOfDay(new Date());
  }, [period, customEndDate]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = parseISO(order.createdAt);
      const afterStartDate = isAfter(orderDate, filterStartDate) || orderDate.getTime() === filterStartDate.getTime();
      const beforeEndDate = isBefore(orderDate, filterEndDate) || orderDate.getTime() === filterEndDate.getTime();
      const isPaid = order.paymentStatus === "paid";
      const matchesBranch =
        selectedBranch === "all" ||
        (selectedBranch === "pusat" && !order.branchId) ||
        order.branchId === selectedBranch;
      return afterStartDate && beforeEndDate && isPaid && matchesBranch;
    });
  }, [orders, filterStartDate, filterEndDate, selectedBranch]);

  const stats = useMemo(() => {
    const revenue = filteredOrders.reduce((acc, o) => acc + o.total, 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    return { revenue, totalOrders, avgOrderValue };
  }, [filteredOrders]);

  // Chart data based on period
  const chartData = useMemo(() => {
    const data = [];
    const daysToShow = period === "week" ? 7 : period === "month" ? 30 : 12;

    if (period === "year") {
      // Monthly data for year view
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = format(date, "yyyy-MM");
        const monthOrders = orders.filter(
          (o) => o.createdAt.startsWith(monthStr) && o.paymentStatus === "paid"
        );
        const revenue = monthOrders.reduce((acc, o) => acc + o.total, 0);
        data.push({
          date: format(date, "MMM yyyy", { locale: id }),
          revenue,
          orders: monthOrders.length,
        });
      }
    } else {
      // Daily data for week/month view
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayOrders = orders.filter(
          (o) => o.createdAt.startsWith(dateStr) && o.paymentStatus === "paid"
        );
        const revenue = dayOrders.reduce((acc, o) => acc + o.total, 0);
        data.push({
          date: format(date, "dd MMM", { locale: id }),
          revenue,
          orders: dayOrders.length,
        });
      }
    }
    return data;
  }, [orders, period]);

  // Top services
  const topServices = useMemo(() => {
    const serviceCount: Record<string, { count: number; revenue: number }> = {};

    filteredOrders.forEach((order) => {
      order.shoes.forEach((shoe) => {
        const serviceName = shoe.service;
        if (!serviceCount[serviceName]) {
          serviceCount[serviceName] = { count: 0, revenue: 0 };
        }
        serviceCount[serviceName].count += 1;
        serviceCount[serviceName].revenue += shoe.price;
      });
    });

    return Object.entries(serviceCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredOrders]);

  // Branch comparison data
  const branchComparisonData = useMemo(() => {
    const branchStats: Record<string, { name: string; revenue: number; orders: number }> = {
      pusat: { name: "Pusat", revenue: 0, orders: 0 }
    };

    branches.forEach((b) => {
      branchStats[b.id] = { name: b.name, revenue: 0, orders: 0 };
    });

    // Filter by period only (not by selected branch)
    const periodOrders = orders.filter(
      (order) =>
        isAfter(parseISO(order.createdAt), filterStartDate) &&
        order.paymentStatus === "paid"
    );

    periodOrders.forEach((order) => {
      const branchId = order.branchId || "pusat";
      if (branchStats[branchId]) {
        branchStats[branchId].revenue += order.total;
        branchStats[branchId].orders += 1;
      }
    });

    return Object.values(branchStats)
      .filter((b) => b.orders > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders, branches, filterStartDate]);

  const getBranchName = (branchId?: string) => {
    if (!branchId) return "Pusat";
    const branch = branches.find((b) => b.id === branchId);
    return branch?.name || "Pusat";
  };

  const getOrdersForBranch = (branchId: string) => {
    return orders.filter((order) => {
      const orderDate = parseISO(order.createdAt);
      const afterStartDate = isAfter(orderDate, filterStartDate) || orderDate.getTime() === filterStartDate.getTime();
      const beforeEndDate = isBefore(orderDate, filterEndDate) || orderDate.getTime() === filterEndDate.getTime();
      const isPaid = order.paymentStatus === "paid";
      const matchesBranch =
        branchId === "all" ||
        (branchId === "pusat" && !order.branchId) ||
        order.branchId === branchId;
      return afterStartDate && beforeEndDate && isPaid && matchesBranch;
    });
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "week":
        return "Minggu Ini";
      case "month":
        return "Bulan Ini";
      case "year":
        return "Tahun Ini";
      case "custom":
        if (customStartDate && customEndDate) {
          return `${format(customStartDate, "dd MMM", { locale: id })} - ${format(customEndDate, "dd MMM yyyy", { locale: id })}`;
        }
        return "Custom";
      default:
        return "Bulan Ini";
    }
  };

  const exportToExcel = () => {
    const data = filteredOrders.map((order) => ({
      "No. Invoice": order.invoiceNumber,
      "Pelanggan": order.customerName,
      "Telepon": order.customerPhone,
      "Cabang": getBranchName(order.branchId),
      "Jumlah Sepatu": order.shoes.length,
      "Subtotal": order.subtotal,
      "Diskon": order.discount,
      "Total": order.total,
      "Status Pembayaran": order.paymentStatus === "paid" ? "Lunas" : order.paymentStatus === "unpaid" ? "Belum Bayar" : "Dibatalkan",
      "Metode Pembayaran": order.paymentMethod === "cash" ? "Tunai" : order.paymentMethod === "transfer" ? "Transfer" : order.paymentMethod === "qris" ? "QRIS" : "-",
      "Tanggal": format(parseISO(order.createdAt), "dd/MM/yyyy HH:mm", { locale: id }),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    
    const periodLabel = period === "custom" 
      ? `Custom_${format(customStartDate || new Date(), "yyyyMMdd")}_${format(customEndDate || new Date(), "yyyyMMdd")}` 
      : period === "week" ? "Mingguan" : period === "month" ? "Bulanan" : "Tahunan";
    XLSX.writeFile(wb, `Laporan_${periodLabel}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({ title: "Berhasil", description: "Laporan berhasil diekspor ke Excel" });
  };

  const exportAllBranchesToExcel = () => {
    const wb = XLSX.utils.book_new();
    const periodLabel = period === "custom" 
      ? `Custom_${format(customStartDate || new Date(), "yyyyMMdd")}_${format(customEndDate || new Date(), "yyyyMMdd")}` 
      : period === "week" ? "Mingguan" : period === "month" ? "Bulanan" : "Tahunan";
    
    // Export Pusat
    const pusatOrders = getOrdersForBranch("pusat");
    if (pusatOrders.length > 0) {
      const pusatData = pusatOrders.map((order) => ({
        "No. Invoice": order.invoiceNumber,
        "Pelanggan": order.customerName,
        "Telepon": order.customerPhone,
        "Jumlah Sepatu": order.shoes.length,
        "Total": order.total,
        "Metode Pembayaran": order.paymentMethod === "cash" ? "Tunai" : order.paymentMethod === "transfer" ? "Transfer" : "QRIS",
        "Tanggal": format(parseISO(order.createdAt), "dd/MM/yyyy HH:mm", { locale: id }),
      }));
      const ws = XLSX.utils.json_to_sheet(pusatData);
      XLSX.utils.book_append_sheet(wb, ws, "Pusat");
    }

    // Export each branch
    branches.forEach((branch) => {
      const branchOrders = getOrdersForBranch(branch.id);
      if (branchOrders.length > 0) {
        const branchData = branchOrders.map((order) => ({
          "No. Invoice": order.invoiceNumber,
          "Pelanggan": order.customerName,
          "Telepon": order.customerPhone,
          "Jumlah Sepatu": order.shoes.length,
          "Total": order.total,
          "Metode Pembayaran": order.paymentMethod === "cash" ? "Tunai" : order.paymentMethod === "transfer" ? "Transfer" : "QRIS",
          "Tanggal": format(parseISO(order.createdAt), "dd/MM/yyyy HH:mm", { locale: id }),
        }));
        const ws = XLSX.utils.json_to_sheet(branchData);
        const sheetName = branch.name.substring(0, 31); // Excel max sheet name length
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    });

    XLSX.writeFile(wb, `Laporan_PerCabang_${periodLabel}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "Berhasil", description: "Laporan semua cabang berhasil diekspor ke Excel" });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.text("Laporan Pendapatan", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Periode: ${getPeriodLabel()}`, pageWidth / 2, 30, { align: "center" });
    doc.text(`Dicetak: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: id })}`, pageWidth / 2, 38, { align: "center" });
    
    // Summary
    doc.setFontSize(14);
    doc.text("Ringkasan", 14, 55);
    doc.setFontSize(11);
    doc.text(`Total Pendapatan: ${formatCurrency(stats.revenue)}`, 14, 65);
    doc.text(`Total Pesanan: ${stats.totalOrders}`, 14, 73);
    doc.text(`Rata-rata Pesanan: ${formatCurrency(stats.avgOrderValue)}`, 14, 81);
    
    // Top Services
    doc.setFontSize(14);
    doc.text("Layanan Terlaris", 14, 100);
    doc.setFontSize(10);
    topServices.forEach((service, idx) => {
      doc.text(`${idx + 1}. ${service.name}: ${formatCurrency(service.revenue)} (${service.count}x)`, 14, 110 + (idx * 8));
    });
    
    // Orders table header
    const tableTop = 160;
    doc.setFontSize(14);
    doc.text("Detail Pesanan", 14, tableTop - 10);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice", 14, tableTop);
    doc.text("Pelanggan", 50, tableTop);
    doc.text("Total", 110, tableTop);
    doc.text("Status", 145, tableTop);
    doc.text("Tanggal", 170, tableTop);
    
    doc.setFont("helvetica", "normal");
    let y = tableTop + 8;
    const maxRows = 15;
    
    filteredOrders.slice(0, maxRows).forEach((order) => {
      doc.text(order.invoiceNumber.substring(0, 15), 14, y);
      doc.text(order.customerName.substring(0, 20), 50, y);
      doc.text(formatCurrency(order.total), 110, y);
      doc.text(order.paymentStatus === "paid" ? "Lunas" : "Belum", 145, y);
      doc.text(format(parseISO(order.createdAt), "dd/MM/yy"), 170, y);
      y += 7;
    });
    
    if (filteredOrders.length > maxRows) {
      doc.text(`... dan ${filteredOrders.length - maxRows} pesanan lainnya`, 14, y + 5);
    }

    const periodFileName = period === "custom" 
      ? `Custom_${format(customStartDate || new Date(), "yyyyMMdd")}_${format(customEndDate || new Date(), "yyyyMMdd")}` 
      : period === "week" ? "Mingguan" : period === "month" ? "Bulanan" : "Tahunan";
    
    doc.save(`Laporan_${periodFileName}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    
    toast({ title: "Berhasil", description: "Laporan berhasil diekspor ke PDF" });
  };

  const exportAllBranchesToPDF = () => {
    const periodLabel = getPeriodLabel();
    const periodFileName = period === "custom" 
      ? `Custom_${format(customStartDate || new Date(), "yyyyMMdd")}_${format(customEndDate || new Date(), "yyyyMMdd")}` 
      : period === "week" ? "Mingguan" : period === "month" ? "Bulanan" : "Tahunan";
    
    // Export for each branch including Pusat
    const allBranches = [
      { id: "pusat", name: "Pusat" },
      ...branches
    ];

    allBranches.forEach((branch) => {
      const branchOrders = getOrdersForBranch(branch.id);
      if (branchOrders.length === 0) return;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(18);
      doc.text(`Laporan ${branch.name}`, pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.text(`Periode: ${periodLabel}`, pageWidth / 2, 30, { align: "center" });
      doc.text(`Dicetak: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: id })}`, pageWidth / 2, 38, { align: "center" });
      
      // Summary for this branch
      const branchRevenue = branchOrders.reduce((acc, o) => acc + o.total, 0);
      const branchAvg = branchOrders.length > 0 ? branchRevenue / branchOrders.length : 0;
      
      doc.setFontSize(14);
      doc.text("Ringkasan", 14, 55);
      doc.setFontSize(11);
      doc.text(`Total Pendapatan: ${formatCurrency(branchRevenue)}`, 14, 65);
      doc.text(`Total Pesanan: ${branchOrders.length}`, 14, 73);
      doc.text(`Rata-rata Pesanan: ${formatCurrency(branchAvg)}`, 14, 81);
      
      // Orders table header
      const tableTop = 100;
      doc.setFontSize(14);
      doc.text("Detail Pesanan", 14, tableTop - 10);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Invoice", 14, tableTop);
      doc.text("Pelanggan", 50, tableTop);
      doc.text("Total", 110, tableTop);
      doc.text("Metode", 145, tableTop);
      doc.text("Tanggal", 170, tableTop);
      
      doc.setFont("helvetica", "normal");
      let y = tableTop + 8;
      const maxRows = 20;
      
      branchOrders.slice(0, maxRows).forEach((order) => {
        doc.text(order.invoiceNumber.substring(0, 15), 14, y);
        doc.text(order.customerName.substring(0, 20), 50, y);
        doc.text(formatCurrency(order.total), 110, y);
        doc.text(order.paymentMethod === "cash" ? "Tunai" : order.paymentMethod === "transfer" ? "Transfer" : "QRIS", 145, y);
        doc.text(format(parseISO(order.createdAt), "dd/MM/yy"), 170, y);
        y += 7;
      });
      
      if (branchOrders.length > maxRows) {
        doc.text(`... dan ${branchOrders.length - maxRows} pesanan lainnya`, 14, y + 5);
      }
      
      const safeName = branch.name.replace(/[^a-zA-Z0-9]/g, "_");
      doc.save(`Laporan_${safeName}_${periodFileName}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    });
    
    toast({ title: "Berhasil", description: "Laporan per cabang berhasil diekspor ke PDF" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan</h1>
          <p className="text-muted-foreground">Analisis pendapatan dan performa</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select onValueChange={(v) => v === "current" ? exportToExcel() : exportAllBranchesToExcel()}>
            <SelectTrigger className="w-auto gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Data Saat Ini</SelectItem>
              <SelectItem value="all">Per Cabang (Terpisah)</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => v === "current" ? exportToPDF() : exportAllBranchesToPDF()}>
            <SelectTrigger className="w-auto gap-2">
              <Download className="w-4 h-4" />
              <span>Ekspor PDF</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Data Saat Ini</SelectItem>
              <SelectItem value="all">Per Cabang (Terpisah)</SelectItem>
            </SelectContent>
          </Select>
          <BranchFilter
            value={selectedBranch}
            onChange={setSelectedBranch}
            branches={branches}
          />
          <Select value={period} onValueChange={(v: FilterPeriod) => setPeriod(v)}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Minggu Ini</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="year">Tahun Ini</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[130px] justify-start text-left font-normal",
                      !customStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarRange className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, "dd MMM yyyy", { locale: id }) : "Dari"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    disabled={(date) => date > new Date() || (customEndDate ? date > customEndDate : false)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">-</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[130px] justify-start text-left font-normal",
                      !customEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarRange className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, "dd MMM yyyy", { locale: id }) : "Sampai"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    disabled={(date) => date > new Date() || (customStartDate ? date < customStartDate : false)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="opacity-0 animate-fade-in stagger-item">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-fade-in stagger-item">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <FileText className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pesanan</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-fade-in stagger-item">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rata-rata Pesanan</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Grafik Pendapatan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value).replace("Rp", "")}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Pendapatan"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Branch Comparison Chart */}
      <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Perbandingan Pendapatan Antar Cabang</CardTitle>
        </CardHeader>
        <CardContent>
          {branchComparisonData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Tidak ada data cabang</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(value).replace("Rp", "")}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "revenue" ? formatCurrency(value) : value,
                      name === "revenue" ? "Pendapatan" : "Pesanan"
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Pendapatan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="orders" name="Jumlah Pesanan" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Services */}
      <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Layanan Terlaris</CardTitle>
        </CardHeader>
        <CardContent>
          {topServices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Tidak ada data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value).replace("Rp", "")}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    width={150}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Pendapatan"]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
