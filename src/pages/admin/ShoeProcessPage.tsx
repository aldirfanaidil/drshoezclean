import { useState, useMemo } from "react";
import { useAppStore, Order } from "@/lib/store";
import { SHOE_PROCESSES, formatCurrency } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Footprints, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { BarcodeScanner } from "@/components/BarcodeScanner";

const sendWhatsAppNotification = (phone: string, customerName: string, invoiceNumber: string, storeName: string) => {
  // Format phone number for WhatsApp (remove leading 0, add 62)
  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "62" + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith("62")) {
    formattedPhone = "62" + formattedPhone;
  }

  const message = encodeURIComponent(
    `Halo ${customerName}! 👋\n\n` +
    `Sepatu Anda dengan nomor invoice *${invoiceNumber}* sudah selesai dan siap diambil di ${storeName}. ✨\n\n` +
    `Terima kasih telah mempercayakan sepatu Anda kepada kami! 🙏`
  );

  window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");
};

export default function ShoeProcessPage() {
  const { orders, updateOrder, branches, settings } = useAppStore();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterProcess, setFilterProcess] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filter orders yang belum selesai atau semua
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchSearch =
        order.customerName.toLowerCase().includes(search.toLowerCase()) ||
        order.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        order.customerPhone.includes(search);

      const matchProcess =
        filterProcess === "all" ||
        order.shoes.some((shoe) => shoe.processStatus === filterProcess);

      return matchSearch && matchProcess && order.paymentStatus !== "cancelled";
    });
  }, [orders, search, filterProcess]);

  const handleUpdateShoeProcess = (orderId: string, shoeId: string, newProcess: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const updatedShoes = order.shoes.map((shoe) =>
      shoe.id === shoeId ? { ...shoe, processStatus: newProcess } : shoe
    );

    updateOrder(orderId, { shoes: updatedShoes });
    
    // Check if all shoes are ready and send WhatsApp notification
    const allReady = updatedShoes.every((shoe) => shoe.processStatus === "ready");
    if (newProcess === "ready" && allReady && settings.whatsappNotificationEnabled) {
      sendWhatsAppNotification(
        order.customerPhone,
        order.customerName,
        order.invoiceNumber,
        settings.name
      );
    }
    
    toast({
      title: "Berhasil",
      description: `Status proses diperbarui ke "${SHOE_PROCESSES.find(p => p.value === newProcess)?.label}"`,
    });
  };

  const getProcessBadgeVariant = (process?: string) => {
    switch (process) {
      case "received":
        return "secondary";
      case "cleaning":
        return "default";
      case "drying":
        return "outline";
      case "finishing":
        return "default";
      case "ready":
        return "default";
      case "picked_up":
        return "default";
      default:
        return "secondary";
    }
  };

  const getProcessIcon = (process?: string) => {
    switch (process) {
      case "ready":
      case "picked_up":
        return <CheckCircle className="w-3 h-3" />;
      case "cleaning":
      case "drying":
      case "finishing":
        return <Loader2 className="w-3 h-3 animate-spin" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  // Stats
  const stats = useMemo(() => {
    let received = 0;
    let inProgress = 0;
    let ready = 0;
    let pickedUp = 0;

    orders.forEach((order) => {
      if (order.paymentStatus === "cancelled") return;
      order.shoes.forEach((shoe) => {
        switch (shoe.processStatus) {
          case "received":
            received++;
            break;
          case "cleaning":
          case "drying":
          case "finishing":
            inProgress++;
            break;
          case "ready":
            ready++;
            break;
          case "picked_up":
            pickedUp++;
            break;
          default:
            received++;
        }
      });
    });

    return { received, inProgress, ready, pickedUp };
  }, [orders]);

  const getBranchName = (branchId?: string) => {
    if (!branchId) return "-";
    const branch = branches.find((b) => b.id === branchId);
    return branch?.name || "-";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Proses Sepatu</h1>
        <p className="text-muted-foreground">Lacak status proses pencucian sepatu</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/50">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diterima</p>
                <p className="text-xl font-bold">{stats.received}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diproses</p>
                <p className="text-xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Siap Ambil</p>
                <p className="text-xl font-bold">{stats.ready}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Footprints className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diambil</p>
                <p className="text-xl font-bold">{stats.pickedUp}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, invoice, telepon..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <BarcodeScanner onScan={(result) => setSearch(result)} />
            </div>
            <Select value={filterProcess} onValueChange={setFilterProcess}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter proses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Proses</SelectItem>
                {SHOE_PROCESSES.map((process) => (
                  <SelectItem key={process.value} value={process.value}>
                    {process.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pesanan</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Footprints className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada pesanan ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead>Sepatu</TableHead>
                    <TableHead>Status Proses</TableHead>
                    <TableHead>Tanggal Masuk</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getBranchName(order.branchId)}</TableCell>
                      <TableCell>{order.shoes.length} pasang</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {order.shoes.map((shoe, idx) => {
                            const process = SHOE_PROCESSES.find(
                              (p) => p.value === (shoe.processStatus || "received")
                            );
                            return (
                              <Badge
                                key={shoe.id}
                                variant={getProcessBadgeVariant(shoe.processStatus)}
                                className="text-xs gap-1"
                              >
                                {getProcessIcon(shoe.processStatus)}
                                {idx + 1}: {process?.label || "Diterima"}
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.entryDate), "dd MMM yyyy", { locale: id })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          Update Proses
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Process Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Proses Sepatu</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 pt-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-mono text-sm">{selectedOrder.invoiceNumber}</p>
                <p className="font-medium">{selectedOrder.customerName}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
              </div>

              <div className="space-y-3">
                {selectedOrder.shoes.map((shoe, idx) => (
                  <div
                    key={shoe.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Sepatu ke-{idx + 1}</p>
                        <p className="text-sm text-muted-foreground">
                          {shoe.brand} - {shoe.service} ({shoe.serviceType})
                        </p>
                        <p className="text-sm font-medium text-primary">
                          {formatCurrency(shoe.price)}
                        </p>
                      </div>
                    </div>
                    <Select
                      value={shoe.processStatus || "received"}
                      onValueChange={(value) =>
                        handleUpdateShoeProcess(selectedOrder.id, shoe.id, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHOE_PROCESSES.map((process) => (
                          <SelectItem key={process.value} value={process.value}>
                            {process.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                onClick={() => setSelectedOrder(null)}
              >
                Selesai
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
