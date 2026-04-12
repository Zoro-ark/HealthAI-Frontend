-- Create doctor_verifications table
CREATE TABLE doctor_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    specialty TEXT NOT NULL,
    degree_info TEXT NOT NULL,
    experience_years INTEGER NOT NULL DEFAULT 0,
    clinic_address TEXT NOT NULL,
    documents JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE doctor_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert a verification request (since doctors might not be fully signed up yet)
CREATE POLICY "Allow public inserts on doctor_verifications" 
ON doctor_verifications FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow public to select their own verifications if needed, or simply restrict reading to admins
-- For now, we'll allow public to read all (or restrict if you want more security, e.g. using auth.uid())
CREATE POLICY "Allow public read on doctor_verifications" 
ON doctor_verifications FOR SELECT 
TO public 
USING (true);

-- Update trigger for updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON doctor_verifications
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- Set up Supabase Storage Bucket for 'doctor_documents'
-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('doctor_documents', 'doctor_documents', true);

-- 2. Create Storage Policies to allow public uploads
CREATE POLICY "Allow public uploads to doctor_documents" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'doctor_documents');

-- 3. Allow public to read documents (since the bucket is public, but let's be explicit)
CREATE POLICY "Allow public read on doctor_documents" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'doctor_documents');
