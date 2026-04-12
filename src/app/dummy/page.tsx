import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic' // Ensure page is not statically cached to always fetch fresh data

export default async function DummyPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch all rows from 'Dummy' table
  const { data: dummyData, error } = await supabase.from('Dummy').select('*')
  console.log(dummyData);
  if (error) {
    return (
      <div className="p-8 text-red-600">
        <h1 className="text-2xl font-bold mb-4text-red-600">Error Fetching Data</h1>
        <p>{error.message}</p>
        <p className="text-sm mt-2">Make sure RLS policies allow reading from this table!</p>
      </div>
    )
  }

  return (
    <div className="p-8 font-sans max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dummy Table Data</h1>

      {dummyData && dummyData.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950 text-emerald-400 p-6 rounded-lg overflow-x-auto shadow-lg">
            <pre>
              {JSON.stringify(dummyData, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 italic">No data found in the 'Dummy' table.</p>
      )}
    </div>
  )
}
