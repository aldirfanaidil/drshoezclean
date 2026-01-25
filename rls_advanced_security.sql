-- ============================================================
-- Dr.ShoezClean - Advanced RLS with Supabase Auth
-- ============================================================
-- OPTIONAL: Script keamanan tingkat lanjut
-- 
-- KAPAN MENGGUNAKAN INI:
-- - Jika ingin keamanan database level (bukan hanya app level)
-- - Jika ingin migrasi dari custom auth ke Supabase Auth
--
-- PERHATIAN: Membutuhkan perubahan signifikan pada kode aplikasi!
-- ============================================================


-- ============================================================
-- STEP 1: Buat tabel untuk mapping app_users ke auth.users
-- ============================================================

-- Tabel ini menghubungkan Supabase Auth ID dengan app_users
CREATE TABLE IF NOT EXISTS public.user_auth_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    app_user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(auth_user_id),
    UNIQUE(app_user_id)
);

-- Enable RLS
ALTER TABLE public.user_auth_mapping ENABLE ROW LEVEL SECURITY;

-- Policy untuk user_auth_mapping
CREATE POLICY "user_auth_mapping_select" ON public.user_auth_mapping
    FOR SELECT
    USING (auth.uid() = auth_user_id);


-- ============================================================
-- STEP 2: Helper function untuk mendapatkan role user
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT au.role INTO user_role
    FROM public.app_users au
    INNER JOIN public.user_auth_mapping uam ON au.id = uam.app_user_id
    WHERE uam.auth_user_id = auth.uid();
    
    RETURN COALESCE(user_role, 'anonymous');
END;
$$;

-- Function untuk mendapatkan branch_id user saat ini
CREATE OR REPLACE FUNCTION public.get_current_user_branch_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    branch_id UUID;
BEGIN
    SELECT au.branch_id INTO branch_id
    FROM public.app_users au
    INNER JOIN public.user_auth_mapping uam ON au.id = uam.app_user_id
    WHERE uam.auth_user_id = auth.uid();
    
    RETURN branch_id;
END;
$$;

-- Function untuk check apakah user adalah superuser/admin
CREATE OR REPLACE FUNCTION public.is_admin_or_superuser()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN get_current_user_role() IN ('superuser', 'admin');
END;
$$;


-- ============================================================
-- STEP 3: Policies dengan Role-Based Access Control
-- ============================================================

-- Hapus policies lama
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "app_users_advanced_select" ON public.app_users;
    DROP POLICY IF EXISTS "app_users_advanced_insert" ON public.app_users;
    DROP POLICY IF EXISTS "app_users_advanced_update" ON public.app_users;
    DROP POLICY IF EXISTS "app_users_advanced_delete" ON public.app_users;
    
    DROP POLICY IF EXISTS "orders_advanced_select" ON public.orders;
    DROP POLICY IF EXISTS "orders_advanced_insert" ON public.orders;
    DROP POLICY IF EXISTS "orders_advanced_update" ON public.orders;
    DROP POLICY IF EXISTS "orders_advanced_delete" ON public.orders;
    
    DROP POLICY IF EXISTS "cash_flows_advanced_select" ON public.cash_flows;
    DROP POLICY IF EXISTS "cash_flows_advanced_insert" ON public.cash_flows;
    DROP POLICY IF EXISTS "cash_flows_advanced_update" ON public.cash_flows;
    DROP POLICY IF EXISTS "cash_flows_advanced_delete" ON public.cash_flows;
    
    DROP POLICY IF EXISTS "customers_advanced_select" ON public.customers;
    DROP POLICY IF EXISTS "customers_advanced_insert" ON public.customers;
    DROP POLICY IF EXISTS "customers_advanced_update" ON public.customers;
    DROP POLICY IF EXISTS "customers_advanced_delete" ON public.customers;
END $$;


-- ============================================================
-- APP_USERS Policies (Advanced)
-- ============================================================
-- Superuser: Full access
-- Admin: Can view all, edit non-superusers
-- Cashier: Can only view self

CREATE POLICY "app_users_advanced_select" ON public.app_users
    FOR SELECT
    USING (
        -- Superuser & Admin bisa lihat semua
        get_current_user_role() IN ('superuser', 'admin')
        OR
        -- User lain hanya bisa lihat diri sendiri
        id = (
            SELECT app_user_id FROM public.user_auth_mapping 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "app_users_advanced_insert" ON public.app_users
    FOR INSERT
    WITH CHECK (
        -- Hanya superuser yang bisa tambah user
        get_current_user_role() = 'superuser'
    );

CREATE POLICY "app_users_advanced_update" ON public.app_users
    FOR UPDATE
    USING (
        -- Superuser bisa update semua
        get_current_user_role() = 'superuser'
        OR
        -- Admin bisa update non-superuser
        (get_current_user_role() = 'admin' AND role != 'superuser')
        OR
        -- User bisa update diri sendiri (password, etc)
        id = (
            SELECT app_user_id FROM public.user_auth_mapping 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "app_users_advanced_delete" ON public.app_users
    FOR DELETE
    USING (
        -- Hanya superuser yang bisa hapus, dan tidak bisa hapus superuser lain
        get_current_user_role() = 'superuser' AND role != 'superuser'
    );


-- ============================================================
-- ORDERS Policies (Advanced - Branch-based)
-- ============================================================
-- Superuser: All branches
-- Admin/Cashier: Only their branch

CREATE POLICY "orders_advanced_select" ON public.orders
    FOR SELECT
    USING (
        get_current_user_role() = 'superuser'
        OR
        branch_id = get_current_user_branch_id()
        OR
        branch_id IS NULL  -- Orders without branch assignment
    );

CREATE POLICY "orders_advanced_insert" ON public.orders
    FOR INSERT
    WITH CHECK (
        get_current_user_role() IN ('superuser', 'admin', 'cashier')
    );

CREATE POLICY "orders_advanced_update" ON public.orders
    FOR UPDATE
    USING (
        get_current_user_role() = 'superuser'
        OR
        (
            get_current_user_role() IN ('admin', 'cashier')
            AND (branch_id = get_current_user_branch_id() OR branch_id IS NULL)
        )
    );

CREATE POLICY "orders_advanced_delete" ON public.orders
    FOR DELETE
    USING (
        get_current_user_role() IN ('superuser', 'admin')
    );


-- ============================================================
-- CASH_FLOWS Policies (Advanced)
-- ============================================================

CREATE POLICY "cash_flows_advanced_select" ON public.cash_flows
    FOR SELECT
    USING (
        get_current_user_role() IN ('superuser', 'admin', 'cashier')
    );

CREATE POLICY "cash_flows_advanced_insert" ON public.cash_flows
    FOR INSERT
    WITH CHECK (
        get_current_user_role() IN ('superuser', 'admin', 'cashier')
    );

CREATE POLICY "cash_flows_advanced_update" ON public.cash_flows
    FOR UPDATE
    USING (
        get_current_user_role() IN ('superuser', 'admin')
    );

CREATE POLICY "cash_flows_advanced_delete" ON public.cash_flows
    FOR DELETE
    USING (
        get_current_user_role() IN ('superuser', 'admin')
    );


-- ============================================================
-- CUSTOMERS Policies (Advanced)
-- ============================================================

CREATE POLICY "customers_advanced_select" ON public.customers
    FOR SELECT
    USING (
        get_current_user_role() IN ('superuser', 'admin', 'cashier')
    );

CREATE POLICY "customers_advanced_insert" ON public.customers
    FOR INSERT
    WITH CHECK (
        get_current_user_role() IN ('superuser', 'admin', 'cashier')
    );

CREATE POLICY "customers_advanced_update" ON public.customers
    FOR UPDATE
    USING (
        get_current_user_role() IN ('superuser', 'admin', 'cashier')
    );

CREATE POLICY "customers_advanced_delete" ON public.customers
    FOR DELETE
    USING (
        get_current_user_role() IN ('superuser', 'admin')
    );


-- ============================================================
-- CATATAN IMPLEMENTASI
-- ============================================================
-- 
-- Untuk menggunakan Advanced RLS ini, kamu perlu:
--
-- 1. Modifikasi Login di Frontend:
--    - Gunakan supabase.auth.signInWithPassword() 
--    - Bukan query langsung ke app_users
--
-- 2. Buat user di Supabase Auth:
--    - Untuk setiap app_user, buat juga user di auth.users
--    - Insert mapping ke user_auth_mapping
--
-- 3. Update kode di src/lib/store.ts:
--    - Ganti login function untuk pakai Supabase Auth
--
-- Contoh kode login baru:
-- 
-- login: async (email, password) => {
--   const { data, error } = await supabase.auth.signInWithPassword({
--     email,
--     password,
--   });
--   if (error) return false;
--   
--   // Get app_user data
--   const { data: userData } = await supabase
--     .from('app_users')
--     .select('*')
--     .single();
--   
--   set({ currentUser: mapUserFromDB(userData) });
--   return true;
-- }
--
-- ============================================================
