import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();
    const { appointmentId, approvedBy } = body;

    if (!appointmentId || !approvedBy) {
      return NextResponse.json(
        { error: 'appointmentId and approvedBy are required.' },
        { status: 400 }
      );
    }

    const nextStatus = approvedBy === 'patient' ? 'scheduled' : 'scheduled';

    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, appointment: data });
  } catch (error: unknown) {
    console.error('Respond meeting failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update the appointment.' },
      { status: 500 }
    );
  }
}
