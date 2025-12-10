import { useState, useMemo } from "react";
import { useAppStore, CashFlow } from "@/lib/store";
import { formatCurrency } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { format, startOfWeek, startOfMonth, startOfYear, isAfter, parseISO } from "date-fns";
import { id } from "date-fns/locale";

type FilterPeriod = "day" | "week" | "month" | "year";

export default function CashFlowPage() {
  const { toast } = useToast();
  const { cashFlows, addCashFlow, deleteCashFlow } = useAppStore();
  const [period, setPeriod] = useState<FilterPeriod>("month");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCashFlow, setSelectedCashFlow] = useState<CashFlow | null>(null);

  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    category: "",
    description: "",
    amount: 0,
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const filterStartDate = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "day":
        now.setHours(0, 0, 0, 0);
        return now;
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

  const filteredCashFlows = useMemo(() => {
    return cashFlows
      .filter((cf) => isAfter(parseISO(cf.date), filterStartDate))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cashFlows, filterStartDate]);

  const stats = useMemo(() => {
    const income = filteredCashFlows
      .filter((cf) => cf.type === "income")
      .reduce((acc, cf) => acc + cf.amount, 0);
    
    const expense = filteredCashFlows
      .filter((cf) => cf.type === "expense")
      .reduce((acc, cf) => acc + cf.amount, 0);
    
    const profit = income - expense;

    return { income, expense, profit };
  }, [filteredCashFlows]);

  const resetForm = () => {
    setFormData({
      type: "expense",
      category: "",
      description: "",
      amount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const handleAddCashFlow = () => {
    if (!formData.category || !formData.description || formData.amount <= 0) {
      toast({ title: "Error", description: "Lengkapi semua data", variant: "destructive" });
      return;
    }

    addCashFlow(formData);
    toast({ title: "Berhasil", description: "Transaksi berhasil ditambahkan" });
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleDeleteCashFlow = () => {
    if (!selectedCashFlow) return;

    deleteCashFlow(selectedCashFlow.id);
    toast({ title: "Berhasil", description: "Transaksi berhasil dihapus" });
    setIsDeleteDialogOpen(false);
    setSelectedCashFlow(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Arus Kas</h1>
          <p className="text-muted-foreground">Kelola pendapatan dan pengeluaran</p>
        </div>
        <div className="flex gap-2">
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
          <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Transaksi
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="opacity-0 animate-fade-in stagger-item">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <ArrowUpCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendapatan</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(stats.income)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-fade-in stagger-item">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <ArrowDownCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pengeluaran</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.expense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-fade-in stagger-item">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stats.profit >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                {stats.profit >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-primary" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Keuntungan/Kerugian</p>
                <p className={`text-2xl font-bold ${stats.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatCurrency(stats.profit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCashFlows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Tidak ada transaksi
                  </TableCell>
                </TableRow>
              ) : (
                filteredCashFlows.map((cf) => (
                  <TableRow key={cf.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(cf.date), "dd MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell>
                      <Badge className={cf.type === "income" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                        {cf.type === "income" ? "Pendapatan" : "Pengeluaran"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{cf.category}</TableCell>
                    <TableCell className="text-muted-foreground">{cf.description}</TableCell>
                    <TableCell className={`font-semibold ${cf.type === "income" ? "text-success" : "text-destructive"}`}>
                      {cf.type === "income" ? "+" : "-"}{formatCurrency(cf.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => { setSelectedCashFlow(cf); setIsDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Transaksi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select
                value={formData.type}
                onValueChange={(v: "income" | "expense") => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pendapatan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Input
                placeholder="Misal: Operasional, Gaji, dll"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                placeholder="Deskripsi transaksi..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Jumlah (Rp)</Label>
              <Input
                type="number"
                placeholder="100000"
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Batal</Button>
            <Button onClick={handleAddCashFlow}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Transaksi</DialogTitle>
          </DialogHeader>
          <p>Apakah Anda yakin ingin menghapus transaksi ini?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteCashFlow}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
