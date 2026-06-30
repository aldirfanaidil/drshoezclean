import { Order } from "@/lib/store";
import { SERVICES } from "@/lib/constants";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import { Capacitor, registerPlugin } from '@capacitor/core';

// Manual plugin registration for our Custom SmartPrinter (defined in Android)
const SmartPrinter = registerPlugin<any>('SmartPrinter');

interface PrintSettings {
    name: string;
    tagline?: string;
    phone?: string;
    address?: string;
    bankName?: string;
    bankAccount?: string;
    accountHolder?: string;
    logo?: string;
    thermalTerms?: string;
}

const RECEIPT_WIDTH = 32; // 58mm printer = 32 karakter
// ... (existing code helpers)

/**
 * Print via Custom SmartPrinter Plugin (Chunked)
 */
async function printViaPlugin(bytes: Uint8Array, address: string): Promise<boolean> {
    try {
        const base64Data = uint8ArrayToBase64(bytes);
        // Call our Custom Native Plugin which handles Chunking (400 bytes / 50ms)
        await SmartPrinter.print({
            address: address,
            content: base64Data
        });
        return true;
    } catch (e) {
        console.warn('SmartPrinter plugin print failed:', e);
        return false;
    }
}

/**
 * Format currency tanpa karakter khusus (ASCII only)
 */
function formatRupiah(amount: number): string {
    const formatted = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'Rp ' + formatted;
}

/**
 * Format baris dengan label kiri dan value kanan
 */
function formatRow(label: string, value: string, width: number = RECEIPT_WIDTH): string {
    const spaces = width - label.length - value.length;
    if (spaces > 0) {
        return label + ' '.repeat(spaces) + value;
    }
    return label + ' ' + value;
}

/**
 * Convert Uint8Array to Base64
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Load image sebagai HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image: ' + src));
        img.src = src;
    });
}

/**
 * Generate invoice dengan Logo dan QR Code
 */
export async function generateCustomerInvoiceWithEncoder(
    order: Order,
    settings: PrintSettings,
    logoImg?: HTMLImageElement
): Promise<Uint8Array> {

    const encoder = new ReceiptPrinterEncoder({
        language: 'esc-pos',
        width: RECEIPT_WIDTH,
    });

    encoder.initialize();

    // ===== LOGO (dengan spacing 10px/1 line) =====
    if (logoImg) {
        try {
            encoder
                .align('center')
                .image(logoImg, 250, 250, 'threshold', 128);
        } catch (e) {
            console.warn('Failed to encode logo:', e);
        }
    }

    // ===== HEADER (centered) =====
    encoder
        .align('center')
        .bold(true)
        .width(2)
        .height(2)
        .line(settings.name)
        .width(1)
        .height(1)
        .bold(false);

    if (settings.tagline) encoder.line(settings.tagline);
    if (settings.phone) encoder.line(settings.phone);
    if (settings.address) encoder.line(settings.address);

    // ===== INVOICE TITLE (centered) =====
    encoder
        .line('================================')
        .bold(true)
        .height(2)
        .line('INVOICE')
        .height(1)
        .bold(false)
        .line('#' + order.invoiceNumber)
        .line('================================');

    // ===== CUSTOMER INFO (label kiri, value kanan) =====
    encoder
        .align('left')
        .bold(true)
        .line('Bill To:')
        .bold(false)
        .line(formatRow('Customer', order.customerName))
        .line(formatRow('Tgl Masuk', format(new Date(order.entryDate), "dd MMM yyyy", { locale: id })));

    if (order.estimatedDate) {
        encoder.line(formatRow('Estimasi', format(new Date(order.estimatedDate), "dd MMM yyyy", { locale: id })));
    }

    const statusText = order.paymentStatus === 'paid' ? 'Lunas' :
        order.paymentStatus === 'unpaid' ? 'Belum Bayar' : 'Batal';
    encoder.line(formatRow('Status', statusText));

    encoder.line('--------------------------------');

    // ===== ITEMS (harga rata kanan) =====
    encoder.bold(true).line('Detail Item:').bold(false);

    order.shoes.forEach((shoe, index) => {
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
        const priceStr = formatRupiah(shoe.price);

        encoder
            .bold(true)
            .line((index + 1) + '. ' + shoe.brand)
            .bold(false)
            .line('   ' + typeLabel)
            .line(formatRow('', priceStr)); // Harga rata kanan dengan padding
    });

    encoder.line('--------------------------------');

    // ===== TOTALS (rata kanan) =====
    encoder.line(formatRow('Sub Total', formatRupiah(order.subtotal)));

    if (order.discount > 0) {
        encoder.line(formatRow('Diskon', '-' + formatRupiah(order.discount)));
    }

    encoder.line('================================');

    encoder
        .bold(true)
        .height(2)
        .line(formatRow('TOTAL', formatRupiah(order.total)))
        .height(1)
        .bold(false)
        .line('================================');

    // ===== PAYMENT STATUS (centered dengan dashes) =====
    encoder
        .align('center')
        .bold(true)
        .line(order.paymentStatus === 'paid' ? '-----LUNAS-----' : '-----BELUM BAYAR-----')
        .bold(false);

    // ===== PAYMENT INFO (centered) =====
    if (settings.bankName && settings.bankAccount) {
        encoder
            .newline()
            .bold(true)
            .line('Pembayaran:')
            .bold(false)
            .line(settings.bankName + ' - ' + settings.bankAccount);
        if (settings.accountHolder) {
            encoder.line(settings.accountHolder);
        }
    }

    // ===== QR CODE (centered) =====
    encoder
        .newline()
        .line('Scan Cek Pesanan:');

    try {
        encoder.qrcode(order.invoiceNumber, 1, 5, 'l');
    } catch (e) {
        console.warn('QR code encoding failed:', e);
        encoder.line('[QR: ' + order.invoiceNumber + ']');
    }

    encoder.line(order.invoiceNumber);

    // ===== TERMS (centered) =====
    const terms = settings.thermalTerms ||
        'Kerusakan akibat pencucian bukan tanggung jawab kami. Tidak semua noda dapat hilang sempurna.';

    encoder
        .newline()
        .bold(true)
        .line('S&K:')
        .bold(false);

    // Split terms menjadi baris pendek (centered)
    const words = terms.split(' ');
    let currentLine = '';
    words.forEach(word => {
        if ((currentLine + ' ' + word).trim().length <= RECEIPT_WIDTH) {
            currentLine = (currentLine + ' ' + word).trim();
        } else {
            if (currentLine) encoder.line(currentLine);
            currentLine = word;
        }
    });
    if (currentLine) encoder.line(currentLine);

    encoder.line('--------------------------------');

    // ===== FOOTER (centered) =====
    encoder
        .bold(true)
        .line('Terima kasih!')
        .bold(false)
        .newline()
        .newline()
        .cut();

    return encoder.encode();
}

/**
 * Generate Store Invoice (Ringkas)
 */
export async function generateStoreInvoiceWithEncoder(
    order: Order,
    settings: PrintSettings,
    logoImg?: HTMLImageElement
): Promise<Uint8Array> {

    const encoder = new ReceiptPrinterEncoder({
        language: 'esc-pos',
        width: RECEIPT_WIDTH,
    });

    encoder.initialize();

    // ===== LOGO =====
    if (logoImg) {
        try {
            encoder
                .align('center')
                .image(logoImg, 250, 250, 'threshold', 128);
        } catch (e) {
            console.warn('Failed to encode logo:', e);
        }
    }

    // ===== HEADER =====
    encoder
        .align('center')
        .bold(true)
        .width(2)
        .height(2)
        .line(settings.name)
        .width(1)
        .height(1)
        .bold(false);

    // ===== INVOICE TITLE =====
    encoder
        .line('================================')
        .bold(true)
        .line('INVOICE TOKO')
        .bold(false)
        .line('#' + order.invoiceNumber)
        .line('================================');

    // ===== BASIC INFO =====
    encoder
        .align('left')
        .line(formatRow('Customer', order.customerName))
        .line(formatRow('Tanggal', format(new Date(order.entryDate), "dd MMM yyyy", { locale: id })))
        .line(formatRow('Jumlah', order.shoes.length + ' sepatu'))
        .line('================================');

    // ===== TOTAL =====
    encoder
        .bold(true)
        .height(2)
        .line(formatRow('TOTAL', formatRupiah(order.total)))
        .height(1)
        .bold(false);

    // ===== PAYMENT STATUS (centered dengan dashes) =====
    encoder
        .align('center')
        .newline()
        .bold(true)
        .line(order.paymentStatus === 'paid' ? '-----LUNAS-----' : '-----BELUM BAYAR-----')
        .bold(false)
        .line('--------------------------------');

    // ===== QR CODE =====
    encoder.line('Scan:');

    try {
        encoder.qrcode(order.invoiceNumber, 1, 4, 'l');
    } catch (e) {
        console.warn('QR code encoding failed:', e);
    }

    encoder
        .newline()
        .newline()
        .cut();

    return encoder.encode();
}

/**
 * Print via laundry:// URL scheme
 */
export function printViaLaundryScheme(bytes: Uint8Array): void {
    const base64Data = uint8ArrayToBase64(bytes);

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `laundry://print?data=${encodeURIComponent(base64Data)}`;
    document.body.appendChild(iframe);

    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 1000);
}



/**
 * Print Customer Invoice
 */
export async function printCustomerInvoice(order: Order, settings: PrintSettings): Promise<void> {
    let logoImg: HTMLImageElement | undefined;

    // Load logo based on strategy
    const savedAddress = localStorage.getItem('savedPrinterAddress');
    const isPluginAvailable = isLaundryPrintAvailable() && !!savedAddress;

    // Only load logo if using Plugin, OR if not on Android (e.g. PC testing)
    // For Android fallback (URL scheme), we DISABLE logo to prevent MP-58C buffer overflow
    if (settings.logo && (isPluginAvailable || !Capacitor.isNativePlatform())) {
        try {
            logoImg = await loadImage(settings.logo);
        } catch (e) {
            console.warn('Failed to load logo:', e);
        }
    }

    // 1. Try Plugin First
    if (isPluginAvailable && savedAddress && logoImg) { // With Logo
        const bytes = await generateCustomerInvoiceWithEncoder(order, settings, logoImg);
        const success = await printViaPlugin(bytes, savedAddress);
        if (success) return;
    }

    // 2. Fallback to URL Scheme (Formatted for Safety - NO LOGO on Native Android)
    const bytes = await generateCustomerInvoiceWithEncoder(order, settings, isPluginAvailable ? undefined : logoImg);
    printViaLaundryScheme(bytes);
}

/**
 * Print Store Invoice
 */
export async function printStoreInvoice(order: Order, settings: PrintSettings): Promise<void> {
    let logoImg: HTMLImageElement | undefined;

    const savedAddress = localStorage.getItem('savedPrinterAddress');
    const isPluginAvailable = isLaundryPrintAvailable() && !!savedAddress;

    if (settings.logo && (isPluginAvailable || !Capacitor.isNativePlatform())) {
        try {
            logoImg = await loadImage(settings.logo);
        } catch (e) {
            console.warn('Failed to load logo:', e);
        }
    }

    // 1. Try Plugin First
    if (isPluginAvailable && savedAddress && logoImg) {
        const bytes = await generateStoreInvoiceWithEncoder(order, settings, logoImg);
        const success = await printViaPlugin(bytes, savedAddress);
        if (success) return;
    }

    // 2. Fallback
    const bytes = await generateStoreInvoiceWithEncoder(order, settings, isPluginAvailable ? undefined : logoImg);
    printViaLaundryScheme(bytes);
}

/**
 * Check if print service available
 */
export function isLaundryPrintAvailable(): boolean {
    // Prioritize Capacitor platform check
    if (Capacitor.isNativePlatform()) {
        return Capacitor.getPlatform() === 'android';
    }

    // Fallback to User Agent
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.includes('android');
    const isIOS = /iphone|ipad|ipod/.test(ua);
    return isAndroid && !isIOS;
}

// Legacy export
export function printViaLaundryService(order: Order, settings: PrintSettings): void {
    printCustomerInvoice(order, settings);
}
