import { NextResponse } from 'next/server';
import { DUMMY_DOCTOR_ID } from '@/lib/constants';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();
    const { patientId, itineraryId, appointmentDate, doctorId } = body;

    if (!patientId || !appointmentDate) {
      return NextResponse.json(
        { error: 'patientId and appointmentDate are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId || DUMMY_DOCTOR_ID,
        appointment_date: appointmentDate,
        status: 'pending_doctor',
        notes: 'Patient requested a follow-up meeting.',
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, appointment: data });
  } catch (error: unknown) {
    console.error('Request meeting failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to request the appointment.' },
      { status: 500 }
    );
  }
}
