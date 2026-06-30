import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bluetooth, BluetoothConnected, Loader2, Printer, Plus, Smartphone, Trash2 } from "lucide-react";
import { useBluetoothPrinter } from "@/hooks/useBluetoothPrinter";
import { Order, useAppStore } from "@/lib/store";
import { SERVICES } from "@/lib/constants";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface BluetoothPrinterDialogProps {
  order: Order;
  trigger?: React.ReactNode;
}

export default function BluetoothPrinterDialog({ order, trigger }: BluetoothPrinterDialogProps) {
  const { settings } = useAppStore();
  const [open, setOpen] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [printerAddress, setPrinterAddress] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    isCapacitorNative,
    isPrinting,
    devices,
    connectedDevice,
    addPrinterManually,
    connectDevice,
    disconnectDevice,
    printReceipt,
  } = useBluetoothPrinter();

  const handleAddPrinter = () => {
    const success = addPrinterManually(printerName, printerAddress);
    if (success) {
      setPrinterName("");
      setPrinterAddress("");
      setShowAddForm(false);
    }
  };

  const handlePrint = async () => {
    const success = await printReceipt({
      storeName: settings.name,
      tagline: settings.tagline,
      phone: settings.phone,
      address: settings.address,
      invoiceNumber: order.invoiceNumber,
      date: format(new Date(order.entryDate), "dd MMM yyyy HH:mm", { locale: id }),
      customerName: order.customerName,
      items: order.shoes.map((shoe) => {
        let typeLabel = "";
        if (shoe.service && shoe.serviceType) {
          const serviceKey = (shoe.service ?? "").toUpperCase();
          const typeKey = (shoe.serviceType ?? "").replace(/\s+/g, "_").toLowerCase();
          const serviceObj = SERVICES[serviceKey as keyof typeof SERVICES] as any;
          typeLabel = serviceObj?.types?.[typeKey as any]?.name || shoe.serviceType || serviceObj?.name || shoe.service;
        } else if (shoe.service) {
          const serviceKey = (shoe.service ?? "").toUpperCase();
          typeLabel = SERVICES[serviceKey as keyof typeof SERVICES]?.name || shoe.service;
        }
        return {
          name: shoe.brand,
          service: typeLabel,
          price: shoe.price,
        };
      }),
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      paymentStatus: order.paymentStatus,
      bankInfo: {
        bankName: settings.bankName,
        account: settings.bankAccount,
        holder: settings.accountHolder,
      },
      qrData: `${window.location.origin}/tracking?invoice=${order.invoiceNumber}`,
    });

    if (success) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Bluetooth className="w-4 h-4 mr-2" />
            Bluetooth
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="w-5 h-5" />
            Cetak via Bluetooth
          </DialogTitle>
          <DialogDescription>
            Hubungkan ke printer thermal Bluetooth untuk mencetak invoice
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isCapacitorNative ? (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <Smartphone className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Fitur Native Diperlukan</p>
                    <p className="text-sm text-muted-foreground">
                      Bluetooth printer hanya tersedia di aplikasi native Android/iOS.
                      Gunakan tombol Cetak biasa untuk print via browser.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Connected Device */}
              {connectedDevice && (
                <Card className="border-green-500/50 bg-green-500/10">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BluetoothConnected className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium">{connectedDevice.name}</p>
                          <p className="text-xs text-muted-foreground">{connectedDevice.address}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={disconnectDevice}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add Printer Form */}
              {!connectedDevice && (
                <>
                  {showAddForm ? (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Tambah Printer</CardTitle>
                        <CardDescription className="text-xs">
                          Pastikan printer sudah di-pair di Settings &gt; Bluetooth
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nama Printer</Label>
                          <Input
                            placeholder="MP-58C"
                            value={printerName}
                            onChange={(e) => setPrinterName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">MAC Address</Label>
                          <Input
                            placeholder="00:11:22:33:44:55"
                            value={printerAddress}
                            onChange={(e) => setPrinterAddress(e.target.value.toUpperCase())}
                          />
                          <p className="text-xs text-muted-foreground">
                            Lihat di Settings &gt; Bluetooth &gt; Paired Devices &gt; MP-58C
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setShowAddForm(false)}
                          >
                            Batal
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={handleAddPrinter}
                            disabled={!printerAddress}
                          >
                            Simpan
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-6">
                        <div className="text-center space-y-3">
                          <Printer className="w-10 h-10 mx-auto text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Belum ada printer yang ditambahkan
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddForm(true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Printer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Saved Devices List */}
              {devices.length > 0 && !connectedDevice && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Printer Tersimpan</p>
                  {devices.map((device) => (
                    <Card
                      key={device.address}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => connectDevice(device)}
                    >
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3">
                          <Printer className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{device.name}</p>
                            <p className="text-xs text-muted-foreground">{device.address}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Print Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handlePrint}
                disabled={!connectedDevice || isPrinting}
              >
                {isPrinting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mencetak...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" />
                    Cetak Invoice
                  </>
                )}
              </Button>

              {/* Help Text */}
              <p className="text-xs text-center text-muted-foreground">
                Pair printer dulu di Settings &gt; Bluetooth, lalu tambahkan MAC address di atas
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
