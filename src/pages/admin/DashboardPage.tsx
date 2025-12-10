import { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  ShoppingCart,
  Footprints,
  CheckCircle,
  Clock,
  CreditCard,
  Smartphone,
  Banknote,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  Activity,
} from "lucide-react";
import { BranchFilter } from "@/components/BranchFilter";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, startOfWeek, startOfMonth, startOfYear, isAfter, parseISO, subHours, isToday } from "date-fns";
import { id } from "date-fns/locale";

type FilterPeriod = "day" | "week" | "month" | "year";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  onClick?: () => void;
  colorClass?: string;
}

function KPICard({ title, value, icon: Icon, trend, onClick, colorClass = "text-primary" }: KPICardProps) {
  return (
    <Card
      className="kpi-card opacity-0 animate-fade-in stagger-item"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className="text-xs text-success flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-primary/10 ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { orders, cashFlows, branches } = useAppStore();
  const [period, setPeriod] = useState<FilterPeriod>("month");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastUpdate(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filterStartDate = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "day":
        return subDays(now, 1);
      case "week":
        return startOfWeek(now, { locale: id });
      case "month":
        return startOfMonth(now);
      case "year":
        return startOfYear(now);
      default:
        return startOfMonth(now);
    }
  }, [period]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const afterStartDate = isAfter(parseISO(order.createdAt), filterStartDate);
      const matchesBranch =
        selectedBranch === "all" ||
        (selectedBranch === "pusat" && !order.branchId) ||
        order.branchId === selectedBranch;
      return afterStartDate && matchesBranch;
    });
  }, [orders, filterStartDate, selectedBranch, lastUpdate]);

  const stats = useMemo(() => {
    const revenue = filteredOrders
      .filter((o) => o.paymentStatus === "paid")
      .reduce((acc, o) => acc + o.total, 0);
    
    const totalOrders = filteredOrders.length;
    const totalShoes = filteredOrders.reduce((acc, o) => acc + o.shoes.length, 0);
    const paidOrders = filteredOrders.filter((o) => o.paymentStatus === "paid").length;
    const unpaidOrders = filteredOrders.filter((o) => o.paymentStatus === "unpaid").length;
    
    const cashTotal = filteredOrders
      .filter((o) => o.paymentStatus === "paid" && o.paymentMethod === "cash")
      .reduce((acc, o) => acc + o.total, 0);
    
    const transferTotal = filteredOrders
      .filter((o) => o.paymentStatus === "paid" && o.paymentMethod === "transfer")
      .reduce((acc, o) => acc + o.total, 0);
    
    const qrisTotal = filteredOrders
      .filter((o) => o.paymentStatus === "paid" && o.paymentMethod === "qris")
      .reduce((acc, o) => acc + o.total, 0);

    // Compare with previous period
    const previousPeriodOrders = orders.filter((order) => {
      const createdAt = parseISO(order.createdAt);
      const previousStart = subDays(filterStartDate, period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 365);
      return isAfter(createdAt, previousStart) && !isAfter(createdAt, filterStartDate);
    });
    
    const previousRevenue = previousPeriodOrders
      .filter((o) => o.paymentStatus === "paid")
      .reduce((acc, o) => acc + o.total, 0);
    
    const revenueChange = previousRevenue > 0 
      ? ((revenue - previousRevenue) / previousRevenue * 100).toFixed(1)
      : revenue > 0 ? "100" : "0";

    return {
      revenue,
      totalOrders,
      totalShoes,
      paidOrders,
      unpaidOrders,
      cashTotal,
      transferTotal,
      qrisTotal,
      revenueChange: Number(revenueChange),
    };
  }, [filteredOrders, orders, filterStartDate, period, lastUpdate]);

  // Chart data for last 30 days
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayOrders = orders.filter(
        (o) => o.createdAt.startsWith(dateStr) && o.paymentStatus === "paid"
      );
      const revenue = dayOrders.reduce((acc, o) => acc + o.total, 0);
      const orderCount = dayOrders.length;
      data.push({
        date: format(date, "dd MMM", { locale: id }),
        revenue,
        orders: orderCount,
      });
    }
    return data;
  }, [orders, lastUpdate]);

  // Hourly data for today (real-time feel)
  const hourlyData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hour = subHours(now, i);
      const hourStr = format(hour, "yyyy-MM-dd HH");
      const hourOrders = orders.filter(
        (o) => o.createdAt.startsWith(hourStr.split(" ")[0]) && 
               parseISO(o.createdAt).getHours() === hour.getHours() &&
               isToday(parseISO(o.createdAt)) &&
               o.paymentStatus === "paid"
      );
      const revenue = hourOrders.reduce((acc, o) => acc + o.total, 0);
      data.push({
        hour: format(hour, "HH:mm"),
        revenue,
        orders: hourOrders.length,
      });
    }
    return data;
  }, [orders, lastUpdate]);

  // Payment method distribution
  const paymentDistribution = useMemo(() => {
    return [
      { name: "Tunai", value: stats.cashTotal, color: "hsl(var(--success))" },
      { name: "Transfer", value: stats.transferTotal, color: "hsl(var(--info))" },
      { name: "QRIS", value: stats.qrisTotal, color: "hsl(var(--primary))" },
    ].filter(item => item.value > 0);
  }, [stats, lastUpdate]);

  // Branch performance
  const branchPerformance = useMemo(() => {
    const branchStats: Record<string, { name: string; orders: number; revenue: number }> = {
      "": { name: "Pusat", orders: 0, revenue: 0 }
    };
    
    branches.forEach(b => {
      branchStats[b.id] = { name: b.name, orders: 0, revenue: 0 };
    });

    filteredOrders.forEach(order => {
      const branchId = order.branchId || "";
      if (branchStats[branchId]) {
        branchStats[branchId].orders++;
        if (order.paymentStatus === "paid") {
          branchStats[branchId].revenue += order.total;
        }
      }
    });

    return Object.values(branchStats).filter(b => b.orders > 0);
  }, [filteredOrders, branches, lastUpdate]);

  const getKPIDetails = (kpiType: string) => {
    switch (kpiType) {
      case "revenue":
        return filteredOrders.filter((o) => o.paymentStatus === "paid");
      case "orders":
        return filteredOrders;
      case "shoes":
        return filteredOrders.flatMap((o) => o.shoes.map((s) => ({ ...s, invoiceNumber: o.invoiceNumber, customerName: o.customerName })));
      case "paid":
        return filteredOrders.filter((o) => o.paymentStatus === "paid");
      case "unpaid":
        return filteredOrders.filter((o) => o.paymentStatus === "unpaid");
      case "cash":
        return filteredOrders.filter((o) => o.paymentStatus === "paid" && o.paymentMethod === "cash");
      case "transfer":
        return filteredOrders.filter((o) => o.paymentStatus === "paid" && o.paymentMethod === "transfer");
      case "qris":
        return filteredOrders.filter((o) => o.paymentStatus === "paid" && o.paymentMethod === "qris");
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-success animate-pulse" />
            Real-time • Terakhir update: {format(lastUpdate, "HH:mm:ss")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
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
              <SelectItem value="day">Hari Ini</SelectItem>
              <SelectItem value="week">Minggu Ini</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="year">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Pendapatan"
          value={formatCurrency(stats.revenue)}
          icon={DollarSign}
          trend={stats.revenueChange > 0 ? `+${stats.revenueChange}% dari periode lalu` : stats.revenueChange < 0 ? `${stats.revenueChange}% dari periode lalu` : undefined}
          onClick={() => setSelectedKPI("revenue")}
          colorClass="text-primary"
        />
        <KPICard
          title="Total Pesanan"
          value={stats.totalOrders}
          icon={ShoppingCart}
          onClick={() => setSelectedKPI("orders")}
          colorClass="text-info"
        />
        <KPICard
          title="Sepatu Masuk"
          value={stats.totalShoes}
          icon={Footprints}
          onClick={() => setSelectedKPI("shoes")}
          colorClass="text-accent"
        />
        <KPICard
          title="Sudah Dibayar"
          value={stats.paidOrders}
          icon={CheckCircle}
          onClick={() => setSelectedKPI("paid")}
          colorClass="text-success"
        />
        <KPICard
          title="Belum Bayar"
          value={stats.unpaidOrders}
          icon={Clock}
          onClick={() => setSelectedKPI("unpaid")}
          colorClass="text-warning"
        />
        <KPICard
          title="Total Transfer"
          value={formatCurrency(stats.transferTotal)}
          icon={CreditCard}
          onClick={() => setSelectedKPI("transfer")}
          colorClass="text-info"
        />
        <KPICard
          title="Total QRIS"
          value={formatCurrency(stats.qrisTotal)}
          icon={Smartphone}
          onClick={() => setSelectedKPI("qris")}
          colorClass="text-primary"
        />
        <KPICard
          title="Total Tunai"
          value={formatCurrency(stats.cashTotal)}
          icon={Banknote}
          onClick={() => setSelectedKPI("cash")}
          colorClass="text-success"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart - 30 Days */}
        <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Pendapatan 30 Hari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
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
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
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

        {/* Today's Hourly Chart */}
        <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-success" />
              Aktivitas Hari Ini (Per Jam)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
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
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Distribution */}
        <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Distribusi Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentDistribution.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Belum ada data pembayaran</p>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex justify-center gap-4 mt-2">
              {paymentDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Branch Performance */}
        <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Performa Cabang</CardTitle>
          </CardHeader>
          <CardContent>
            {branchPerformance.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Belum ada data cabang</p>
            ) : (
              <div className="space-y-4">
                {branchPerformance.map((branch, index) => (
                  <div key={index} className="p-3 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{branch.name}</span>
                      <Badge variant="secondary">{branch.orders} pesanan</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 bg-muted rounded-full h-2 mr-4">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min((branch.revenue / (stats.revenue || 1)) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {formatCurrency(branch.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPI Detail Dialog */}
      <Dialog open={!!selectedKPI} onOpenChange={() => setSelectedKPI(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detail {selectedKPI === "revenue" ? "Pendapatan" :
                selectedKPI === "orders" ? "Pesanan" :
                selectedKPI === "shoes" ? "Sepatu" :
                selectedKPI === "paid" ? "Sudah Dibayar" :
                selectedKPI === "unpaid" ? "Belum Bayar" :
                selectedKPI === "cash" ? "Tunai" :
                selectedKPI === "transfer" ? "Transfer" :
                selectedKPI === "qris" ? "QRIS" : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedKPI && getKPIDetails(selectedKPI).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Tidak ada data</p>
            ) : selectedKPI === "shoes" ? (
              getKPIDetails(selectedKPI).map((item: any, index: number) => (
                <div key={index} className="p-3 rounded-lg border border-border">
                  <p className="font-medium">{item.brand}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.service} - {item.serviceType}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.invoiceNumber} - {item.customerName}
                  </p>
                  <p className="text-sm font-medium text-primary">{formatCurrency(item.price)}</p>
                </div>
              ))
            ) : (
              getKPIDetails(selectedKPI).map((order: any) => (
                <div key={order.id} className="p-3 rounded-lg border border-border">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{order.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">{order.customerName}</p>
                    </div>
                    <p className="font-semibold text-primary">{formatCurrency(order.total)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
