import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();
    const { appointmentId, patientId, doctorId, rating, feedback } = body;

    if (!patientId || !doctorId || !feedback) {
      return NextResponse.json(
        { error: 'patientId, doctorId, and feedback are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('doctor_feedback')
      .insert({
        appointment_id: appointmentId || null,
        patient_id: patientId,
        doctor_id: doctorId,
        rating: rating || null,
        feedback,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, feedback: data });
  } catch (error: unknown) {
    console.error('Submit feedback failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit doctor feedback.' },
      { status: 500 }
    );
  }
}
