import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";

// Types for Bluetooth device
interface BluetoothDevice {
  name: string;
  address: string;
}

// Saved printer address in localStorage
const PRINTER_ADDRESS_KEY = "savedPrinterAddress";
const PRINTER_NAME_KEY = "savedPrinterName";

// Check if we're in a Capacitor native environment
const isCapacitorNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
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
  const [manualAddress, setManualAddress] = useState("");

  // Load saved printer on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem(PRINTER_ADDRESS_KEY);
    const savedName = localStorage.getItem(PRINTER_NAME_KEY);
    if (savedAddress) {
      setConnectedDevice({
        name: savedName || "Saved Printer",
        address: savedAddress
      });
    }
  }, []);

  const checkSupport = useCallback(async () => {
    setIsSupported(isCapacitorNative());
    return isCapacitorNative();
  }, []);

  const requestPermissions = useCallback(async () => {
    if (!isCapacitorNative()) {
      toast({
        title: "Tidak Didukung",
        description: "Gunakan tombol 'Print Thermal' di menu aksi",
        variant: "destructive",
      });
      return false;
    }
    return true;
  }, [toast]);

  const scanDevices = useCallback(async () => {
    toast({
      title: "Pair Printer Dulu",
      description: "Pair printer di Settings > Bluetooth, lalu masukkan MAC address",
    });

    const savedAddress = localStorage.getItem(PRINTER_ADDRESS_KEY);
    const savedName = localStorage.getItem(PRINTER_NAME_KEY);
    if (savedAddress) {
      setDevices([{ name: savedName || "Saved Printer", address: savedAddress }]);
    }
  }, [toast]);

  const addPrinterManually = useCallback((name: string, address: string) => {
    if (!address || !address.match(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)) {
      toast({
        title: "Format Salah",
        description: "MAC Address harus format: XX:XX:XX:XX:XX:XX",
        variant: "destructive",
      });
      return false;
    }

    const device: BluetoothDevice = {
      name: name || "Printer",
      address: address.toUpperCase()
    };

    localStorage.setItem(PRINTER_ADDRESS_KEY, device.address);
    localStorage.setItem(PRINTER_NAME_KEY, device.name);

    setDevices([device]);
    setConnectedDevice(device);

    toast({
      title: "Printer Ditambahkan",
      description: `${device.name} (${device.address})`,
    });

    return true;
  }, [toast]);

  const connectDevice = useCallback(async (device: BluetoothDevice) => {
    setIsConnecting(true);
    try {
      localStorage.setItem(PRINTER_ADDRESS_KEY, device.address);
      localStorage.setItem(PRINTER_NAME_KEY, device.name);

      setConnectedDevice(device);
      toast({
        title: "Printer Dipilih",
        description: `${device.name} siap digunakan`,
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  const disconnectDevice = useCallback(async () => {
    localStorage.removeItem(PRINTER_ADDRESS_KEY);
    localStorage.removeItem(PRINTER_NAME_KEY);
    setConnectedDevice(null);
    setDevices([]);
    toast({
      title: "Printer Dihapus",
      description: "Printer telah dihapus dari daftar",
    });
  }, [toast]);

  // Stub for printReceipt - actual printing should use laundryPrint.ts
  const printReceipt = useCallback(async (_content: any) => {
    toast({
      title: "Gunakan Print Thermal",
      description: "Silakan gunakan tombol 'Print Thermal' di menu aksi order",
    });
    return false;
  }, [toast]);

  return {
    isCapacitorNative: isCapacitorNative(),
    isSupported,
    isScanning,
    isConnecting,
    isPrinting,
    devices,
    connectedDevice,
    manualAddress,
    setManualAddress,
    checkSupport,
    requestPermissions,
    scanDevices,
    addPrinterManually,
    connectDevice,
    disconnectDevice,
    printReceipt,
  };
}
