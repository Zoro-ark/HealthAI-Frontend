export default function DoctorDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Doctor Dashboard</h1>
        <p className="text-gray-600 border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50 rounded-r-md">
          Welcome to the doctor portal. Here you will be able to manage patient visits, upload medical documents, and write clinical notes.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-100 rounded-lg p-6 hover:shadow-md transition">
            <h3 className="text-xl font-semibold text-gray-800">Assigned Patients</h3>
            <p className="text-gray-500 mt-2">View medical records and history of your patients.</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-6 hover:shadow-md transition">
            <h3 className="text-xl font-semibold text-gray-800">Pending Reports</h3>
            <p className="text-gray-500 mt-2">Upload clinical notes for recent visits.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
