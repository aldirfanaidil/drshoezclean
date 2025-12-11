import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore, ShoeItem } from "@/lib/store";
import { SERVICES, formatCurrency, generateInvoiceNumber } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Send, RotateCcw, LogIn } from "lucide-react";
import defaultLogo from "@/assets/logo.png";

export default function ClientFormPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addOrder, addCustomer, findCustomerByPhone, settings } = useAppStore();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    shoeCount: 1,
    shoes: [{ id: crypto.randomUUID(), brand: "", service: "", serviceType: "", price: 0 }] as ShoeItem[],
  });

  const handleShoeCountChange = (count: number) => {
    const newShoes = [...formData.shoes];
    if (count > formData.shoes.length) {
      for (let i = formData.shoes.length; i < count; i++) {
        newShoes.push({ id: crypto.randomUUID(), brand: "", service: "", serviceType: "", price: 0 });
      }
    } else {
      newShoes.splice(count);
    }
    setFormData({ ...formData, shoeCount: count, shoes: newShoes });
  };

  const handleShoeChange = (index: number, field: keyof ShoeItem, value: string) => {
    const newShoes = [...formData.shoes];
    newShoes[index] = { ...newShoes[index], [field]: value };

    if (field === "service" || field === "serviceType") {
      const service = newShoes[index].service;
      const serviceType = newShoes[index].serviceType;
      if (service && serviceType) {
        const serviceData = SERVICES[service as keyof typeof SERVICES];
        if (serviceData?.types[serviceType as keyof typeof serviceData.types]) {
          newShoes[index].price = serviceData.types[serviceType as keyof typeof serviceData.types].price;
        }
      }
    }
    setFormData({ ...formData, shoes: newShoes });
  };

  const calculateTotal = () => formData.shoes.reduce((acc, s) => acc + s.price, 0);

  const handleSubmit = () => {
    if (!formData.name || !formData.phone) {
      toast({ title: "Error", description: "Nama dan nomor telepon wajib diisi", variant: "destructive" });
      return;
    }
    if (formData.shoes.some((s) => !s.brand || !s.service || !s.serviceType)) {
      toast({ title: "Error", description: "Lengkapi data semua sepatu", variant: "destructive" });
      return;
    }

    let customer = findCustomerByPhone(formData.phone);
    if (!customer) {
      customer = addCustomer({ name: formData.name, phone: formData.phone });
    }

    const total = calculateTotal();
    addOrder({
      invoiceNumber: generateInvoiceNumber(),
      customerId: customer.id,
      customerName: formData.name,
      customerPhone: formData.phone,
      shoes: formData.shoes,
      entryDate: new Date().toISOString().split("T")[0],
      estimatedDate: "",
      paymentStatus: "unpaid",
      subtotal: total,
      discount: 0,
      total,
    });

    toast({ title: "Berhasil!", description: "Pesanan berhasil dikirim" });
    handleReset();
  };

  const handleReset = () => {
    setFormData({
      name: "",
      phone: "",
      shoeCount: 1,
      shoes: [{ id: crypto.randomUUID(), brand: "", service: "", serviceType: "", price: 0 }],
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <img src={settings.logo || defaultLogo} alt="Logo" className="w-24 h-24 mx-auto mb-4 object-cover rounded-full" />
          <h1 className="text-3xl font-bold text-foreground">{settings.name}</h1>
          <p className="text-muted-foreground">{settings.tagline}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate("/login")}>
            <LogIn className="w-4 h-4 mr-2" /> Login Admin
          </Button>
        </div>

        {/* Form */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle>Form Pemesanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input placeholder="Masukkan nama" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>No. Telepon</Label>
                <Input placeholder="08xxxxxxxxxx" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Jumlah Pasang Sepatu</Label>
              <Select value={String(formData.shoeCount)} onValueChange={(v) => handleShoeCountChange(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <SelectItem key={n} value={String(n)}>{n} pasang</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {formData.shoes.map((shoe, index) => (
              <Card key={shoe.id} className="bg-muted/30">
                <CardHeader className="py-3"><CardTitle className="text-sm">Sepatu ke-{index + 1}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Merek Sepatu</Label>
                    <Input placeholder="Nike, Adidas, dll" value={shoe.brand} onChange={(e) => handleShoeChange(index, "brand", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Layanan</Label>
                      <Select value={shoe.service} onValueChange={(v) => handleShoeChange(index, "service", v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(SERVICES).map(([key, s]) => <SelectItem key={key} value={key}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipe</Label>
                      <Select value={shoe.serviceType} onValueChange={(v) => handleShoeChange(index, "serviceType", v)} disabled={!shoe.service}>
                        <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>
                          {shoe.service && Object.entries(SERVICES[shoe.service as keyof typeof SERVICES].types).map(([key, t]) => (
                            <SelectItem key={key} value={key}>{t.name} - {formatCurrency(t.price)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {shoe.price > 0 && <p className="text-right font-semibold text-primary">{formatCurrency(shoe.price)}</p>}
                </CardContent>
              </Card>
            ))}

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button variant="outline" onClick={handleReset} className="flex-1"><RotateCcw className="w-4 h-4 mr-2" /> Reset</Button>
              <Button onClick={handleSubmit} className="flex-1"><Send className="w-4 h-4 mr-2" /> Proses Pesanan</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
