import { useState, useMemo } from "react";
import { useAppStore, Order, ShoeItem } from "@/lib/store";
import { SERVICES, formatCurrency, generateInvoiceNumber } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Printer,
  MessageCircle,
} from "lucide-react";
import { BranchFilter } from "@/components/BranchFilter";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import InvoicePreview from "@/components/InvoicePreview";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import OrderForm from "@/components/OrderForm";

export default function OrdersPage() {
  const { toast } = useToast();
  const {
    orders,
    customers,
    discounts,
    branches,
    settings,
    addOrder,
    updateOrder,
    deleteOrder,
    addCustomer,
    findCustomerByPhone,
  } = useAppStore();

  const generateInvoiceText = (order: Order) => {
    const statusText = order.paymentStatus === "paid" ? "✅ LUNAS" : "⏳ BELUM BAYAR";

    let shoesText = "";
    order.shoes.forEach((shoe, index) => {
      const serviceName = SERVICES[shoe.service as keyof typeof SERVICES]?.name || shoe.service;
      shoesText += `\n${index + 1}. ${shoe.brand}\n   ${serviceName} - ${formatCurrency(shoe.price)}`;
    });

    return `🧾 *INVOICE ${settings.name}*
━━━━━━━━━━━━━━━━━━
📋 No. Invoice: *${order.invoiceNumber}*
📅 Tanggal: ${format(new Date(order.entryDate), "dd MMM yyyy", { locale: id })}
${order.estimatedDate ? `⏰ Estimasi: ${format(new Date(order.estimatedDate), "dd MMM yyyy", { locale: id })}` : ""}

👤 *Pelanggan:*
${order.customerName}
📱 ${order.customerPhone}

👟 *Detail Sepatu:*${shoesText}

━━━━━━━━━━━━━━━━━━
💰 Subtotal: ${formatCurrency(order.subtotal)}
${order.discount > 0 ? `🎁 Diskon: -${formatCurrency(order.discount)}` : ""}
💵 *TOTAL: ${formatCurrency(order.total)}*

📊 Status: ${statusText}
${order.paymentMethod ? `💳 Metode: ${order.paymentMethod.toUpperCase()}` : ""}

━━━━━━━━━━━━━━━━━━
🏦 *Pembayaran:*
${settings.bankName} - ${settings.bankAccount}
a.n. ${settings.accountHolder}

━━━━━━━━━━━━━━━━━━
Terima kasih telah menggunakan jasa *${settings.name}*! 🙏

📍 ${settings.address}
📞 ${settings.phone}`;
  };

  const handleSendWhatsApp = (order: Order) => {
    let phone = order.customerPhone.replace(/\D/g, "");
    if (phone.startsWith("0")) {
      phone = "62" + phone.slice(1);
    } else if (!phone.startsWith("62")) {
      phone = "62" + phone;
    }

    const text = generateInvoiceText(order);
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedText}`;

    window.open(whatsappUrl, "_blank");

    toast({
      title: "WhatsApp Dibuka",
      description: "Silakan kirim pesan invoice ke pelanggan",
    });
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form state for adding/editing order
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerId: "",
    isNewCustomer: true,
    entryDate: format(new Date(), "yyyy-MM-dd"),
    estimatedDate: "",
    pickupDate: "",
    notes: "",
    paymentStatus: "unpaid" as "unpaid" | "paid" | "cancelled",
    paymentMethod: "" as "" | "cash" | "transfer" | "qris",
    branchId: "" as string,
    shoes: [{ id: crypto.randomUUID(), brand: "", service: "", serviceType: "", price: 0, discountId: "", discountAmount: 0 }] as ShoeItem[],
  });

  const resetForm = () => {
    setFormData({
      customerName: "",
      customerPhone: "",
      customerId: "",
      isNewCustomer: true,
      entryDate: format(new Date(), "yyyy-MM-dd"),
      estimatedDate: "",
      pickupDate: "",
      notes: "",
      paymentStatus: "unpaid",
      paymentMethod: "",
      branchId: "",
      shoes: [{ id: crypto.randomUUID(), brand: "", service: "", serviceType: "", price: 0 }],
    });
  };

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.customerName.toLowerCase().includes(query) ||
          o.customerPhone.includes(query) ||
          o.invoiceNumber.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((o) => o.paymentStatus === statusFilter);
    }

    if (branchFilter !== "all") {
      result = result.filter((o) =>
        branchFilter === "pusat" ? !o.branchId : o.branchId === branchFilter
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, searchQuery, statusFilter, branchFilter]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredOrders.slice(start, start + rowsPerPage);
  }, [filteredOrders, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);

  const handleSearchCustomer = () => {
    const customer = findCustomerByPhone(formData.customerPhone);
    if (customer) {
      setFormData({
        ...formData,
        customerName: customer.name,
        customerId: customer.id,
        isNewCustomer: false,
      });
      toast({ title: "Pelanggan ditemukan", description: customer.name });
    } else {
      setFormData({ ...formData, isNewCustomer: true, customerId: "" });
      toast({ title: "Pelanggan tidak ditemukan", description: "Silakan masukkan data pelanggan baru", variant: "destructive" });
    }
  };
  const calculateTotal = () => {
    const subtotal = formData.shoes.reduce((acc, s) => acc + s.price, 0);
    const discount = formData.shoes.reduce((acc, s) => acc + (s.discountAmount || 0), 0);
    return { subtotal, discount, total: subtotal - discount };
  };

  const handleSubmitOrder = async () => {
    // Validate
    if (!formData.customerName || !formData.customerPhone) {
      toast({ title: "Error", description: "Nama dan nomor telepon wajib diisi", variant: "destructive" });
      return;
    }

    if (formData.shoes.some((s) => !s.brand || !s.service || !s.serviceType)) {
      toast({ title: "Error", description: "Lengkapi data semua sepatu", variant: "destructive" });
      return;
    }

    let customerId = formData.customerId;
    if (formData.isNewCustomer) {
      try {
        const newCustomer = await addCustomer({
          name: formData.customerName,
          phone: formData.customerPhone,
        });
        customerId = newCustomer.id;
      } catch (err) {
        toast({ title: "Error", description: "Gagal menambahkan customer baru", variant: "destructive" });
        return;
      }
    }

    const { subtotal, discount, total } = calculateTotal();

    const orderData = {
      invoiceNumber: generateInvoiceNumber(),
      customerId,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      shoes: formData.shoes.map(s => ({ ...s, processStatus: "received" })),
      entryDate: formData.entryDate,
      estimatedDate: formData.estimatedDate,
      pickupDate: formData.pickupDate || undefined,
      notes: formData.notes || undefined,
      paymentStatus: formData.paymentStatus,
      paymentMethod: formData.paymentMethod || undefined,
      branchId: formData.branchId || undefined,
      subtotal,
      discount,
      total,
    };

    addOrder(orderData);
    toast({ title: "Berhasil", description: "Pesanan berhasil ditambahkan" });
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleUpdateOrder = () => {
    if (!selectedOrder) return;

    const { subtotal, discount, total } = calculateTotal();

    updateOrder(selectedOrder.id, {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      shoes: formData.shoes,
      entryDate: formData.entryDate,
      estimatedDate: formData.estimatedDate,
      pickupDate: formData.pickupDate || undefined,
      notes: formData.notes || undefined,
      paymentStatus: formData.paymentStatus,
      paymentMethod: formData.paymentMethod || undefined,
      subtotal,
      discount,
      total,
    });

    toast({ title: "Berhasil", description: "Pesanan berhasil diperbarui" });
    setIsEditDialogOpen(false);
    setSelectedOrder(null);
    resetForm();
  };

  const handleDeleteOrder = () => {
    if (!selectedOrder) return;
    deleteOrder(selectedOrder.id);
    toast({ title: "Berhasil", description: "Pesanan berhasil dihapus" });
    setIsDeleteDialogOpen(false);
    setSelectedOrder(null);
  };

  const openEditDialog = (order: Order) => {
    setSelectedOrder(order);

    // Helper to format date for HTML input (yyyy-MM-dd)
    const formatDateForInput = (dateStr: string | undefined | null): string => {
      if (!dateStr) return "";
      try {
        // Parse and reformat to yyyy-MM-dd
        const date = new Date(dateStr);
        return format(date, "yyyy-MM-dd");
      } catch {
        return "";
      }
    };

    setFormData({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerId: order.customerId,
      isNewCustomer: false,
      entryDate: formatDateForInput(order.entryDate),
      estimatedDate: formatDateForInput(order.estimatedDate),
      pickupDate: formatDateForInput(order.pickupDate),
      notes: order.notes || "",
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod || "",
      branchId: order.branchId || "",
      shoes: order.shoes,
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-success text-success-foreground">Lunas</Badge>;
      case "unpaid":
        return <Badge className="bg-warning text-warning-foreground">Belum Bayar</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive text-destructive-foreground">Dibatalkan</Badge>;
      default:
        return null;
    }
  };

  const renderOrderForm = (isEdit = false) => (
    <OrderForm
      formData={formData}
      onFormDataChange={setFormData}
      branches={branches}
      discounts={discounts}
      customers={customers}
      isEdit={isEdit}
    />
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pesanan</h1>
          <p className="text-muted-foreground">Kelola semua pesanan pelanggan</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Pesanan
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, telepon, atau invoice..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <BarcodeScanner
              onScan={(result) => {
                setSearchQuery(result);
                toast({
                  title: "Barcode Terdeteksi",
                  description: `Mencari: ${result}`,
                });
              }}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="unpaid">Belum Bayar</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
            <BranchFilter
              value={branchFilter}
              onChange={setBranchFilter}
              branches={branches}
            />
            <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Sepatu</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Tidak ada pesanan
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.invoiceNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                      </div>
                    </TableCell>
                    <TableCell>{order.shoes.length} pasang</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(order.total)}</TableCell>
                    <TableCell>{getStatusBadge(order.paymentStatus)}</TableCell>
                    <TableCell>{format(new Date(order.createdAt), "dd MMM yyyy", { locale: id })}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedOrder(order); setIsViewDialogOpen(true); }}>
                            <Eye className="w-4 h-4 mr-2" /> Lihat
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(order)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedOrder(order); setIsInvoiceDialogOpen(true); }}>
                            <Printer className="w-4 h-4 mr-2" /> Cetak Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendWhatsApp(order)}>
                            <MessageCircle className="w-4 h-4 mr-2" /> Kirim WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { setSelectedOrder(order); setIsDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Sebelumnya
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Halaman {currentPage} dari {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Selanjutnya
          </Button>
        </div>
      )}

      {/* Add Order Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tambah Pesanan Baru</DialogTitle>
          </DialogHeader>
          {renderOrderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSubmitOrder}>Simpan Pesanan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Pesanan</DialogTitle>
          </DialogHeader>
          {renderOrderForm(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateOrder}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Pesanan</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice</p>
                  <p className="font-semibold">{selectedOrder.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedOrder.paymentStatus)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pelanggan</p>
                  <p className="font-semibold">{selectedOrder.customerName}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Metode Pembayaran</p>
                  <p className="font-semibold capitalize">{selectedOrder.paymentMethod || "-"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Detail Sepatu</p>
                {selectedOrder.shoes.map((shoe, index) => (
                  <Card key={shoe.id} className="mb-2">
                    <CardContent className="py-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">Sepatu {index + 1}: {shoe.brand}</p>
                          <p className="text-sm text-muted-foreground">
                            {SERVICES[shoe.service as keyof typeof SERVICES]?.name} - {shoe.serviceType}
                          </p>
                        </div>
                        <p className="font-semibold">{formatCurrency(shoe.price)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Diskon</span>
                      <span className="text-destructive">-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openEditDialog(selectedOrder)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="outline" onClick={() => { setIsViewDialogOpen(false); setIsInvoiceDialogOpen(true); }}>
                  <Printer className="w-4 h-4 mr-2" /> Cetak Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pesanan</DialogTitle>
          </DialogHeader>
          <p>Apakah Anda yakin ingin menghapus pesanan {selectedOrder?.invoiceNumber}?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteOrder}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
          </DialogHeader>
          {selectedOrder && <InvoicePreview order={selectedOrder} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
