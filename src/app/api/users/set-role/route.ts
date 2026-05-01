import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

type UserRole = 'patient' | 'doctor';

function isUserRole(role: unknown): role is UserRole {
  return role === 'patient' || role === 'doctor';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, fullName, role } = body;

    if (!userId || !isUserRole(role)) {
      return NextResponse.json(
        { error: 'A valid userId and role are required.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const existing = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json(
        { error: existing.error.message, details: existing.error.details, code: existing.error.code },
        { status: 500 }
      );
    }

    const payload = {
      clerk_id: userId,
      email: email || '',
      name: fullName || 'New User',
      role,
    };

    const mutation = existing.data
      ? supabase.from('users').update(payload).eq('clerk_id', userId)
      : supabase.from('users').insert(payload);

    const { data, error } = await mutation.select('id, clerk_id, role').single();

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error.details, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error: unknown) {
    console.error('Failed to set user role:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set user role.' },
      { status: 500 }
    );
  }
}
