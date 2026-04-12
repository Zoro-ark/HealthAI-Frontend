-- Create users table to sync with Clerk Auth
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- Clerk user ID (e.g., 'user_2N...')
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'unknown' CHECK (role IN ('admin', 'patient', 'doctor', 'unknown')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow public inserts so the Frontend (Navbar.tsx) can insert a new user 
CREATE POLICY "Allow public inserts on users" 
ON users FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow public read so the Frontend can verify the user's role
CREATE POLICY "Allow public read on users" 
ON users FOR SELECT 
TO public 
USING (true);

-- Allow public update so the Frontend can update the role during onboarding
CREATE POLICY "Allow public update on users" 
ON users FOR UPDATE
TO public 
USING (true)
WITH CHECK (true);
