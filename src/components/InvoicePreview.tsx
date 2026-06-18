import { useState, useRef } from "react";
import { Order } from "@/lib/store";
import { useAppStore } from "@/lib/store";
import { SERVICES, formatCurrency } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Printer, Download, MessageCircle, Copy, Bluetooth, Store, User, Share2 } from "lucide-react";
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
type InvoiceType = "customer" | "store";

export default function InvoicePreview({ order }: InvoicePreviewProps) {
  const { settings } = useAppStore();
  const { toast } = useToast();
  const [paperSize, setPaperSize] = useState<PaperSize>("80mm");
  const [isSending, setIsSending] = useState(false);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("customer");
  const invoiceRef = useRef<HTMLDivElement>(null);
  const storeInvoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = async (type: InvoiceType = "customer") => {
    const printContent = type === "store" ? storeInvoiceRef.current : invoiceRef.current;
    if (!printContent) return;

    // Check if on mobile/Android
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      // Mobile: Use Laundry Scheme directly (bypasses System Print Dialog)

      // Option 1: Print as Text (Faster, clearer)
      const text = generateInvoiceText();
      const esc = '\x1b@' + text + '\n\n\n';
      const base64Data = btoa(esc);

      const url = `laundry://print?data=${encodeURIComponent(base64Data)}`;

      // Invisible Iframe Technique (Anti about:blank)
      const iframe = document.createElement("iframe");
      iframe.setAttribute("src", url);
      iframe.style.display = "none";
      document.body.appendChild(iframe);

      toast({
        title: "Mencetak...",
        description: "Mengirim data ke aplikasi printer",
      });

      // Clean up
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);

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
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { 
          margin: 0; 
          padding: 3px; 
          font-family: 'Open Sans', Arial, Helvetica, sans-serif; 
          font-size: ${paperSize === "58mm" ? "11pt" : "12pt"}; 
          color: #000; 
          font-weight: 500;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        .invoice-container { padding: 3px; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700 !important; }
        .font-medium { font-weight: 600; }
        .mb-1 { margin-bottom: 2px; }
        .mb-2 { margin-bottom: 3px; }
        .py-1 { padding: 3px 0; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .justify-center { justify-content: center; }
        .items-center { align-items: center; }
        .w-full { width: 100%; }
        img { max-width: ${paperSize === "58mm" ? "60px" : "70px"}; height: auto; display: block; margin: 0 auto 3px; }
        .text-muted-foreground { color: #222; font-weight: 500; }
        .capitalize { text-transform: capitalize; }
        p, span, div { color: #000; line-height: 1.4; font-weight: 500; }
        h2 { font-weight: 700; }
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
      // Determine the specific service type name (e.g., ganti_sol, lem, jahit) if available
      let typeLabel = "";
      if (shoe.service && shoe.serviceType) {
        const serviceObj = SERVICES[shoe.service as keyof typeof SERVICES] as any;
        typeLabel = serviceObj?.types?.[shoe.serviceType as any]?.name || shoe.serviceType;
      } else if (shoe.service) {
        typeLabel = SERVICES[shoe.service as keyof typeof SERVICES]?.name || shoe.service;
      }
      shoesText += `\n${index + 1}. ${shoe.brand}\n   ${typeLabel} - ${formatCurrency(shoe.price)}`;
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

  const handleSharePDF = async () => {
    const element = invoiceRef.current;
    if (!element) return;

    setIsSending(true);
    try {
      // Generate canvas from invoice
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");

      // Calculate PDF dimensions based on paper size
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

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      // Convert PDF to Blob
      const pdfBlob = pdf.output("blob");
      const pdfFile = new File([pdfBlob], `Invoice-${order.invoiceNumber}.pdf`, { type: "application/pdf" });

      // Check if Web Share API is supported and can share files
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Invoice ${order.invoiceNumber}`,
          text: `Invoice ${order.invoiceNumber} - ${order.customerName}`,
        });
        toast({
          title: "Berhasil",
          description: "Pilih WhatsApp untuk mengirim PDF",
        });
      } else {
        // Fallback: download PDF and show instructions
        pdf.save(`Invoice-${order.invoiceNumber}.pdf`);
        toast({
          title: "PDF Terunduh",
          description: "Share PDF tidak didukung. PDF sudah didownload, silakan kirim secara manual.",
          variant: "default",
        });
      }
    } catch (error: any) {
      // User cancelled share or error occurred
      if (error.name !== "AbortError") {
        toast({
          title: "Error",
          description: "Gagal membagikan PDF",
          variant: "destructive",
        });
      }
    } finally {
      setIsSending(false);
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

  // Store Invoice Content - Simplified version
  const StoreInvoiceContent = () => (
    <div
      ref={storeInvoiceRef}
      className="invoice-container text-foreground bg-card"
      style={{
        fontFamily: "'Open Sans', Arial, Helvetica, sans-serif",
        fontSize: paperSize === "58mm" ? "15px" : paperSize === "80mm" ? "16px" : "17px",
        padding: paperSize === "58mm" ? "5px" : "10px",
        lineHeight: 1.4,
        fontWeight: 500
      }}
    >
      {/* Header */}
      <div className="text-center" style={{ marginBottom: paperSize === "58mm" ? "5px" : "10px" }}>
        <img
          src={settings.logo || defaultLogo}
          alt="Logo"
          className="mx-auto object-contain"
          style={{
            width: paperSize === "58mm" ? "50px" : "60px",
            height: paperSize === "58mm" ? "50px" : "60px",
            marginBottom: "5px"
          }}
        />
        <h2 className="font-bold" style={{ fontSize: paperSize === "58mm" ? "16px" : "18px", marginBottom: "3px" }}>{settings.name}</h2>
      </div>

      {/* Invoice Number */}
      <div className="text-center" style={{ padding: "3px 0", margin: "3px 0" }}>
        <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "14px" : "16px", letterSpacing: "1px" }}>INVOICE TOKO</p>
        <p style={{ fontSize: paperSize === "58mm" ? "14px" : "15px" }}>#{order.invoiceNumber}</p>
      </div>

      {/* Separator */}
      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

      {/* Customer Name */}
      <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px", marginBottom: "5px" }}>
        <span className="font-bold">Customer:</span>
        <span className="font-medium">{order.customerName}</span>
      </div>

      {/* Date */}
      <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px", marginBottom: "5px" }}>
        <span className="font-bold">Tanggal:</span>
        <span>{format(new Date(order.entryDate), "dd MMM yyyy", { locale: id })}</span>
      </div>

      {/* Number of items */}
      <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px", marginBottom: "5px" }}>
        <span className="font-bold">Jumlah Item:</span>
        <span>{order.shoes.length} sepatu</span>
      </div>

      {/* Separator */}
      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>
      <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }}></div>

      {/* Total */}
      <div className="flex justify-between font-bold" style={{ fontSize: paperSize === "58mm" ? "18px" : "20px", margin: "8px 0" }}>
        <span>TOTAL</span>
        <span>{formatCurrency(order.total)}</span>
      </div>

      {/* Payment Status */}
      <div className="text-center" style={{ margin: "6px 0" }}>
        <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "16px" : "18px" }}>
          {order.paymentStatus === "paid" ? "-----LUNAS-----" : "-----BELUM BAYAR-----"}
        </p>
      </div>

      {/* Separator */}
      <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

      {/* QR Code */}
      <div className="text-center" style={{ marginBottom: "5px" }}>
        <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px", marginBottom: "5px" }}>Scan:</p>
        <div className="flex justify-center">
          <QRCodeSVG
            value={order.invoiceNumber}
            size={paperSize === "58mm" ? 60 : paperSize === "80mm" ? 70 : 85}
            level="M"
            includeMargin={false}
          />
        </div>
        <p className="text-muted-foreground" style={{ fontSize: paperSize === "58mm" ? "12px" : "13px", marginTop: "4px" }}>{order.invoiceNumber}</p>
      </div>
    </div>
  );

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

      {/* Invoice Type Selection */}
      <div className="no-print">
        <Label className="text-sm font-medium mb-2 block">Tipe Invoice:</Label>
        <RadioGroup
          value={invoiceType}
          onValueChange={(v: InvoiceType) => setInvoiceType(v)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="customer" id="customer-type" />
            <Label htmlFor="customer-type" className="cursor-pointer flex items-center gap-1">
              <User className="w-4 h-4" /> Customer (Lengkap)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="store" id="store-type" />
            <Label htmlFor="store-type" className="cursor-pointer flex items-center gap-1">
              <Store className="w-4 h-4" /> Toko (Ringkas)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Invoice Preview - Customer Full Version */}
      {invoiceType === "customer" && (
        <div className={`${getContainerWidth()} mx-auto bg-card border rounded-lg overflow-hidden`}>
          <div
            ref={invoiceRef}
            className="invoice-container text-foreground bg-card"
            style={{
              fontFamily: "'Open Sans', Arial, Helvetica, sans-serif",
              fontSize: paperSize === "58mm" ? "15px" : paperSize === "80mm" ? "16px" : "17px",
              padding: paperSize === "58mm" ? "5px" : "10px",
              lineHeight: 1.4,
              fontWeight: 500
            }}
          >
            {/* Header */}
            <div className="text-center" style={{ marginBottom: paperSize === "58mm" ? "5px" : "10px" }}>
              <img
                src={settings.logo || defaultLogo}
                alt="Logo"
                className="mx-auto object-contain"
                style={{
                  width: paperSize === "58mm" ? "65px" : "80px",
                  height: paperSize === "58mm" ? "65px" : "80px",
                  marginBottom: "5px"
                }}
              />
              <h2 className="font-bold" style={{ fontSize: paperSize === "58mm" ? "17px" : "19px", marginBottom: "3px" }}>{settings.name}</h2>
              <p className="text-muted-foreground" style={{ fontSize: paperSize === "58mm" ? "14px" : "15px" }}>{settings.tagline}</p>
              <p className="text-muted-foreground" style={{ fontSize: paperSize === "58mm" ? "14px" : "15px" }}>{settings.phone}</p>
              <p className="text-muted-foreground" style={{ fontSize: paperSize === "58mm" ? "14px" : "15px" }}>{settings.address}</p>
            </div>

            {/* Invoice Number - NO border */}
            <div className="text-center" style={{ padding: "5px 0", margin: "5px 0" }}>
              <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "20px" : "22px", letterSpacing: "1px" }}>INVOICE</p>
              <p style={{ fontSize: paperSize === "58mm" ? "15px" : "16px" }}>#{order.invoiceNumber}</p>
            </div>

            {/* Customer Info - NO border */}
            <div style={{ marginBottom: "5px" }}>
              <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px", marginBottom: "3px" }}>Bill To:</p>
              <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px", marginBottom: "3px" }}>
                <span>Customer:</span>
                <span className="font-medium">{order.customerName}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px", marginBottom: "3px" }}>
                <span>Tgl Masuk:</span>
                <span>{format(new Date(order.entryDate), "dd MMM yy", { locale: id })}</span>
              </div>
              {order.estimatedDate && (
                <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px", marginBottom: "3px" }}>
                  <span>Estimasi:</span>
                  <span>{format(new Date(order.estimatedDate), "dd MMM yy", { locale: id })}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px" }}>
                <span>Status:</span>
                <span className="font-medium capitalize">
                  {order.paymentStatus === "paid" ? "Lunas" : order.paymentStatus === "unpaid" ? "Belum Bayar" : "Batal"}
                </span>
              </div>
            </div>

            {/* Separator after Status */}
            <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

            {/* Items - NO border, separator at end */}
            <div style={{ marginBottom: "4px" }}>
              <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px", marginBottom: "4px" }}>Detail Item:</p>
              {order.shoes.map((shoe) => (
                <div key={shoe.id} style={{ marginBottom: "4px" }}>
                  <p className="font-medium" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px" }}>{shoe.brand}</p>
                  <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "14px" : "15px" }}>
                    <span className="text-muted-foreground">
                      {
  (() => {
    if (shoe.service && shoe.serviceType) {
      const srv = SERVICES[shoe.service as keyof typeof SERVICES] as any;
      return srv?.types?.[shoe.serviceType as any]?.name || shoe.serviceType;
    }
    return SERVICES[shoe.service as keyof typeof SERVICES]?.name || shoe.service;
  })()
}
                    </span>
                    <span>{formatCurrency(shoe.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Separator after Items */}
            <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

            {/* Totals */}
            <div style={{ marginBottom: "4px" }}>
              <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px", marginBottom: "3px" }}>
                <span>Sub Total</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px", marginBottom: "3px" }}>
                  <span>Diskon</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
            </div>

            {/* Double Separator after Subtotal */}
            <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }}></div>
            <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }}></div>

            {/* Total */}
            <div className="flex justify-between font-bold" style={{ fontSize: paperSize === "58mm" ? "16px" : "18px", margin: "5px 0" }}>
              <span>TOTAL</span>
              <span>{formatCurrency(order.total)}</span>
            </div>

            {/* Payment Status with ----- */}
            <div className="text-center" style={{ margin: "6px 0" }}>
              <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "16px" : "18px" }}>
                {order.paymentStatus === "paid" ? "-----LUNAS-----" : "-----BELUM BAYAR-----"}
              </p>
            </div>

            {/* Payment Info - NO border */}
            <div className="text-center" style={{ fontSize: paperSize === "58mm" ? "14px" : "15px", marginBottom: "5px" }}>
              <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px", marginBottom: "3px" }}>Pembayaran:</p>
              <p>{settings.bankName} - {settings.bankAccount}</p>
              <p>{settings.accountHolder}</p>
            </div>

            {/* QR Code for scanning - NO border */}
            <div className="text-center" style={{ marginBottom: "5px" }}>
              <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "14px" : "15px", marginBottom: "5px" }}>Scan Cek Pesanan:</p>
              <div className="flex justify-center">
                <QRCodeSVG
                  value={order.invoiceNumber}
                  size={paperSize === "58mm" ? 65 : paperSize === "80mm" ? 80 : 95}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-muted-foreground" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px", marginTop: "4px" }}>{order.invoiceNumber}</p>
            </div>

            {/* Terms - NO border */}
            <div className="text-center text-muted-foreground" style={{ fontSize: paperSize === "58mm" ? "13px" : "14px", marginBottom: "5px" }}>
              <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "14px" : "15px", marginBottom: "3px" }}>S&K:</p>
              <p style={{ marginBottom: "3px" }}>Kerusakan akibat pencucian bukan tanggung jawab kami.</p>
              <p>Tidak semua noda dapat hilang sempurna.</p>
            </div>

            {/* Separator before Footer */}
            <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>

            {/* Footer */}
            <div className="text-center" style={{ paddingTop: "4px" }}>
              <p className="font-bold" style={{ fontSize: paperSize === "58mm" ? "15px" : "16px" }}>Terima kasih!</p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview - Store Simplified Version */}
      {invoiceType === "store" && (
        <div className={`${getContainerWidth()} mx-auto bg-card border rounded-lg overflow-hidden`}>
          <StoreInvoiceContent />
        </div>
      )}

      {/* Hidden Store Invoice for Printing (when viewing customer but want to print store) */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <StoreInvoiceContent />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 no-print">
        {/* Print Buttons - Two separate buttons */}
        <div className="flex gap-2">
          <Button onClick={() => handlePrint("customer")} className="flex-1" variant={invoiceType === "customer" ? "default" : "outline"}>
            <User className="w-4 h-4 mr-2" /> Cetak Customer
          </Button>
          <Button onClick={() => handlePrint("store")} className="flex-1" variant={invoiceType === "store" ? "default" : "outline"}>
            <Store className="w-4 h-4 mr-2" /> Cetak Toko
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button
            onClick={handleSendWhatsApp}
            variant="secondary"
            className="flex-1 bg-[#25D366] hover:bg-[#20BD5A] text-white"
            disabled={isSending}
          >
            <MessageCircle className="w-4 h-4 mr-2" /> WA Text
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSharePDF}
            variant="secondary"
            className="flex-1 bg-[#25D366] hover:bg-[#20BD5A] text-white"
            disabled={isSending}
          >
            <Share2 className="w-4 h-4 mr-2" /> WA PDF
          </Button>
          <Button
            onClick={handleCopyInvoice}
            variant="outline"
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" /> Salin
          </Button>
        </div>
        <div className="flex gap-2">
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
