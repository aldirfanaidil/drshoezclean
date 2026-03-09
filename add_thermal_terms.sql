-- Add thermal_terms column to store_settings
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS thermal_terms TEXT;

-- Update existing settings with default thermal terms (optional)
UPDATE store_settings 
SET thermal_terms = 'Kerusakan akibat pencucian bukan tanggung jawab kami. Tidak semua noda dapat hilang sempurna.'
WHERE thermal_terms IS NULL;
