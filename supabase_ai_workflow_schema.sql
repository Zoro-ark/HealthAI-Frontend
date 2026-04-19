-- ==============================================================================
-- RUN THIS AFTER YOUR EXISTING SUPABASE SCHEMA FILES
-- Adds doctor analysis reports, generated itineraries, appointment approvals,
-- and doctor feedback persistence for the ML workflow.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.consultation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID,
    request_id UUID REFERENCES public.medical_requests(id) ON DELETE SET NULL,
    summary TEXT NOT NULL,
    doctor_notes TEXT,
    ocr_text TEXT,
    clinicalbert_findings JSONB DEFAULT '[]'::jsonb,
    imaging_findings JSONB DEFAULT '[]'::jsonb,
    models_used JSONB DEFAULT '{}'::jsonb,
    meeting_status TEXT DEFAULT 'report_sent',
    proposed_meeting_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.treatment_itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID,
    report_id UUID REFERENCES public.consultation_reports(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    city TEXT,
    hospital TEXT,
    treatment_plan TEXT NOT NULL,
    stay TEXT,
    estimated_total_cost TEXT,
    daily_cost_breakdown JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'generated',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.doctor_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID,
    itinerary_id UUID REFERENCES public.treatment_itineraries(id) ON DELETE SET NULL,
    appointment_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_doctor',
    notes TEXT,
    created_by TEXT DEFAULT 'doctor',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.consultation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on consultation_reports" ON public.consultation_reports;
CREATE POLICY "Allow public all on consultation_reports"
ON public.consultation_reports FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on treatment_itineraries" ON public.treatment_itineraries;
CREATE POLICY "Allow public all on treatment_itineraries"
ON public.treatment_itineraries FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on doctor_feedback" ON public.doctor_feedback;
CREATE POLICY "Allow public all on doctor_feedback"
ON public.doctor_feedback FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on appointments" ON public.appointments;
CREATE POLICY "Allow public all on appointments"
ON public.appointments FOR ALL TO public USING (true) WITH CHECK (true);
