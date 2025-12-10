import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

// Types for Capacitor Thermal Printer
interface BluetoothDevice {
  name: string;
  address: string;
}

interface ThermalPrinterPlugin {
  isSupported(): Promise<{ supported: boolean }>;
  requestPermissions(): Promise<void>;
  listPairedDevices(): Promise<{ devices: BluetoothDevice[] }>;
  connect(options: { address: string }): Promise<void>;
  disconnect(): Promise<void>;
  begin(): PrinterBuilder;
}

interface PrinterBuilder {
  align(align: "left" | "center" | "right"): PrinterBuilder;
  bold(enabled?: boolean): PrinterBuilder;
  underline(enabled?: boolean): PrinterBuilder;
  doubleWidth(enabled?: boolean): PrinterBuilder;
  doubleHeight(enabled?: boolean): PrinterBuilder;
  text(text: string): PrinterBuilder;
  image(url: string): PrinterBuilder;
  qr(data: string, size?: number): PrinterBuilder;
  barcode(type: string, data: string): PrinterBuilder;
  cutPaper(): PrinterBuilder;
  clearFormatting(): PrinterBuilder;
  write(): Promise<void>;
}

// Check if we're in a Capacitor native environment
const isCapacitorNative = (): boolean => {
  return typeof window !== "undefined" && 
         (window as any).Capacitor !== undefined && 
         (window as any).Capacitor.isNativePlatform?.();
};

// Get the thermal printer plugin
const getThermalPrinter = (): ThermalPrinterPlugin | null => {
  if (!isCapacitorNative()) return null;
  
  try {
    // Dynamic import for Capacitor plugin
    const { CapacitorThermalPrinter } = require("capacitor-thermal-printer");
    return CapacitorThermalPrinter;
  } catch {
    return null;
  }
};

export function useBluetoothPrinter() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  const checkSupport = useCallback(async () => {
    const printer = getThermalPrinter();
    if (!printer) {
      setIsSupported(false);
      return false;
    }

    try {
      const result = await printer.isSupported();
      setIsSupported(result.supported);
      return result.supported;
    } catch {
      setIsSupported(false);
      return false;
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    const printer = getThermalPrinter();
    if (!printer) {
      toast({
        title: "Tidak Didukung",
        description: "Bluetooth printer hanya tersedia di aplikasi native",
        variant: "destructive",
      });
      return false;
    }

    try {
      await printer.requestPermissions();
      return true;
    } catch (error) {
      toast({
        title: "Izin Ditolak",
        description: "Mohon berikan izin Bluetooth untuk menggunakan printer",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const scanDevices = useCallback(async () => {
    const printer = getThermalPrinter();
    if (!printer) {
      toast({
        title: "Tidak Didukung",
        description: "Fitur ini memerlukan aplikasi native (Android/iOS)",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await printer.listPairedDevices();
      setDevices(result.devices || []);
      
      if (result.devices.length === 0) {
        toast({
          title: "Tidak Ada Printer",
          description: "Pastikan printer Bluetooth sudah di-pair dengan perangkat",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mencari perangkat Bluetooth",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }, [requestPermissions, toast]);

  const connectDevice = useCallback(async (device: BluetoothDevice) => {
    const printer = getThermalPrinter();
    if (!printer) return false;

    setIsConnecting(true);
    try {
      await printer.connect({ address: device.address });
      setConnectedDevice(device);
      toast({
        title: "Terhubung",
        description: `Terhubung ke ${device.name}`,
      });
      return true;
    } catch (error) {
      toast({
        title: "Gagal Terhubung",
        description: `Tidak dapat terhubung ke ${device.name}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  const disconnectDevice = useCallback(async () => {
    const printer = getThermalPrinter();
    if (!printer) return;

    try {
      await printer.disconnect();
      setConnectedDevice(null);
      toast({
        title: "Terputus",
        description: "Koneksi printer terputus",
      });
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  }, [toast]);

  const printReceipt = useCallback(async (content: {
    storeName: string;
    tagline?: string;
    phone?: string;
    address?: string;
    invoiceNumber: string;
    date: string;
    customerName: string;
    items: Array<{ name: string; service: string; price: number }>;
    subtotal: number;
    discount: number;
    total: number;
    paymentStatus: string;
    bankInfo?: { bankName: string; account: string; holder: string };
    qrData?: string;
  }) => {
    const printer = getThermalPrinter();
    if (!printer || !connectedDevice) {
      toast({
        title: "Printer Tidak Terhubung",
        description: "Hubungkan printer terlebih dahulu",
        variant: "destructive",
      });
      return false;
    }

    setIsPrinting(true);
    try {
      const builder = printer.begin();
      
      // Header
      builder
        .align("center")
        .bold()
        .doubleWidth()
        .text(`${content.storeName}\n`)
        .clearFormatting()
        .align("center");
      
      if (content.tagline) {
        builder.text(`${content.tagline}\n`);
      }
      if (content.phone) {
        builder.text(`${content.phone}\n`);
      }
      if (content.address) {
        builder.text(`${content.address}\n`);
      }

      // Invoice number
      builder
        .text("\n================================\n")
        .bold()
        .text("INVOICE\n")
        .clearFormatting()
        .text(`#${content.invoiceNumber}\n`)
        .text(`${content.date}\n`)
        .text("================================\n");

      // Customer
      builder
        .align("left")
        .text(`Customer: ${content.customerName}\n`)
        .text("--------------------------------\n");

      // Items
      content.items.forEach((item) => {
        builder
          .bold()
          .text(`${item.name}\n`)
          .clearFormatting()
          .text(`  ${item.service}\n`)
          .align("right")
          .text(`Rp ${item.price.toLocaleString("id-ID")}\n`)
          .align("left");
      });

      // Totals
      builder
        .text("--------------------------------\n")
        .align("left")
        .text(`Subtotal`)
        .align("right")
        .text(`Rp ${content.subtotal.toLocaleString("id-ID")}\n`);

      if (content.discount > 0) {
        builder
          .align("left")
          .text(`Diskon`)
          .align("right")
          .text(`-Rp ${content.discount.toLocaleString("id-ID")}\n`);
      }

      builder
        .text("================================\n")
        .bold()
        .align("left")
        .text(`TOTAL`)
        .align("right")
        .text(`Rp ${content.total.toLocaleString("id-ID")}\n`)
        .clearFormatting()
        .text("================================\n");

      // Payment status
      builder
        .align("center")
        .bold()
        .text(content.paymentStatus === "paid" ? "LUNAS\n" : "BELUM BAYAR\n")
        .clearFormatting();

      // Bank info
      if (content.bankInfo) {
        builder
          .text("\n")
          .text("Pembayaran:\n")
          .text(`${content.bankInfo.bankName} - ${content.bankInfo.account}\n`)
          .text(`a.n. ${content.bankInfo.holder}\n`);
      }

      // QR Code
      if (content.qrData) {
        builder
          .text("\n")
          .qr(content.qrData, 6);
      }

      // Footer
      builder
        .text("\n")
        .align("center")
        .text("Terima kasih!\n")
        .text("\n\n\n")
        .cutPaper();

      await builder.write();

      toast({
        title: "Berhasil",
        description: "Invoice berhasil dicetak",
      });
      return true;
    } catch (error) {
      console.error("Print error:", error);
      toast({
        title: "Gagal Mencetak",
        description: "Terjadi kesalahan saat mencetak",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [connectedDevice, toast]);

  return {
    isCapacitorNative: isCapacitorNative(),
    isSupported,
    isScanning,
    isConnecting,
    isPrinting,
    devices,
    connectedDevice,
    checkSupport,
    requestPermissions,
    scanDevices,
    connectDevice,
    disconnectDevice,
    printReceipt,
  };
}
