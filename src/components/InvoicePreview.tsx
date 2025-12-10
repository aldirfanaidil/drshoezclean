import { useState, useRef } from "react";
import { Order } from "@/lib/store";
import { useAppStore } from "@/lib/store";
import { SERVICES, formatCurrency } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Printer, Download, MessageCircle, Copy, Bluetooth } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import defaultLogo from "@/assets/logo.png";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import BluetoothPrinterDialog from "./BluetoothPrinterDialog";

interface InvoicePreviewProps {
  order: Order;
}

type PaperSize = "58mm" | "80mm" | "a4";

export default function InvoicePreview({ order }: InvoicePreviewProps) {
  const { settings } = useAppStore();
  const { toast } = useToast();
  const [paperSize, setPaperSize] = useState<PaperSize>("80mm");
  const [isSending, setIsSending] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const styles = `
      <style>
        @page { margin: 0; padding: 0; }
        body { margin: 0; padding: 0; font-family: 'Courier New', monospace; }
        .invoice { background: white; padding: ${paperSize === "58mm" ? "2mm" : paperSize === "80mm" ? "3mm" : "10mm"}; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .text-xs { font-size: 10px; }
        .text-sm { font-size: 11px; }
        .text-base { font-size: 12px; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .border-dashed { border-style: dashed; }
        .border-t { border-top-width: 1px; }
        .border-b { border-bottom-width: 1px; }
        .py-2 { padding-top: 8px; padding-bottom: 8px; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-center { align-items: center; }
        .w-full { width: 100%; }
        .gap-2 { gap: 8px; }
        img { max-width: 60px; height: auto; }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${order.invoiceNumber}</title>
          ${styles}
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPDF = async () => {
    const element = invoiceRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");

    let pdfWidth: number;
    let pdfHeight: number;

    switch (paperSize) {
      case "58mm":
        pdfWidth = 58;
        pdfHeight = (canvas.height * 58) / canvas.width;
        break;
      case "80mm":
        pdfWidth = 80;
        pdfHeight = (canvas.height * 80) / canvas.width;
        break;
      default:
        pdfWidth = 210;
        pdfHeight = 297;
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [pdfWidth, pdfHeight],
    });

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Invoice-${order.invoiceNumber}.pdf`);
  };

  const generateInvoiceText = () => {
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

  const handleSendWhatsApp = async () => {
    setIsSending(true);
    try {
      // Format phone number for WhatsApp
      let phone = order.customerPhone.replace(/\D/g, "");
      if (phone.startsWith("0")) {
        phone = "62" + phone.slice(1);
      } else if (!phone.startsWith("62")) {
        phone = "62" + phone;
      }

      const text = generateInvoiceText();
      const encodedText = encodeURIComponent(text);
      const whatsappUrl = `https://wa.me/${phone}?text=${encodedText}`;
      
      window.open(whatsappUrl, "_blank");
      
      toast({
        title: "WhatsApp Dibuka",
        description: "Silakan kirim pesan invoice ke pelanggan",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal membuka WhatsApp",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyInvoice = async () => {
    try {
      const text = generateInvoiceText();
      await navigator.clipboard.writeText(text);
      toast({
        title: "Berhasil Disalin",
        description: "Teks invoice sudah disalin ke clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyalin teks",
        variant: "destructive",
      });
    }
  };

  const getContainerWidth = () => {
    switch (paperSize) {
      case "58mm":
        return "w-[200px]";
      case "80mm":
        return "w-[280px]";
      default:
        return "w-full";
    }
  };

  return (
    <div className="space-y-4">
      {/* Paper Size Selection */}
      <div className="no-print">
        <Label className="text-sm font-medium mb-2 block">Pilih Ukuran Kertas:</Label>
        <RadioGroup
          value={paperSize}
          onValueChange={(v: PaperSize) => setPaperSize(v)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="58mm" id="58mm" />
            <Label htmlFor="58mm" className="cursor-pointer">58mm</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="80mm" id="80mm" />
            <Label htmlFor="80mm" className="cursor-pointer">80mm</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="a4" id="a4" />
            <Label htmlFor="a4" className="cursor-pointer">A4</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Invoice Preview */}
      <div className={`${getContainerWidth()} mx-auto bg-card border rounded-lg overflow-hidden`}>
        <div
          ref={invoiceRef}
          className="invoice-container p-4 font-mono text-foreground bg-card"
          style={{ fontSize: paperSize === "58mm" ? "10px" : paperSize === "80mm" ? "11px" : "12px" }}
        >
          {/* Header */}
          <div className="text-center mb-4">
            <img src={settings.logo || defaultLogo} alt="Logo" className="w-16 h-16 mx-auto mb-2 object-contain" />
            <h2 className="font-bold text-lg">{settings.name}</h2>
            <p className="text-xs text-muted-foreground">{settings.tagline}</p>
            <p className="text-xs text-muted-foreground">{settings.phone}</p>
            <p className="text-xs text-muted-foreground">{settings.address}</p>
          </div>

          {/* Invoice Number */}
          <div className="text-center border-t border-b border-dashed py-2 mb-4">
            <p className="font-bold">INVOICE</p>
            <p className="text-xs">#{order.invoiceNumber}</p>
          </div>

          {/* Customer Info */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span>Customer:</span>
              <span className="font-medium">{order.customerName}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span>Tgl Masuk:</span>
              <span>{format(new Date(order.entryDate), "dd MMM yy", { locale: id })}</span>
            </div>
            {order.estimatedDate && (
              <div className="flex justify-between text-xs mb-1">
                <span>Tgl Estimasi:</span>
                <span>{format(new Date(order.estimatedDate), "dd MMM yy", { locale: id })}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span>Status:</span>
              <span className="font-medium capitalize">
                {order.paymentStatus === "paid" ? "Lunas" : order.paymentStatus === "unpaid" ? "Belum Bayar" : "Dibatalkan"}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="border-t border-dashed py-2 mb-2">
            {order.shoes.map((shoe, index) => (
              <div key={shoe.id} className="mb-2">
                <p className="font-medium text-xs">{shoe.brand}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {SERVICES[shoe.service as keyof typeof SERVICES]?.name || shoe.service}
                  </span>
                  <span>{formatCurrency(shoe.price)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed py-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Sub Total</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-xs mb-1">
                <span>Diskon</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-dashed pt-2 mt-2">
              <span>TOTAL</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="text-center border-t border-b border-dashed py-2 my-4">
            <p className="font-bold">
              {order.paymentStatus === "paid" ? "LUNAS" : "---BELUM BAYAR---"}
            </p>
          </div>

          {/* Payment Info */}
          <div className="text-center text-xs mb-4">
            <p className="font-bold mb-1">Pembayaran:</p>
            <p>{settings.bankName} - {settings.bankAccount}</p>
            <p>{settings.accountHolder}</p>
          </div>

          {/* QR Code for scanning */}
          <div className="text-center mb-4 border-t border-dashed pt-4">
            <p className="text-xs font-bold mb-2">Scan untuk Cek Pesanan:</p>
            <div className="flex justify-center">
              <QRCodeSVG
                value={`${window.location.origin}/tracking?invoice=${order.invoiceNumber}`}
                size={paperSize === "58mm" ? 60 : paperSize === "80mm" ? 80 : 100}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{order.invoiceNumber}</p>
          </div>

          {/* Terms */}
          <div className="text-center text-xs text-muted-foreground mb-4 border-t border-dashed pt-2">
            <p className="font-bold mb-1">Syarat & Ketentuan:</p>
            <p className="mb-1">Segala bentuk kerusakan akibat pencucian sepatu bukan tanggung jawab dari tim dr.shoezclean.</p>
            <p>Perlu diketahui bahwa tidak semua noda/kotoran di sepatu dapat hilang dengan sempurna.</p>
          </div>

          {/* Footer */}
          <div className="text-center border-t border-dashed pt-2">
            <p className="font-bold text-sm">Terimakasih telah menggunakan jasa kami!</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 no-print">
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="w-4 h-4 mr-2" /> Cetak
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSendWhatsApp} 
            variant="secondary" 
            className="flex-1 bg-[#25D366] hover:bg-[#20BD5A] text-white"
            disabled={isSending}
          >
            <MessageCircle className="w-4 h-4 mr-2" /> WA
          </Button>
          <Button 
            onClick={handleCopyInvoice} 
            variant="outline" 
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" /> Salin
          </Button>
          <BluetoothPrinterDialog 
            order={order}
            trigger={
              <Button variant="outline" className="flex-1">
                <Bluetooth className="w-4 h-4 mr-2" /> BT
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}
