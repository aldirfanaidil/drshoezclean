-- ============================================================
-- Dr.ShoezClean - Database Schema
-- ============================================================
-- Version: 1.0
-- Generated: 2025-12-23
-- 
-- DESKRIPSI:
-- File ini berisi struktur lengkap database untuk aplikasi
-- Dr.ShoezClean. Jalankan di Supabase SQL Editor untuk 
-- membuat database baru.
--
-- CARA MENGGUNAKAN:
-- 1. Buat project baru di Supabase (supabase.com)
-- 2. Buka SQL Editor
-- 3. Copy-paste seluruh isi file ini
-- 4. Klik "Run" atau tekan Ctrl+Enter
-- 5. Update file .env dengan URL dan ANON KEY baru
--
-- URUTAN EKSEKUSI:
-- 1. Buat tabel (CREATE TABLE)
-- 2. Buat indeks (CREATE INDEX)
-- 3. Aktifkan RLS (ALTER TABLE)
-- 4. Buat policies (CREATE POLICY)
-- 5. Insert data default (INSERT)
-- ============================================================


-- ============================================================
-- STEP 1: CREATE TABLES
-- ============================================================

-- ---------------------------------------------------------
-- BRANCHES (Cabang/Lokasi Toko)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.branches IS 'Tabel untuk menyimpan data cabang/lokasi toko';
COMMENT ON COLUMN public.branches.name IS 'Nama cabang';
COMMENT ON COLUMN public.branches.address IS 'Alamat lengkap cabang';
COMMENT ON COLUMN public.branches.phone IS 'Nomor telepon cabang';
COMMENT ON COLUMN public.branches.is_active IS 'Status aktif/nonaktif cabang';


-- ---------------------------------------------------------
-- APP_USERS (Pengguna Aplikasi)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(64) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('superuser', 'admin', 'cashier')),
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.app_users IS 'Tabel untuk menyimpan data pengguna aplikasi (login credentials)';
COMMENT ON COLUMN public.app_users.username IS 'Username untuk login (unique)';
COMMENT ON COLUMN public.app_users.password IS 'Password terenkripsi SHA-256 (64 karakter hex)';
COMMENT ON COLUMN public.app_users.role IS 'Role pengguna: superuser, admin, atau cashier';
COMMENT ON COLUMN public.app_users.branch_id IS 'Cabang yang ditugaskan (null untuk superuser = akses semua)';
COMMENT ON COLUMN public.app_users.is_active IS 'Status aktif/nonaktif akun';


-- ---------------------------------------------------------
-- CUSTOMERS (Pelanggan)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.customers IS 'Tabel untuk menyimpan data pelanggan';
COMMENT ON COLUMN public.customers.name IS 'Nama pelanggan';
COMMENT ON COLUMN public.customers.phone IS 'Nomor telepon pelanggan';
COMMENT ON COLUMN public.customers.total_orders IS 'Total jumlah pesanan yang pernah dibuat';
COMMENT ON COLUMN public.customers.total_spent IS 'Total uang yang pernah dibelanjakan';


-- ---------------------------------------------------------
-- DISCOUNTS (Diskon)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value DECIMAL(15,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.discounts IS 'Tabel untuk menyimpan data diskon';
COMMENT ON COLUMN public.discounts.name IS 'Nama diskon';
COMMENT ON COLUMN public.discounts.type IS 'Tipe diskon: percentage (%) atau fixed (nominal)';
COMMENT ON COLUMN public.discounts.value IS 'Nilai diskon (persentase atau nominal)';
COMMENT ON COLUMN public.discounts.is_active IS 'Status aktif/nonaktif diskon';


-- ---------------------------------------------------------
-- ORDERS (Pesanan)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20),
    shoes JSONB DEFAULT '[]'::jsonb,
    entry_date DATE,
    estimated_date DATE,
    pickup_date DATE,
    notes TEXT,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'cancelled')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'transfer', 'qris')),
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.orders IS 'Tabel untuk menyimpan data pesanan/order';
COMMENT ON COLUMN public.orders.invoice_number IS 'Nomor invoice unik (format: INV-YYYYMMDD-XXX)';
COMMENT ON COLUMN public.orders.shoes IS 'Array JSON berisi detail sepatu yang dipesan';
COMMENT ON COLUMN public.orders.payment_status IS 'Status pembayaran: unpaid, paid, atau cancelled';
COMMENT ON COLUMN public.orders.payment_method IS 'Metode pembayaran: cash, transfer, atau qris';

-- Struktur JSONB untuk kolom shoes:
-- [
--   {
--     "id": "uuid",
--     "brand": "Nike Air Max",
--     "service": "Deep Cleaning",
--     "serviceType": "treatment",
--     "price": 50000,
--     "discountId": "uuid" (optional),
--     "discountAmount": 5000 (optional),
--     "processStatus": "received|cleaning|drying|finishing|ready|picked_up"
--   }
-- ]


-- ---------------------------------------------------------
-- CASH_FLOWS (Arus Kas)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(50) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    date DATE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.cash_flows IS 'Tabel untuk mencatat arus kas (pemasukan dan pengeluaran)';
COMMENT ON COLUMN public.cash_flows.type IS 'Tipe transaksi: income (pemasukan) atau expense (pengeluaran)';
COMMENT ON COLUMN public.cash_flows.category IS 'Kategori transaksi (contoh: Pesanan, Operasional, Gaji, dll)';
COMMENT ON COLUMN public.cash_flows.order_id IS 'Referensi ke pesanan (untuk income dari pesanan)';


-- ---------------------------------------------------------
-- STORE_SETTINGS (Pengaturan Toko)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100),
    tagline VARCHAR(200),
    phone VARCHAR(20),
    address TEXT,
    email VARCHAR(100),
    website VARCHAR(200),
    bank_name VARCHAR(50),
    bank_account VARCHAR(50),
    account_holder VARCHAR(100),
    qr_payment TEXT,
    logo TEXT,
    whatsapp_notification_enabled BOOLEAN DEFAULT false,
    invoice_terms TEXT,
    whatsapp_template TEXT,
    sidebar_bg_color VARCHAR(20),
    sidebar_text_color VARCHAR(20),
    sidebar_hover_color VARCHAR(20),
    sidebar_active_color VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.store_settings IS 'Tabel untuk menyimpan pengaturan toko (hanya 1 baris)';
COMMENT ON COLUMN public.store_settings.logo IS 'Logo toko dalam format Base64';
COMMENT ON COLUMN public.store_settings.qr_payment IS 'URL atau Base64 gambar QR QRIS';
COMMENT ON COLUMN public.store_settings.invoice_terms IS 'Syarat dan ketentuan yang muncul di invoice';
COMMENT ON COLUMN public.store_settings.whatsapp_template IS 'Template pesan WhatsApp untuk notifikasi';


-- ============================================================
-- STEP 2: CREATE INDEXES (untuk performa query)
-- ============================================================

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_orders_invoice ON public.orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON public.orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

CREATE INDEX IF NOT EXISTS idx_cash_flows_date ON public.cash_flows(date);
CREATE INDEX IF NOT EXISTS idx_cash_flows_type ON public.cash_flows(type);
CREATE INDEX IF NOT EXISTS idx_cash_flows_order ON public.cash_flows(order_id);

CREATE INDEX IF NOT EXISTS idx_app_users_username ON public.app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_branch ON public.app_users(branch_id);


-- ============================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================================

-- Policies untuk app_users
CREATE POLICY "app_users_select_policy" ON public.app_users
    FOR SELECT USING (true);
CREATE POLICY "app_users_insert_policy" ON public.app_users
    FOR INSERT WITH CHECK (true);
CREATE POLICY "app_users_update_policy" ON public.app_users
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "app_users_delete_policy" ON public.app_users
    FOR DELETE USING (true);

-- Policies untuk branches
CREATE POLICY "branches_select_policy" ON public.branches
    FOR SELECT USING (true);
CREATE POLICY "branches_insert_policy" ON public.branches
    FOR INSERT WITH CHECK (true);
CREATE POLICY "branches_update_policy" ON public.branches
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "branches_delete_policy" ON public.branches
    FOR DELETE USING (true);

-- Policies untuk cash_flows
CREATE POLICY "cash_flows_select_policy" ON public.cash_flows
    FOR SELECT USING (true);
CREATE POLICY "cash_flows_insert_policy" ON public.cash_flows
    FOR INSERT WITH CHECK (true);
CREATE POLICY "cash_flows_update_policy" ON public.cash_flows
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "cash_flows_delete_policy" ON public.cash_flows
    FOR DELETE USING (true);

-- Policies untuk customers
CREATE POLICY "customers_select_policy" ON public.customers
    FOR SELECT USING (true);
CREATE POLICY "customers_insert_policy" ON public.customers
    FOR INSERT WITH CHECK (true);
CREATE POLICY "customers_update_policy" ON public.customers
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "customers_delete_policy" ON public.customers
    FOR DELETE USING (true);

-- Policies untuk discounts
CREATE POLICY "discounts_select_policy" ON public.discounts
    FOR SELECT USING (true);
CREATE POLICY "discounts_insert_policy" ON public.discounts
    FOR INSERT WITH CHECK (true);
CREATE POLICY "discounts_update_policy" ON public.discounts
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "discounts_delete_policy" ON public.discounts
    FOR DELETE USING (true);

-- Policies untuk orders
CREATE POLICY "orders_select_policy" ON public.orders
    FOR SELECT USING (true);
CREATE POLICY "orders_insert_policy" ON public.orders
    FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update_policy" ON public.orders
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "orders_delete_policy" ON public.orders
    FOR DELETE USING (true);

-- Policies untuk store_settings
CREATE POLICY "store_settings_select_policy" ON public.store_settings
    FOR SELECT USING (true);
CREATE POLICY "store_settings_insert_policy" ON public.store_settings
    FOR INSERT WITH CHECK (true);
CREATE POLICY "store_settings_update_policy" ON public.store_settings
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "store_settings_delete_policy" ON public.store_settings
    FOR DELETE USING (true);


-- ============================================================
-- STEP 5: INSERT DEFAULT DATA
-- ============================================================

-- Default superuser account
-- Username: admin
-- Password: admin123 (hashed dengan SHA-256)
-- SHA-256 hash dari "admin123" = 240be518fabd2724ddb6f04eeb9d6d8038d92d8ee5f6c6dbeb6db149d2e4b3eb
INSERT INTO public.app_users (id, username, password, role, is_active, created_at)
VALUES (
    gen_random_uuid(),
    'admin',
    '240be518fabd2724ddb6f04eeb9d66d043d92d8ee5f6c6dbeb6db149d2e4b3eb',
    'superuser',
    true,
    now()
) ON CONFLICT (username) DO NOTHING;

-- Default store settings
INSERT INTO public.store_settings (
    name, 
    tagline, 
    phone, 
    address, 
    email, 
    website,
    bank_name,
    bank_account,
    account_holder,
    whatsapp_notification_enabled,
    invoice_terms,
    whatsapp_template
)
SELECT 
    'Dr.ShoezClean',
    '@dr.shoezclean',
    '+62 812-1456-7890',
    'Jl. Contoh Alamat No. 123, Jakarta',
    'info@drshoezclean.com',
    'www.drshoezclean.com',
    'BCA',
    '123-456-7890',
    'Dr.ShoezClean',
    false,
    'Segala bentuk kerusakan akibat pencucian sepatu bukan tanggung jawab dari tim dr.shoezclean.

Perlu diketahui bahwa tidak semua noda/kotoran di sepatu dapat hilang dengan sempurna.',
    '🧾 *INVOICE {storeName}*
━━━━━━━━━━━━━━━━━━
📋 No.Invoice: *{invoiceNumber}*
📅 Tanggal: {date}

👤 *Pelanggan:*
{customerName}
📱 {customerPhone}

👟 *Detail Sepatu:*
{shoeDetails}

━━━━━━━━━━━━━━━━━━
💵 *TOTAL: {total}*

📊 Status: {status}

━━━━━━━━━━━━━━━━━━
Terima kasih telah menggunakan jasa *{storeName}*! 🙏'
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings LIMIT 1);


-- ============================================================
-- STEP 6: CREATE TRIGGER FOR UPDATED_AT
-- ============================================================

-- Function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger untuk store_settings
DROP TRIGGER IF EXISTS update_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER update_store_settings_updated_at
    BEFORE UPDATE ON public.store_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- VERIFIKASI
-- ============================================================

-- Cek semua tabel sudah dibuat
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN 'RLS Aktif ✅' ELSE 'RLS Nonaktif ❌' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('app_users', 'branches', 'cash_flows', 'customers', 'discounts', 'orders', 'store_settings')
ORDER BY tablename;


-- ============================================================
-- SETELAH MENJALANKAN SCRIPT INI:
-- ============================================================
-- 
-- 1. Copy URL dan ANON KEY dari Supabase:
--    - Buka Project Settings > API
--    - Copy "Project URL" dan "anon public" key
--
-- 2. Update file .env di project:
--    VITE_SUPABASE_URL=https://[your-project].supabase.co
--    VITE_SUPABASE_ANON_KEY=[your-anon-key]
--
-- 3. Login dengan akun default:
--    Username: admin
--    Password: admin123
--
-- 4. PENTING: Segera ganti password default setelah login!
--
-- ============================================================
