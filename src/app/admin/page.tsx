'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface MedicalRequest {
  symptoms: string;
  created_at: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  age: number;
  budget: string;
  availability_days: number;
  visa_status: string;
  assigned_doctor_id: string | null;
  assigned_doctor_name: string | null;
  medical_requests: MedicalRequest[];
}

interface DoctorVerification {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  registration_number: string;
  specialty: string;
  degree_info: string;
  experience_years: number;
  clinic_address: string;
  status: 'pending' | 'verified' | 'rejected';
  created_at: string;
}

type TabState = 'allocations' | 'verifications';
type DoctorFilterState = 'pending' | 'verified' | 'rejected';

export default function AdminDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabState>('allocations');
  const [docFilter, setDocFilter] = useState<DoctorFilterState>('pending');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allocating, setAllocating] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [patientsRes, doctorsRes] = await Promise.all([
          fetch('http://localhost:5001/api/admin/patients', {
            headers: { 'Authorization': `Bearer ${user.id}` }
          }),
          fetch('http://localhost:5001/api/admin/doctors', {
            headers: { 'Authorization': `Bearer ${user.id}` }
          })
        ]);

        if (!patientsRes.ok) throw new Error('Failed to fetch patients');
        if (!doctorsRes.ok) throw new Error('Failed to fetch doctors');

        const [patientsData, doctorsData] = await Promise.all([
          patientsRes.json(),
          doctorsRes.json()
        ]);

        setPatients(patientsData);
        setDoctors(doctorsData);
      } catch (err: any) {
        console.error("Fetch data error", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isLoaded, isSignedIn, user, router]);

  const handleAssignDoctor = async (patientId: string, doctorId: string) => {
    if (!doctorId) return;
    setAllocating(patientId);
    try {
      const selectedDoc = doctors.find(d => d.id === doctorId);
      if (!selectedDoc) throw new Error("Doctor not found");

      const res = await fetch('http://localhost:5001/api/admin/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify({
          patientId,
          doctorId: selectedDoc.id,
          doctorName: selectedDoc.full_name
        })
      });

      if (!res.ok) throw new Error('Failed to assign doctor');

      setPatients(prev => prev.map(p =>
        p.id === patientId
          ? { ...p, assigned_doctor_id: selectedDoc.id, assigned_doctor_name: selectedDoc.full_name }
          : p
      ));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error saving assignment');
    } finally {
      setAllocating(null);
    }
  };

  const handleUpdateDoctorStatus = async (doctorId: string, newStatus: 'pending' | 'verified' | 'rejected') => {
    try {
      const res = await fetch(`http://localhost:5001/api/admin/doctors/${doctorId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update doctor status');

      // Update UI locally
      setDoctors(prev => prev.map(d =>
        d.id === doctorId ? { ...d, status: newStatus } : d
      ));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error updating status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col bg-gray-50">
        <p className="text-red-500 text-lg font-semibold bg-red-50 px-4 py-2 rounded-lg border border-red-200">Error: {error}</p>
        <p className="text-gray-500 mt-2 text-sm">Make sure you are viewing as Admin and the backend server is running.</p>
      </div>
    );
  }

  const verifiedDoctors = doctors.filter(d => d.status === 'verified');
  const filteredDoctors = doctors.filter(d => d.status === docFilter);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Control Center</h1>
            <p className="text-gray-600 mt-2">Manage incoming patient streams and verify credentials of healthcare partners.</p>
          </div>
          <div className="flex bg-indigo-50/50 p-1 rounded-lg border border-indigo-100">
            <button
              onClick={() => setActiveTab('allocations')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'allocations' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200' : 'text-gray-500 hover:text-indigo-600'}`}
            >
              Patient Allocations
            </button>
            <button
              onClick={() => setActiveTab('verifications')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'verifications' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200' : 'text-gray-500 hover:text-indigo-600'}`}
            >
              Doctor Verifications
            </button>
          </div>
        </div>

        {/* --- TAB: PATIENT ALLOCATIONS --- */}
        {activeTab === 'allocations' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Available Doctors */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-3 px-1">Registered Doctors Directory</h2>
              {verifiedDoctors.length === 0 ? (
                <div className="p-4 bg-orange-50 border border-orange-100 text-orange-700 rounded-lg text-sm">
                  You have no verified doctors in the system. Please verify doctors first in the Verifications tab.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {verifiedDoctors.map(doc => (
                    <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-indigo-300 transition-colors">
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                        {doc.full_name.split(' ')[1]?.[0] || doc.full_name[0]}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-semibold text-gray-900 truncate">{doc.full_name}</h3>
                        <p className="text-sm text-gray-500 truncate">{doc.specialty}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Patients Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Pending Patient Needs</h2>
                <div className="text-sm text-gray-500">Total Patients: {patients.length}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                      <th className="p-4 font-medium">Patient Info</th>
                      <th className="p-4 font-medium">Verification Logistics</th>
                      <th className="p-4 font-medium w-1/3">Symptoms & Requests</th>
                      <th className="p-4 font-medium whitespace-nowrap">Doctor Assignment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {patients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500">No verified patients found.</td>
                      </tr>
                    ) : (
                      patients.map(patient => (
                        <tr key={patient.id} className="hover:bg-gray-50/50 transition duration-150">
                          {/* Patient Info */}
                          <td className="p-4 align-top">
                            <div className="font-semibold text-gray-900 text-base">{patient.name}</div>
                            <div className="text-gray-500">{patient.email}</div>
                          </td>
                          {/* Details */}
                          <td className="p-4 align-top text-gray-700 space-y-1">
                            <div><span className="text-gray-400">Age:</span> {patient.age}</div>
                            <div><span className="text-gray-400">Budget:</span> {patient.budget}</div>
                            <div><span className="text-gray-400">Visa:</span> {patient.visa_status}</div>
                          </td>
                          {/* Symptoms */}
                          <td className="p-4 align-top">
                            {patient.medical_requests && patient.medical_requests.length > 0 ? (
                              <div className="space-y-3">
                                {patient.medical_requests.map((req, idx) => (
                                  <div key={idx} className="bg-orange-50/50 border border-orange-100 p-3 rounded-lg">
                                    <span className="text-xs text-orange-400 font-semibold mb-1 block">
                                      {new Date(req.created_at).toLocaleDateString()}
                                    </span>
                                    <p className="text-gray-800 line-clamp-3 leading-relaxed">"{req.symptoms}"</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No recorded requests yet</span>
                            )}
                          </td>
                          {/* Allocation */}
                          <td className="p-4 align-middle">
                            {allocating === patient.id ? (
                              <div className="text-indigo-600 animate-pulse font-medium text-sm">Assigning...</div>
                            ) : patient.assigned_doctor_name ? (
                              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                                <span className="block text-xs text-indigo-400 font-medium uppercase tracking-wider mb-1">Assigned to:</span>
                                <strong className="text-indigo-900 block mb-2">{patient.assigned_doctor_name}</strong>
                                <select
                                  className="w-full text-xs border border-indigo-200 rounded p-1.5 bg-white text-gray-600 outline-none"
                                  value={patient.assigned_doctor_id || ''}
                                  onChange={(e) => handleAssignDoctor(patient.id, e.target.value)}
                                >
                                  <option value="" disabled>Change Assignment</option>
                                  {verifiedDoctors.map(d => (
                                    <option key={d.id} value={d.id}>{d.full_name} ({d.specialty})</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <select
                                className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white text-gray-700 outline-none focus:border-indigo-500 shadow-sm"
                                defaultValue=""
                                onChange={(e) => handleAssignDoctor(patient.id, e.target.value)}
                              >
                                <option value="" disabled>Select a doctor...</option>
                                {verifiedDoctors.map(d => (
                                  <option key={d.id} value={d.id}>{d.full_name} - {d.specialty}</option>
                                ))}
                              </select>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: DOCTOR VERIFICATIONS --- */}
        {activeTab === 'verifications' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filter controls */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
              {(['pending', 'verified', 'rejected'] as DoctorFilterState[]).map(status => (
                <button
                  key={status}
                  onClick={() => setDocFilter(status)}
                  className={`px-4 py-2 capitalize font-medium text-sm rounded-t-lg transition w-32 border-b-2 ${docFilter === status
                      ? status === 'pending' ? 'text-yellow-600 border-yellow-500 bg-yellow-50/50' :
                        status === 'verified' ? 'text-green-600 border-green-500 bg-green-50/50' :
                          'text-red-600 border-red-500 bg-red-50/50'
                      : 'text-gray-500 border-transparent hover:bg-gray-100 hover:text-gray-700'
                    }`}
                >
                  {status} ({doctors.filter(d => d.status === status).length})
                </button>
              ))}
            </div>

            {/* Doctor Verification Cards Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredDoctors.length === 0 ? (
                <div className="col-span-full p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                  No {docFilter} doctor applications found.
                </div>
              ) : (
                filteredDoctors.map(doc => (
                  <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{doc.full_name}</h3>
                        <p className="text-indigo-600 font-medium text-sm">{doc.specialty}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          doc.status === 'verified' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        {doc.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg flex-grow">
                      <div><span className="text-gray-400 block text-xs">Email</span>{doc.email}</div>
                      <div><span className="text-gray-400 block text-xs">Phone</span>{doc.phone}</div>
                      <div><span className="text-gray-400 block text-xs">Reg. Number</span><span className="font-mono bg-white px-2 py-0.5 border border-gray-200 rounded text-xs">{doc.registration_number}</span></div>
                      <div><span className="text-gray-400 block text-xs">Experience</span>{doc.experience_years} Years</div>
                      <div className="col-span-2"><span className="text-gray-400 block text-xs">Degrees / Qualifications</span>{doc.degree_info}</div>
                      <div className="col-span-2"><span className="text-gray-400 block text-xs">Clinic Address</span>{doc.clinic_address}</div>
                    </div>

                    {/* Action Buttons for Pending */}
                    {doc.status === 'pending' && (
                      <div className="mt-6 flex gap-3 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleUpdateDoctorStatus(doc.id, 'verified')}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition"
                        >
                          Approve Profile
                        </button>
                        <button
                          onClick={() => handleUpdateDoctorStatus(doc.id, 'rejected')}
                          className="flex-1 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 py-2 rounded-lg font-medium transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Reverse Action for Verified/Rejected just in case admin makes a mistake */}
                    {/* Optional, keeping it simple for now, but allowing reversing rejection back to pending */}
                    {doc.status === 'rejected' && (
                      <div className="mt-4 text-right">
                        <button onClick={() => handleUpdateDoctorStatus(doc.id, 'pending')} className="text-sm text-gray-400 hover:text-indigo-600 underline">
                          Move back to pending
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
