-- ============================================
-- Dr.ShoezClean - User Insert with Hashed Passwords
-- Generated: 2025-12-14T11:30:54.626Z
-- ============================================

-- Step 1: Add branch_id column to app_users (if not exists)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- Step 2: Insert users with hashed passwords

-- User: aldi@gmail.com
-- Password: parcom75777 -> Hash: 0ed5e55dc5af42355172dd0bc06f92b7a2033f4564ac2629a40882e823ac6691
INSERT INTO app_users (id, username, password, role, is_active, created_at, branch_id)
VALUES (gen_random_uuid(), 'aldi@gmail.com', '0ed5e55dc5af42355172dd0bc06f92b7a2033f4564ac2629a40882e823ac6691', 'superuser', true, now(), NULL);

-- User: risma@gmail.com
-- Password: risma@2025 -> Hash: 23521f803fbc6fb7633e0900610de3a30aacaac344df83e3c1975a54fdbce19e
INSERT INTO app_users (id, username, password, role, is_active, created_at, branch_id)
VALUES (gen_random_uuid(), 'risma@gmail.com', '23521f803fbc6fb7633e0900610de3a30aacaac344df83e3c1975a54fdbce19e', 'admin', true, now(), NULL);

-- ============================================
-- Note: All new users created via the app will automatically have hashed passwords
-- The hash algorithm used is SHA-256
-- ============================================
