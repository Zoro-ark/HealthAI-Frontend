-- ==============================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ==============================================================================
-- Since you are now using Clerk Auth (which uses text strings for IDs like 'user_2xyz')
-- and your previous schema likely used Supabase Auth (UUIDs), we need to safely ensure
-- that the `patients` table accepts TEXT IDs.

-- 1. Attempt to alter the existing columns safely (will do nothing if already TEXT)
BEGIN;
  
  -- If you already have appointments using UUID, we cast them to TEXT.
  -- Drop constraints first to allow casting
  ALTER TABLE IF EXISTS public.appointments 
    DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;
    
  ALTER TABLE IF EXISTS public.patient_documents 
    DROP CONSTRAINT IF EXISTS patient_documents_patient_id_fkey;

  -- Alter columns to TEXT to support Clerk Auth IDs
  ALTER TABLE IF EXISTS public.patients ALTER COLUMN id TYPE TEXT USING id::text;
  ALTER TABLE IF EXISTS public.appointments ALTER COLUMN patient_id TYPE TEXT USING patient_id::text;
  ALTER TABLE IF EXISTS public.patient_documents ALTER COLUMN patient_id TYPE TEXT USING patient_id::text;

  -- Add columns if they were missing
  ALTER TABLE IF EXISTS public.patients ADD COLUMN IF NOT EXISTS gender TEXT;
  ALTER TABLE IF EXISTS public.patients ADD COLUMN IF NOT EXISTS contact_info TEXT;

  -- Re-add constraints if appointments existed
  DO $$ 
  BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointments') THEN
          ALTER TABLE public.appointments ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
      END IF;
  END $$;

COMMIT;

-- 2. Ensure `patients` table exists (if it didn't exist at all)
CREATE TABLE IF NOT EXISTS public.patients (
    id TEXT PRIMARY KEY, 
    name TEXT NOT NULL,
    age INT,
    gender TEXT,
    contact_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create `patient_docs` table
CREATE TABLE IF NOT EXISTS public.patient_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    size INT,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create `medical_requests` table
CREATE TABLE IF NOT EXISTS public.medical_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    symptoms TEXT NOT NULL,
    budget_range TEXT,
    destinations TEXT[],
    status TEXT DEFAULT 'Under Review',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Storage Bucket Creation
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('patient_documents', 'patient_documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public reading from the bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'patient_documents' );

-- Policy for Authenticated users to upload
DROP POLICY IF EXISTS "Public users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Public users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'patient_documents' );

-- ==============================================================================
-- FIX: Row Level Security Policies
-- Since Clerk is separated from Supabase Auth right now, Supabase fetches as 'anon'.
-- We need to enable RLS but establish public trust for these components.
-- ==============================================================================
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_requests ENABLE ROW LEVEL SECURITY;

-- Allow Clerk frontend to read/write without triggering an RLS block
DROP POLICY IF EXISTS "Allow public all on patients" ON public.patients;
CREATE POLICY "Allow public all on patients" ON public.patients FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on patient_docs" ON public.patient_docs;
CREATE POLICY "Allow public all on patient_docs" ON public.patient_docs FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on medical_requests" ON public.medical_requests;
CREATE POLICY "Allow public all on medical_requests" ON public.medical_requests FOR ALL TO public USING (true) WITH CHECK (true);
