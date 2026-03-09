-- ============================================================
-- Dr.ShoezClean - Migration: Add UNIQUE constraint to phone
-- ============================================================
-- 
-- DESKRIPSI:
-- Script ini menambahkan UNIQUE constraint pada kolom phone
-- di tabel customers untuk mencegah duplikasi pelanggan.
--
-- PERINGATAN: 
-- Jalankan script ini SETELAH membersihkan data duplikat!
--
-- ============================================================

-- STEP 1: Cek duplikat yang ada
-- Jalankan query ini dulu untuk melihat data duplikat:
-- 
-- SELECT phone, COUNT(*) as count, 
--        STRING_AGG(name, ', ') as names,
--        STRING_AGG(id::text, ', ') as ids
-- FROM customers 
-- WHERE phone IS NOT NULL AND phone != ''
-- GROUP BY phone 
-- HAVING COUNT(*) > 1;

-- STEP 2: Hapus duplikat (simpan yang paling lama/pertama)
-- Hapus customer duplikat dengan menyimpan yang memiliki created_at paling awal:
DELETE FROM customers a
USING customers b
WHERE a.phone = b.phone 
  AND a.phone IS NOT NULL 
  AND a.phone != ''
  AND a.created_at > b.created_at;

-- STEP 3: Tambahkan UNIQUE constraint
ALTER TABLE public.customers 
ADD CONSTRAINT customers_phone_unique UNIQUE (phone);

-- Verifikasi constraint berhasil ditambahkan
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'customers' AND constraint_type = 'UNIQUE';
