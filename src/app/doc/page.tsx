import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import DashboardClient from './components/DashboardClient'
import { AlertCircle } from 'lucide-react'
import { currentUser } from '@clerk/nextjs/server'

// Hardcoded Dummy Doctor ID mapped to our SQL insertion script
const DUMMY_DOCTOR_ID = '11111111-1111-1111-1111-111111111111'

export const dynamic = 'force-dynamic'

export default async function DocPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress || ''

  // Fetch verification status using user_id mapped from Clerk user
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', user?.id || '')
    .maybeSingle()

  let verificationStatus = 'none'
  let realDoctorId = DUMMY_DOCTOR_ID

  if (dbUser) {
      const { data: verifications } = await supabase
        .from('doctor_verifications')
        .select('status')
        .eq('user_id', dbUser.id)
        .order('created_at', { ascending: false })
        .limit(1)

      verificationStatus = verifications?.[0]?.status || 'none'

      const { data: doctorRec } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', dbUser.id)
        .maybeSingle()

      if (doctorRec) {
          realDoctorId = doctorRec.id
      }
  }

  // Fetch appointments, joining the patients table
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      appointment_date,
      notes,
      patients (
        id,
        name,
        age,
        gender,
        contact_info
      )
    `)
    .eq('doctor_id', realDoctorId)
    .order('appointment_date', { ascending: true })

  if (error || !appointments) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
         <div className="bg-red-50 border border-red-200 p-8 rounded-3xl max-w-lg text-center shadow-lg">
             <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
             <h1 className="text-2xl font-bold mb-4">Schema Missing or SQL Error</h1>
             <p className="text-slate-600 mb-6 font-sans">
               To view the UI, make sure you have executed the full SQL schema mapped in the AI walkthrough to create the required tables and dummy data.
             </p>
             <code className="text-sm bg-white p-4 rounded-xl block text-left text-red-600 border border-red-100 overflow-auto">
               {error?.message || "Unknown fetching error"}
             </code>
         </div>
      </div>
    )
  }

  return <DashboardClient appointments={appointments as any[]} verificationStatus={verificationStatus} />
}
