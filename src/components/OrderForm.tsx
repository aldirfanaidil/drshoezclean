import { ShoeItem, Customer } from "@/lib/store";
import { SERVICES, formatCurrency } from "@/lib/constants";
import { Button } from "@/components/ui/button";
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
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import CustomerAutocomplete from "./CustomerAutocomplete";

interface Branch {
  id: string;
  name: string;
  isActive: boolean;
}

interface Discount {
  id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  isActive: boolean;
}

interface FormData {
  customerName: string;
  customerPhone: string;
  customerId: string;
  isNewCustomer: boolean;
  entryDate: string;
  estimatedDate: string;
  pickupDate: string;
  notes: string;
  paymentStatus: "unpaid" | "paid" | "cancelled";
  paymentMethod: "" | "cash" | "transfer" | "qris";
  branchId: string;
  shoes: ShoeItem[];
}

interface OrderFormProps {
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  branches: Branch[];
  discounts: Discount[];
  customers: Customer[];
  isEdit?: boolean;
}

export default function OrderForm({
  formData,
  onFormDataChange,
  branches,
  discounts,
  customers,
  isEdit = false,
}: OrderFormProps) {
  const handleSelectCustomer = (customer: Customer) => {
    onFormDataChange({
      ...formData,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerId: customer.id,
      isNewCustomer: false,
    });
  };
  const handleAddShoe = () => {
    onFormDataChange({
      ...formData,
      shoes: [...formData.shoes, { id: crypto.randomUUID(), brand: "", service: "", serviceType: "", price: 0 }],
    });
  };

  const handleRemoveShoe = (index: number) => {
    if (formData.shoes.length > 1) {
      onFormDataChange({
        ...formData,
        shoes: formData.shoes.filter((_, i) => i !== index),
      });
    }
  };

  const handleShoeChange = (index: number, field: keyof ShoeItem, value: string | number) => {
    const newShoes = [...formData.shoes];
    newShoes[index] = { ...newShoes[index], [field]: value };

    // Auto-calculate price when service and type are selected
    if (field === "service" || field === "serviceType") {
      const service = newShoes[index].service;
      const serviceType = newShoes[index].serviceType;
      if (service && serviceType) {
        const serviceData = SERVICES[service as keyof typeof SERVICES];
        if (serviceData && serviceData.types[serviceType as keyof typeof serviceData.types]) {
          newShoes[index].price = serviceData.types[serviceType as keyof typeof serviceData.types].price;
        }
      }
    }

    // Apply discount
    if (field === "discountId") {
      const discount = discounts.find((d) => d.id === value && d.isActive);
      if (discount) {
        if (discount.type === "percentage") {
          newShoes[index].discountAmount = (newShoes[index].price * discount.value) / 100;
        } else {
          newShoes[index].discountAmount = discount.value;
        }
      } else {
        newShoes[index].discountAmount = 0;
      }
    }

    onFormDataChange({ ...formData, shoes: newShoes });
  };

  const calculateTotal = () => {
    const subtotal = formData.shoes.reduce((acc, s) => acc + s.price, 0);
    const discount = formData.shoes.reduce((acc, s) => acc + (s.discountAmount || 0), 0);
    return { subtotal, discount, total: subtotal - discount };
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* Customer Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Informasi Pelanggan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nomor Telepon</Label>
            <CustomerAutocomplete
              placeholder="08xxxxxxxxxx"
              value={formData.customerPhone}
              onChange={(value) => onFormDataChange({ 
                ...formData, 
                customerPhone: value,
                isNewCustomer: true,
                customerId: "",
              })}
              onSelectCustomer={handleSelectCustomer}
              customers={customers}
              searchField="phone"
            />
          </div>
          <div className="space-y-2">
            <Label>Nama Pelanggan</Label>
            <CustomerAutocomplete
              placeholder="Nama lengkap"
              value={formData.customerName}
              onChange={(value) => onFormDataChange({ 
                ...formData, 
                customerName: value,
                isNewCustomer: true,
                customerId: "",
              })}
              onSelectCustomer={handleSelectCustomer}
              customers={customers}
              searchField="name"
            />
          </div>
        </div>
      </div>

      {/* Order Details Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Detail Pesanan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Cabang</Label>
            <Select
              value={formData.branchId || "pusat"}
              onValueChange={(v) => onFormDataChange({ ...formData, branchId: v === "pusat" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pusat">Pusat</SelectItem>
                {branches.filter(b => b.isActive).map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tanggal Masuk</Label>
            <Input
              type="date"
              value={formData.entryDate}
              onChange={(e) => onFormDataChange({ ...formData, entryDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Estimasi Selesai</Label>
            <Input
              type="date"
              value={formData.estimatedDate}
              onChange={(e) => onFormDataChange({ ...formData, estimatedDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Pengambilan</Label>
            <Input
              type="date"
              value={formData.pickupDate}
              onChange={(e) => onFormDataChange({ ...formData, pickupDate: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Catatan Khusus</Label>
          <Textarea
            placeholder="Catatan tambahan..."
            value={formData.notes}
            onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>

      {/* Shoes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Data Sepatu</h3>
          <Button type="button" variant="outline" size="sm" onClick={handleAddShoe}>
            <Plus className="w-4 h-4 mr-1" /> Tambah Sepatu
          </Button>
        </div>

        {formData.shoes.map((shoe, index) => (
          <Card key={shoe.id} className="relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Sepatu ke-{index + 1}
                {formData.shoes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => handleRemoveShoe(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Merek Sepatu</Label>
                  <Input
                    placeholder="Nike, Adidas, dll"
                    value={shoe.brand}
                    onChange={(e) => handleShoeChange(index, "brand", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Layanan</Label>
                  <Select
                    value={shoe.service || "none"}
                    onValueChange={(v) => handleShoeChange(index, "service", v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih layanan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Pilih layanan</SelectItem>
                      {Object.entries(SERVICES).map(([key, service]) => (
                        <SelectItem key={key} value={key}>
                          {service.name} ({service.duration})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipe Layanan</Label>
                  <Select
                    value={shoe.serviceType || "none"}
                    onValueChange={(v) => handleShoeChange(index, "serviceType", v === "none" ? "" : v)}
                    disabled={!shoe.service}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Pilih tipe</SelectItem>
                      {shoe.service && Object.entries(SERVICES[shoe.service as keyof typeof SERVICES]?.types || {}).map(([key, type]) => (
                        <SelectItem key={key} value={key}>
                          {type.name} - {formatCurrency(type.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Diskon</Label>
                  <Select
                    value={shoe.discountId || "none"}
                    onValueChange={(v) => handleShoeChange(index, "discountId", v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih diskon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa Diskon</SelectItem>
                      {discounts.filter((d) => d.isActive).map((discount) => (
                        <SelectItem key={discount.id} value={discount.id}>
                          {discount.name} ({discount.type === "percentage" ? `${discount.value}%` : formatCurrency(discount.value)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm text-muted-foreground">Harga: </span>
                <span className="font-semibold text-primary">{formatCurrency(shoe.price)}</span>
                {shoe.discountAmount && shoe.discountAmount > 0 && (
                  <span className="text-sm text-destructive ml-2">(-{formatCurrency(shoe.discountAmount)})</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Pembayaran</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status Pembayaran</Label>
            <Select
              value={formData.paymentStatus}
              onValueChange={(v: "unpaid" | "paid" | "cancelled") => onFormDataChange({ ...formData, paymentStatus: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Belum Bayar</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <Select
              value={formData.paymentMethod || "none"}
              onValueChange={(v) => onFormDataChange({ ...formData, paymentMethod: v === "none" ? "" : v as "" | "cash" | "transfer" | "qris" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Belum Dipilih</SelectItem>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(calculateTotal().subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diskon</span>
              <span className="text-destructive">-{formatCurrency(calculateTotal().discount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(calculateTotal().total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
