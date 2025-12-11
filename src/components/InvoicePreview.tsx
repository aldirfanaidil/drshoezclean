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

  const handlePrint = async () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    // Check if on mobile/Android
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      // On mobile, open in new window for ESC/POS printer apps
      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Tidak dapat membuka preview. Izinkan popup browser.",
          variant: "destructive",
        });
        return;
      }

      const styles = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
          @page { margin: 0; size: ${paperSize === "58mm" ? "58mm auto" : paperSize === "80mm" ? "80mm auto" : "A4"}; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Open Sans', 'Roboto', Arial, Helvetica, sans-serif; font-size: ${paperSize === "58mm" ? "9px" : "10px"}; background: #fff; color: #000; font-weight: 400; margin: 0; padding: 2px; }
          .invoice-container { padding: 2px; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700 !important; }
          .separator { border-bottom: 1px dashed #000 !important; margin: 2px 0; padding-bottom: 2px; }
          .separator-top { border-top: 1px dashed #000 !important; margin-top: 2px; padding-top: 2px; }
          .mb-1 { margin-bottom: 1px; }
          .mb-2 { margin-bottom: 2px; }
          .py-1 { padding: 2px 0; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          img { max-width: ${paperSize === "58mm" ? "55px" : "65px"}; height: auto; display: block; margin: 0 auto 2px; }
          .text-muted-foreground { color: #333; }
          .font-medium { font-weight: 600; }
          p, span, div { color: #000; line-height: 1.2; }
        </style>
      `;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice ${order.invoiceNumber}</title>
            ${styles}
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              window.onload = function() {
                setTimeout(function() { window.print(); }, 300);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      return;
    }

    // Desktop: Use iframe for printing (more reliable than window.open)
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.top = "-10000px";
    printFrame.style.left = "-10000px";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!frameDoc) {
      document.body.removeChild(printFrame);
      toast({
        title: "Error",
        description: "Tidak dapat mencetak. Gunakan tombol PDF.",
        variant: "destructive",
      });
      return;
    }

    const styles = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
        @page { margin: 0; padding: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; padding: 2px; font-family: 'Open Sans', 'Roboto', Arial, Helvetica, sans-serif; font-size: ${paperSize === "58mm" ? "9px" : "10px"}; color: #000; font-weight: 400; }
        .invoice-container { padding: 2px; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700 !important; }
        .separator { border-bottom: 1px dashed #000 !important; margin: 2px 0; padding-bottom: 2px; }
        .separator-top { border-top: 1px dashed #000 !important; margin-top: 2px; padding-top: 2px; }
        .mb-1 { margin-bottom: 1px; }
        .mb-2 { margin-bottom: 2px; }
        .py-1 { padding: 2px 0; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .justify-center { justify-content: center; }
        .items-center { align-items: center; }
        .w-full { width: 100%; }
        img { max-width: ${paperSize === "58mm" ? "55px" : "65px"}; height: auto; display: block; margin: 0 auto 2px; }
        .text-muted-foreground { color: #333; }
        .font-medium { font-weight: 600; }
        .capitalize { text-transform: capitalize; }
        p, span, div { color: #000; line-height: 1.2; }
      </style>
    `;

    frameDoc.open();
    frameDoc.write(`
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
    frameDoc.close();

    // Wait for content to load then print
    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (e) {
        console.error("Print error:", e);
      }
      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    };
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
          className="invoice-container text-foreground bg-card"
          style={{
            fontFamily: "'Open Sans', 'Roboto', Arial, Helvetica, sans-serif",
            fontSize: paperSize === "58mm" ? "13px" : paperSize === "80mm" ? "14px" : "15px",
            padding: paperSize === "58mm" ? "4px" : "8px",
            lineHeight: 1.35
          }}
        >
          {/* Header */}
          <div className="text-center" style={{ marginBottom: paperSize === "58mm" ? "4px" : "8px" }}>
            <img
              src={settings.logo || defaultLogo}
              alt="Logo"
              className="mx-auto object-contain"
              style={{
                width: paperSize === "58mm" ? "60px" : "75px",
                height: paperSize === "58mm" ? "60px" : "75px",
                marginBottom: "4px"
              }}
            />
            <h2 className="font-bold" style={{ fontSize: paperSize === "58mm" ? "15px" : "17px", marginBottom: "2px" }}>{settings.name}</h2>
            <p className="text-muted-foreground" style={{ fontSize: paperSize === "58mm" ? "12px" : "13px" }}>{settings.tagline}</p>
            <p className="text-muted-foreground" style={{ fontSize: paperSize === "58mm" ? "12px" : "13px" }}>{settings.phone}</p>
            <p className="text-muted-foreground" style={{ fontSize: paperSize === "58mm" ? "12px" : "13px" }}>{settings.address}</p>
          </div>

          {/* Invoice Number - NO border */}
          <div className="text-center" style={{ padding: "4px 0", margin: "4px 0" }}>
            <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "18px" : "20px", letterSpacing: "1px" }}>INVOICE</p>
            <p style={{ fontSize: paperSize === "58mm" ? "13px" : "14px" }}>#{order.invoiceNumber}</p>
          </div>

          {/* Customer Info - NO border */}
          <div style={{ marginBottom: "4px" }}>
            <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px", marginBottom: "2px" }}>Bill To:</p>
            <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px", marginBottom: "2px" }}>
              <span>Customer:</span>
              <span className="font-medium">{order.customerName}</span>
            </div>
            <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px", marginBottom: "2px" }}>
              <span>Tgl Masuk:</span>
              <span>{format(new Date(order.entryDate), "dd MMM yy", { locale: id })}</span>
            </div>
            {order.estimatedDate && (
              <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px", marginBottom: "2px" }}>
                <span>Estimasi:</span>
                <span>{format(new Date(order.estimatedDate), "dd MMM yy", { locale: id })}</span>
              </div>
            )}
            <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px" }}>
              <span>Status:</span>
              <span className="font-medium capitalize">
                {order.paymentStatus === "paid" ? "Lunas" : order.paymentStatus === "unpaid" ? "Belum Bayar" : "Batal"}
              </span>
            </div>
          </div>

          {/* Separator after Status */}
          <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }}></div>

          {/* Items - NO border, separator at end */}
          <div style={{ marginBottom: "3px" }}>
            <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px", marginBottom: "3px" }}>Detail Item:</p>
            {order.shoes.map((shoe) => (
              <div key={shoe.id} style={{ marginBottom: "3px" }}>
                <p className="font-medium" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px" }}>{shoe.brand}</p>
                <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "12px" : "13px" }}>
                  <span className="text-muted-foreground">
                    {SERVICES[shoe.service as keyof typeof SERVICES]?.name || shoe.service}
                  </span>
                  <span>{formatCurrency(shoe.price)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Separator after Items */}
          <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }}></div>

          {/* Totals */}
          <div style={{ marginBottom: "3px" }}>
            <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px", marginBottom: "2px" }}>
              <span>Sub Total</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px", marginBottom: "2px" }}>
                <span>Diskon</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
          </div>

          {/* Double Separator after Subtotal */}
          <div style={{ borderBottom: "1px dashed #000", margin: "3px 0" }}></div>
          <div style={{ borderBottom: "1px dashed #000", margin: "3px 0" }}></div>

          {/* Total */}
          <div className="flex justify-between font-bold" style={{ fontSize: paperSize === "58mm" ? "14px" : "16px", margin: "4px 0" }}>
            <span>TOTAL</span>
            <span>{formatCurrency(order.total)}</span>
          </div>

          {/* Payment Status with ----- */}
          <div className="text-center" style={{ margin: "5px 0" }}>
            <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "14px" : "16px" }}>
              {order.paymentStatus === "paid" ? "-----LUNAS-----" : "-----BELUM BAYAR-----"}
            </p>
          </div>

          {/* Payment Info - NO border */}
          <div className="text-center" style={{ fontSize: paperSize === "58mm" ? "12px" : "13px", marginBottom: "4px" }}>
            <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px", marginBottom: "2px" }}>Pembayaran:</p>
            <p>{settings.bankName} - {settings.bankAccount}</p>
            <p>{settings.accountHolder}</p>
          </div>

          {/* QR Code for scanning - NO border */}
          <div className="text-center" style={{ marginBottom: "4px" }}>
            <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "12px" : "13px", marginBottom: "4px" }}>Scan Cek Pesanan:</p>
            <div className="flex justify-center">
              <QRCodeSVG
                value={order.invoiceNumber}
                size={paperSize === "58mm" ? 60 : paperSize === "80mm" ? 75 : 90}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-muted-foreground" style={{ fontSize: paperSize === "58mm" ? "11px" : "12px", marginTop: "3px" }}>{order.invoiceNumber}</p>
          </div>

          {/* Terms - NO border */}
          <div className="text-center text-muted-foreground" style={{ fontSize: paperSize === "58mm" ? "11px" : "12px", marginBottom: "4px" }}>
            <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "12px" : "13px", marginBottom: "2px" }}>S&K:</p>
            <p style={{ marginBottom: "2px" }}>Kerusakan akibat pencucian bukan tanggung jawab kami.</p>
            <p>Tidak semua noda dapat hilang sempurna.</p>
          </div>

          {/* Separator before Footer */}
          <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }}></div>

          {/* Footer */}
          <div className="text-center" style={{ paddingTop: "3px" }}>
            <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px" }}>Terima kasih!</p>
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
