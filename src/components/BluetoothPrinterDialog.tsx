import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bluetooth, BluetoothConnected, Loader2, Printer, RefreshCw, Smartphone } from "lucide-react";
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
  
  const {
    isCapacitorNative,
    isScanning,
    isConnecting,
    isPrinting,
    devices,
    connectedDevice,
    scanDevices,
    connectDevice,
    disconnectDevice,
    printReceipt,
  } = useBluetoothPrinter();

  const handlePrint = async () => {
    const success = await printReceipt({
      storeName: settings.name,
      tagline: settings.tagline,
      phone: settings.phone,
      address: settings.address,
      invoiceNumber: order.invoiceNumber,
      date: format(new Date(order.entryDate), "dd MMM yyyy HH:mm", { locale: id }),
      customerName: order.customerName,
      items: order.shoes.map((shoe) => ({
        name: shoe.brand,
        service: SERVICES[shoe.service as keyof typeof SERVICES]?.name || shoe.service,
        price: shoe.price,
      })),
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
                          <p className="text-xs text-muted-foreground">Terhubung</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={disconnectDevice}>
                        Putuskan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Device List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Perangkat Tersedia</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={scanDevices}
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="ml-2">Scan</span>
                  </Button>
                </div>

                {devices.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-6 text-center text-muted-foreground text-sm">
                      {isScanning ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Mencari perangkat...
                        </div>
                      ) : (
                        "Tap 'Scan' untuk mencari printer Bluetooth"
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {devices.map((device) => (
                      <Card
                        key={device.address}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                          connectedDevice?.address === device.address
                            ? "border-primary"
                            : ""
                        }`}
                        onClick={() => connectDevice(device)}
                      >
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Printer className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{device.name || "Unknown Device"}</p>
                                <p className="text-xs text-muted-foreground">{device.address}</p>
                              </div>
                            </div>
                            {isConnecting && connectedDevice?.address !== device.address && (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
