import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import PatientDetailsClient from './PatientDetailsClient'
import { AlertCircle } from 'lucide-react'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  if (!id) {
    redirect('/doc')
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Fetch Patient details
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single()

  // 2. Fetch all appointments to derive medical history and notes
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', id)
    .order('appointment_date', { ascending: false })

  // 3. Fetch patient documents
  const { data: documents } = await supabase
    .from('patient_docs')
    .select('*')
    .eq('patient_id', id)
    .order('created_at', { ascending: false })

  if (patientError || !patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 p-8 rounded-3xl max-w-md text-center">
           <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
           <h1 className="text-2xl font-bold mb-2">Patient Not Found</h1>
           <p className="text-slate-600 mb-6 font-sans">
             We couldn't locate this patient record in the database.
           </p>
        </div>
      </div>
    )
  }

  return <PatientDetailsClient patient={patient} appointments={appointments || []} documents={documents || []} />
}
