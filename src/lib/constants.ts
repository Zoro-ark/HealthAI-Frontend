export const DUMMY_DOCTOR_ID = '11111111-1111-1111-1111-111111111111';

export const APPOINTMENT_STATUSES = {
  pendingDoctor: 'pending_doctor',
  pendingPatient: 'pending_patient',
  scheduled: 'scheduled',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;
