'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface Visit {
  chief_complaint: string;
  visit_timestamp: string;
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
  visits: Visit[];
}

const MOCK_DOCTORS = [
  { id: 'doc_1', name: 'Dr. Sarah Jenkins', specialty: 'General Physician' },
  { id: 'doc_2', name: 'Dr. Marcus Webb', specialty: 'Cardiologist' },
  { id: 'doc_3', name: 'Dr. Emily Chen', specialty: 'Neurologist' },
  { id: 'doc_4', name: 'Dr. Robert Fox', specialty: 'Orthopedist' }
];

export default function AdminDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allocating, setAllocating] = useState<string | null>(null); // tracks patientId being allocated

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push('/');
      return;
    }

    const fetchPatients = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/admin/patients', {
          headers: {
            'Authorization': `Bearer ${user.id}`
          }
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Failed to fetch patients');
        }

        const data = await res.json();
        setPatients(data);
      } catch (err: any) {
        console.error("Fetch patients error", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [isLoaded, isSignedIn, user, router]);

  const handleAssignDoctor = async (patientId: string, doctorId: string) => {
    if (!doctorId) return;
    
    setAllocating(patientId);
    try {
      const selectedDoc = MOCK_DOCTORS.find(d => d.id === doctorId);
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
          doctorName: selectedDoc.name
        })
      });

      if (!res.ok) {
        throw new Error('Failed to assign doctor');
      }

      // Update local state to reflect UI change instantly
      setPatients(prev => prev.map(p => 
        p.id === patientId 
          ? { ...p, assigned_doctor_id: selectedDoc.id, assigned_doctor_name: selectedDoc.name } 
          : p
      ));

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error saving assignment');
    } finally {
      setAllocating(null);
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Control Center</h1>
            <p className="text-gray-600 mt-2">Manage incoming patient verification pipelines and assign specialists based on patient symptoms.</p>
          </div>
          <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm border border-indigo-100">
            Total Verified Patients: {patients.length}
          </div>
        </div>

        {/* Available Doctors (Hardcoded View) */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 px-1">Registered Doctors Directory</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MOCK_DOCTORS.map(doc => (
              <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">
                  {doc.name.split(' ')[1]?.[0] || 'D'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                  <p className="text-sm text-gray-500">{doc.specialty}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Patients Allocation Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">Pending Patient Allocations</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                  <th className="p-4 font-medium">Patient Info</th>
                  <th className="p-4 font-medium">Verification Logistics</th>
                  <th className="p-4 font-medium w-1/3">Symptoms & Visits</th>
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
                        <div className="mt-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full inline-block font-medium">
                          Verified
                        </div>
                      </td>

                      {/* Verification details */}
                      <td className="p-4 align-top text-gray-700 space-y-1">
                        <div><span className="text-gray-400">Age:</span> {patient.age}</div>
                        <div><span className="text-gray-400">Budget:</span> {patient.budget}</div>
                        <div><span className="text-gray-400">Days:</span> {patient.availability_days}</div>
                        <div><span className="text-gray-400">Visa:</span> {patient.visa_status}</div>
                      </td>

                      {/* Symptoms */}
                      <td className="p-4 align-top">
                        {patient.visits && patient.visits.length > 0 ? (
                          <div className="space-y-3">
                            {patient.visits.map((visit, idx) => (
                              <div key={idx} className="bg-orange-50/50 border border-orange-100 p-3 rounded-lg">
                                <span className="text-xs text-orange-400 font-semibold block mb-1">
                                  {new Date(visit.visit_timestamp).toLocaleDateString()}
                                </span>
                                <p className="text-gray-800 line-clamp-3 leading-relaxed">
                                  "{visit.chief_complaint}"
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No recorded visits yet</span>
                        )}
                      </td>

                      {/* Allocation */}
                      <td className="p-4 align-middle">
                        {allocating === patient.id ? (
                          <div className="text-indigo-600 animate-pulse font-medium text-sm flex items-center gap-2">
                             <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                             Assigning...
                          </div>
                        ) : patient.assigned_doctor_name ? (
                          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex flex-col gap-2">
                            <div>
                              <span className="block text-xs text-indigo-400 font-medium uppercase tracking-wider mb-0.5">Assigned to:</span>
                              <strong className="text-indigo-900">{patient.assigned_doctor_name}</strong>
                            </div>
                            <select 
                              className="text-xs border border-indigo-200 rounded p-1.5 bg-white text-gray-600 focus:outline-none focus:border-indigo-400 cursor-pointer"
                              value={patient.assigned_doctor_id || ''}
                              onChange={(e) => handleAssignDoctor(patient.id, e.target.value)}
                            >
                              <option value="" disabled>Change Assignment</option>
                              {MOCK_DOCTORS.map(d => (
                                <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-orange-500 font-medium animate-pulse">Needs Assignment</span>
                            <select 
                              className="text-sm border border-gray-300 rounded-md p-2 bg-white text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
                              defaultValue=""
                              onChange={(e) => handleAssignDoctor(patient.id, e.target.value)}
                            >
                              <option value="" disabled>Select a doctor...</option>
                              {MOCK_DOCTORS.map(d => (
                                <option key={d.id} value={d.id}>{d.name} - {d.specialty}</option>
                              ))}
                            </select>
                          </div>
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
    </div>
  );
}
