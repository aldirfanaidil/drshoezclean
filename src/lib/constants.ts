// Service types and pricing
export const SERVICES = {
  DEEP_CLEAN_EXPRESS: {
    name: "Deep Clean Express",
    duration: "1 hari",
    types: {
      silver: { name: "Silver", price: 33000 },
      gold: { name: "Gold", price: 35000 },
      platinum: { name: "Platinum", price: 38000 },
      white: { name: "White Shoes", price: 40000 },
    },
  },
  DEEP_CLEAN_REGULER: {
    name: "Deep Clean Reguler",
    duration: "3-4 hari",
    types: {
      silver: { name: "Silver", price: 19000 },
      gold: { name: "Gold", price: 22000 },
      platinum: { name: "Platinum", price: 25000 },
      white: { name: "White Shoes", price: 26000 },
    },
  },
  FAST_CLEAN_EXPRESS: {
    name: "Fast Clean Express",
    duration: "1 hari",
    types: {
      silver: { name: "Silver", price: 27000 },
      gold: { name: "Gold", price: 29000 },
      platinum: { name: "Platinum", price: 31000 },
      white: { name: "White Shoes", price: 33000 },
    },
  },
  UNYELLOWING: {
    name: "Unyellowing",
    duration: "4-6 hari",
    types: {
      platinum: { name: "Platinum", price: 37000 },
      premium: { name: "Premium", price: 40000 },
    },
  },
  RECOLOUR: {
    name: "Recolour",
    duration: "7-10 hari",
    types: {
      platinum: { name: "Platinum", price: 88000 },
      premium: { name: "Premium", price: 115000 },
    },
  },
  REPAINT: {
    name: "Repaint",
    duration: "7-10 hari",
    types: {
      platinum: { name: "Platinum", price: 86000 },
      premium: { name: "Premium", price: 110000 },
    },
  },
} as const;

export const PAYMENT_STATUS = {
  UNPAID: "unpaid",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

export const PAYMENT_METHODS = {
  CASH: "cash",
  TRANSFER: "transfer",
  QRIS: "qris",
} as const;

export const USER_ROLES = {
  SUPERUSER: "superuser",
  ADMIN: "admin",
  CASHIER: "cashier",
} as const;

// Shoe process status
export const SHOE_PROCESSES = [
  { value: "received", label: "Diterima" },
  { value: "cleaning", label: "Sedang Disikat" },
  { value: "drying", label: "Sedang Dikeringkan" },
  { value: "finishing", label: "Finishing" },
  { value: "ready", label: "Siap Diambil" },
  { value: "picked_up", label: "Sudah Diambil" },
] as const;

// Store info
export const STORE_INFO = {
  name: "Dr.ShoezClean",
  tagline: "@dr.shoezclean",
  phone: "+62 812-1456-7890",
  address: "Jl. Contoh Alamat No. 123, Jakarta",
  email: "info@drshoezclean.com",
  website: "www.drshoezclean.com",
  bankName: "BCA",
  bankAccount: "123-456-7890",
  accountHolder: "Dr.ShoezClean",
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `INV-${year}${month}${day}${random}`;
}
