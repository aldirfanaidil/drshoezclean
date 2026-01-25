-- ============================================================
-- Dr.ShoezClean - RESET DATA (Fresh Start)
-- ============================================================
-- Tanggal: 2026-01-01
-- 
-- DESKRIPSI:
-- Script ini akan MENGHAPUS SEMUA DATA transaksi/pelanggan
-- tetapi MEMPERTAHANKAN:
-- ✅ Pengaturan Toko (store_settings)
-- ✅ Pengguna (app_users)
-- ✅ Cabang (branches)
-- ✅ Diskon (discounts) - opsional, bisa dihapus jika tidak perlu
--
-- ⚠️ PERINGATAN: DATA YANG DIHAPUS TIDAK BISA DIKEMBALIKAN!
-- ============================================================


-- ============================================================
-- LANGKAH 1: Hapus Cash Flows (Arus Kas)
-- Ini harus dihapus duluan karena ada referensi ke orders
-- ============================================================
DELETE FROM public.cash_flows;


-- ============================================================
-- LANGKAH 2: Hapus Orders (Pesanan)
-- Ini harus dihapus sebelum customers karena ada referensi
-- ============================================================
DELETE FROM public.orders;


-- ============================================================
-- LANGKAH 3: Hapus Customers (Pelanggan)
-- ============================================================
DELETE FROM public.customers;


-- ============================================================
-- OPSIONAL: Hapus Discounts (Diskon)
-- Uncomment baris di bawah jika ingin reset diskon juga
-- ============================================================
-- DELETE FROM public.discounts;


-- ============================================================
-- VERIFIKASI: Hitung jumlah data setelah reset
-- ============================================================
SELECT 'orders' as tabel, COUNT(*) as jumlah FROM public.orders
UNION ALL
SELECT 'customers', COUNT(*) FROM public.customers
UNION ALL
SELECT 'cash_flows', COUNT(*) FROM public.cash_flows
UNION ALL
SELECT 'discounts', COUNT(*) FROM public.discounts
UNION ALL
SELECT 'app_users (TIDAK DIHAPUS)', COUNT(*) FROM public.app_users
UNION ALL
SELECT 'store_settings (TIDAK DIHAPUS)', COUNT(*) FROM public.store_settings
UNION ALL
SELECT 'branches (TIDAK DIHAPUS)', COUNT(*) FROM public.branches;


-- ============================================================
-- HASIL YANG DIHARAPKAN:
-- ============================================================
-- orders: 0
-- customers: 0
-- cash_flows: 0
-- discounts: (jumlah sebelumnya, atau 0 jika dihapus)
-- app_users: (tetap ada)
-- store_settings: (tetap ada)
-- branches: (tetap ada)
-- ============================================================
