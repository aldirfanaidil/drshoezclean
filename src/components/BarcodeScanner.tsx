import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (result: string) => void;
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = (result: { rawValue: string }[]) => {
    if (result && result.length > 0) {
      const scannedValue = result[0].rawValue;
      if (scannedValue) {
        onScan(scannedValue);
        setIsOpen(false);
      }
    }
  };

  const handleError = (err: unknown) => {
    console.error("Barcode scanner error:", err);
    setError("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        title="Scan Barcode"
      >
        <ScanLine className="w-4 h-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Scan Barcode / QR Code
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error ? (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-center">
                <p>{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setError(null)}
                >
                  Coba Lagi
                </Button>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden bg-muted aspect-square">
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  formats={[
                    "qr_code",
                    "code_128",
                    "code_39",
                    "ean_13",
                    "ean_8",
                    "upc_a",
                    "upc_e",
                  ]}
                  styles={{
                    container: {
                      width: "100%",
                      height: "100%",
                    },
                    video: {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    },
                  }}
                />
                {/* Scanner Overlay with Laser Animation */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner brackets */}
                  <div className="absolute top-6 left-6 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-6 right-6 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-6 left-6 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-6 right-6 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-lg" />

                  {/* Laser beam animation */}
                  <div
                    className="absolute left-6 right-6 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_3px_rgba(239,68,68,0.7)]"
                    style={{
                      animation: "scanLine 2s ease-in-out infinite",
                    }}
                  />

                  {/* Scanning effect overlay */}
                  <div className="absolute inset-6 border border-primary/30 rounded-lg" />
                </div>

                {/* CSS Animation Keyframes */}
                <style>{`
                  @keyframes scanLine {
                    0%, 100% {
                      top: 24px;
                      opacity: 0.8;
                    }
                    50% {
                      top: calc(100% - 28px);
                      opacity: 1;
                    }
                  }
                `}</style>
              </div>
            )}

            <p className="text-sm text-muted-foreground text-center">
              Arahkan kamera ke barcode atau QR code invoice pesanan
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
