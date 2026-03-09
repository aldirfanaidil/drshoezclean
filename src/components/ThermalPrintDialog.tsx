import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Zap, Printer, Store, User, Loader2, QrCode, Image } from "lucide-react";
import { Order, useAppStore } from "@/lib/store";
import { SERVICES, formatCurrency } from "@/lib/constants";
import { printCustomerInvoice, printStoreInvoice } from "@/lib/laundryPrint";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface ThermalPrintDialogProps {
    order: Order;
    trigger?: React.ReactNode;
}

type InvoiceType = "customer" | "store";

/**
 * Content untuk Thermal Print (tanpa Dialog wrapper)
 * Digunakan di dalam Dialog yang dikelola dari luar
 */
export function ThermalPrintContent({ order }: { order: Order }) {
    const { settings } = useAppStore();
    const { toast } = useToast();
    const [invoiceType, setInvoiceType] = useState<InvoiceType>("customer");
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            if (invoiceType === "customer") {
                await printCustomerInvoice(order, settings);
            } else {
                await printStoreInvoice(order, settings);
            }
            toast({
                title: "Mengirim ke Printer...",
                description: "Cek aplikasi printer Anda",
            });
        } catch (error: any) {
            console.error("Print error:", error);
            toast({
                title: "Gagal Print",
                description: error.message || "Terjadi kesalahan",
                variant: "destructive",
            });
        } finally {
            setIsPrinting(false);
        }
    };

    // Check if logo settings exist
    const hasLogo = !!settings.logo;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 text-lg font-semibold">
                <Zap className="w-5 h-5" />
                Print Thermal
            </div>

            {/* Features Info */}
            <div className="flex gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <QrCode className="w-3 h-3" /> QR Code
                </span>
                {hasLogo && (
                    <span className="flex items-center gap-1">
                        <Image className="w-3 h-3" /> Logo
                    </span>
                )}
            </div>

            {/* Invoice Type Selection */}
            <div>
                <Label className="text-sm font-medium mb-2 block">Pilih Tipe Invoice:</Label>
                <RadioGroup
                    value={invoiceType}
                    onValueChange={(v: InvoiceType) => setInvoiceType(v)}
                    className="flex gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="customer" id="thermal-customer" />
                        <Label htmlFor="thermal-customer" className="cursor-pointer flex items-center gap-1">
                            <User className="w-4 h-4" /> Customer (Lengkap)
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="store" id="thermal-store" />
                        <Label htmlFor="thermal-store" className="cursor-pointer flex items-center gap-1">
                            <Store className="w-4 h-4" /> Toko (Ringkas)
                        </Label>
                    </div>
                </RadioGroup>
            </div>

            {/* Invoice Preview */}
            <Card className="bg-white text-black border max-h-[50vh] overflow-y-auto">
                <CardContent className="p-4 font-mono text-xs leading-relaxed">
                    {invoiceType === "customer" ? (
                        // Customer Invoice Preview
                        <div className="text-center">
                            {hasLogo && (
                                <div className="mb-2 text-muted-foreground text-[10px] italic">
                                    [Logo akan dicetak di sini]
                                </div>
                            )}
                            <p className="font-bold text-base">{settings.name}</p>
                            {settings.tagline && <p className="text-xs">{settings.tagline}</p>}
                            {settings.phone && <p className="text-xs">{settings.phone}</p>}
                            {settings.address && <p className="text-xs">{settings.address}</p>}

                            <p className="my-2">================================</p>
                            <p className="font-bold">INVOICE</p>
                            <p>#{order.invoiceNumber}</p>
                            <p>================================</p>

                            <div className="text-left mt-2">
                                <p><b>Bill To:</b></p>
                                <p>Customer : {order.customerName}</p>
                                <p>Tgl Masuk: {format(new Date(order.entryDate), "dd MMM yyyy", { locale: id })}</p>
                                {order.estimatedDate && (
                                    <p>Estimasi : {format(new Date(order.estimatedDate), "dd MMM yyyy", { locale: id })}</p>
                                )}
                                <p>Status   : {order.paymentStatus === 'paid' ? 'Lunas' : 'Belum Bayar'}</p>

                                <p className="my-1">--------------------------------</p>
                                <p><b>Detail Item:</b></p>
                                {order.shoes.map((shoe, i) => (
                                    <div key={shoe.id} className="ml-2">
                                        <p><b>{i + 1}. {shoe.brand}</b></p>
                                        <p className="ml-2">{SERVICES[shoe.service as keyof typeof SERVICES]?.name || shoe.service}</p>
                                        <p className="ml-2">{formatCurrency(shoe.price)}</p>
                                    </div>
                                ))}

                                <p className="my-1">--------------------------------</p>
                                <p>Sub Total : {formatCurrency(order.subtotal)}</p>
                                {order.discount > 0 && <p>Diskon    : -{formatCurrency(order.discount)}</p>}
                                <p>================================</p>
                                <p className="font-bold text-sm">TOTAL     : {formatCurrency(order.total)}</p>
                                <p>================================</p>
                            </div>

                            <p className="font-bold my-1">
                                {order.paymentStatus === 'paid' ? '-----LUNAS-----' : '-----BELUM BAYAR-----'}
                            </p>

                            {settings.bankName && (
                                <div className="mt-2">
                                    <p><b>Pembayaran:</b></p>
                                    <p>{settings.bankName} - {settings.bankAccount}</p>
                                    <p>{settings.accountHolder}</p>
                                </div>
                            )}

                            <div className="mt-2 py-2 border border-dashed border-gray-300 rounded">
                                <p className="text-muted-foreground text-[10px] italic">[QR Code]</p>
                                <p className="font-bold">{order.invoiceNumber}</p>
                            </div>

                            <p className="my-1">--------------------------------</p>
                            <p className="font-bold">Terima kasih!</p>
                        </div>
                    ) : (
                        // Store Invoice Preview
                        <div className="text-center">
                            {hasLogo && (
                                <div className="mb-2 text-muted-foreground text-[10px] italic">
                                    [Logo]
                                </div>
                            )}
                            <p className="font-bold text-base">{settings.name}</p>

                            <p className="my-2">================================</p>
                            <p className="font-bold">INVOICE TOKO</p>
                            <p>#{order.invoiceNumber}</p>
                            <p>================================</p>

                            <div className="text-left mt-2">
                                <p>Customer: {order.customerName}</p>
                                <p>Tanggal : {format(new Date(order.entryDate), "dd MMM yyyy", { locale: id })}</p>
                                <p>Jumlah  : {order.shoes.length} sepatu</p>
                                <p>================================</p>
                                <p className="font-bold text-sm">TOTAL   : {formatCurrency(order.total)}</p>
                            </div>

                            <p className="font-bold my-1">
                                {order.paymentStatus === 'paid' ? '-----LUNAS-----' : '-----BELUM BAYAR-----'}
                            </p>

                            <div className="mt-2 py-2 border border-dashed border-gray-300 rounded">
                                <p className="text-muted-foreground text-[10px] italic">[QR Code]</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Print Button */}
            <Button className="w-full" size="lg" onClick={handlePrint} disabled={isPrinting}>
                {isPrinting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memproses...
                    </>
                ) : (
                    <>
                        <Printer className="w-4 h-4 mr-2" />
                        Print {invoiceType === "customer" ? "Customer" : "Toko"}
                    </>
                )}
            </Button>

            {/* Info */}
            <p className="text-xs text-center text-muted-foreground">
                Pastikan aplikasi print service (laundry app) sudah terinstall
            </p>
        </div>
    );
}

/**
 * Dialog lengkap untuk Thermal Print (dengan trigger sendiri)
 * Untuk digunakan sebagai standalone dialog
 */
export default function ThermalPrintDialog({ order, trigger }: ThermalPrintDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="default" size="sm">
                        <Zap className="w-4 h-4 mr-2" />
                        Print Thermal
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <ThermalPrintContent order={order} />
            </DialogContent>
        </Dialog>
    );
}
