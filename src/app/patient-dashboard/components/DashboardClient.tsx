'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Stethoscope, 
  Activity,
  PlusCircle,
  FileText,
  Clock,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react';

// --- Types ---
type ItineraryItem = {
  day: number;
  date: string;
  activity: string;
  details: string;
}

type Visit = {
  id: string;
  date: string;
  disease: string;
  doctorName: string;
  status: 'Upcoming' | 'Completed' | 'In Progress' | 'Under Review' | string;
  location: string;
  itinerary: ItineraryItem[];
};

// --- Mock Defaults (if no DB connected yet) ---
const MOCK_VISITS: Visit[] = [
  {
    id: 'v1',
    date: 'Oct 15, 2025',
    disease: 'Cardiac Arrhythmia Assessment',
    doctorName: 'Dr. Sarah Jenkins',
    status: 'Upcoming',
    location: 'Mount Sinai Heart Center, NY',
    itinerary: [
      { day: 1, date: 'Oct 15', activity: 'Arrival & Check-in', details: 'Check-in at the hotel. Evening vital signs monitoring by attending nurse.' },
      { day: 2, date: 'Oct 16', activity: 'Consultation & Diagnostics', details: 'Initial consultation with Dr. Jenkins at 10:00 AM. ECG and Echo-cardiogram scheduled for 1:00 PM.' },
      { day: 3, date: 'Oct 17', activity: 'Follow-up & Discharge', details: 'Review of diagnostic reports. Treatment plan discussion. Final discharge at 4:00 PM.' }
    ]
  }
];

export default function DashboardClient() {
  const { user, isLoaded } = useUser();
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [visits, setVisits] = useState<Visit[]>(MOCK_VISITS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequests() {
      if (!isLoaded) return;
      if (!user) {
        setLoading(false);
        return;
      }

      const supabase = createClient();
      
      try {
        const { data, error } = await supabase
          .from('medical_requests')
          .select('*')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching requests:", error);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const fetchedVisits: Visit[] = data.map((req: any) => ({
            id: req.id,
            date: new Date(req.created_at).toLocaleDateString(),
            disease: req.symptoms.length > 30 ? req.symptoms.substring(0, 30) + '...' : req.symptoms,
            doctorName: "Pending Assignment",
            status: req.status || 'Under Review',
            location: req.destinations && req.destinations.length > 0 ? req.destinations.join(', ') : 'Not Specified',
            itinerary: [
              {
                day: 1,
                date: 'TBD',
                activity: 'Request Submitted',
                details: 'Your request is currently being reviewed by our administration team. Once a specialized medical package is curated, it will be mapped here.'
              }
            ]
          }));

          // Merge live requests with mock baseline for UI demonstration
          setVisits([...fetchedVisits, ...MOCK_VISITS]);
        }
      } catch (err) {
        console.error("Failed to load requests", err);
      } finally {
        setLoading(false);
      }
    }

    loadRequests();
  }, [user, isLoaded]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Under Review': return 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 pt-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-4xl font-light text-slate-800 tracking-tight">
              Patient <span className="font-semibold text-blue-600">Portal</span>
            </h1>
            <p className="mt-2 text-slate-500">Manage your medical travels, view itineraries, and book new checkups.</p>
          </div>
          
          <Link href="/patient-dashboard/new-visit">
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
              <PlusCircle className="w-5 h-5" />
              Lodge a New Visit
            </button>
          </Link>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Area: Past/Upcoming Visits */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-slate-800">
              <Clock className="w-6 h-6 text-slate-400" />
              Your Medical Journeys
            </h2>
            
            <div className="space-y-4">
              {visits.map((visit, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={visit.id}
                  onClick={() => setSelectedVisit(visit)}
                  className="group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 transform origin-left scale-y-0 group-hover:scale-y-100 transition-transform duration-300 ease-out" />
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${getStatusColor(visit.status)}`}>
                        {visit.status}
                      </span>
                      <h3 className="text-xl font-bold mt-3 text-slate-900 group-hover:text-blue-600 transition-colors">
                        {visit.disease}
                      </h3>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-slate-400 border border-slate-100">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-slate-700">{visit.doctorName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span className="truncate">{visit.location}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details <Activity className="w-4 h-4 ml-1" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quick Actions / Info Panel */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute -right-6 -top-6 opacity-10">
                <Stethoscope className="w-48 h-48" />
              </div>
              <h3 className="text-2xl font-bold mb-2 relative z-10">Ready for a checkup?</h3>
              <p className="text-blue-100 mb-6 text-sm leading-relaxed relative z-10">
                Lodge a new visit request to get comprehensive health checkup packages curated by world-class specialists.
              </p>
              <Link href="/patient-dashboard/new-visit">
                <button className="w-full bg-white text-indigo-900 font-bold py-3 px-4 rounded-xl shadow hover:bg-blue-50 transition-colors relative z-10">
                  Plan Next Visit
                </button>
              </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" /> Quick Links
              </h4>
              <ul className="space-y-3 text-sm">
                <li><a className="text-slate-600 hover:text-blue-600 flex items-center gap-2 transition-colors cursor-pointer"><CheckCircle className="w-4 h-4 text-emerald-500"/> Personal Information</a></li>
                <li><a className="text-slate-600 hover:text-blue-600 flex items-center gap-2 transition-colors cursor-pointer"><CheckCircle className="w-4 h-4 text-emerald-500"/> Document Vault</a></li>
                <li><a className="text-slate-600 hover:text-blue-600 flex items-center gap-2 transition-colors cursor-pointer"><CheckCircle className="w-4 h-4 text-emerald-500"/> Payment History</a></li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* Itinerary Modal */}
      <AnimatePresence>
        {selectedVisit && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVisit(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ opacity: 0, x: '100%', scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: '100%', scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto border-l border-slate-200"
            >
              <div className="p-6">
                <button 
                  onClick={() => setSelectedVisit(null)}
                  className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border mb-4 mt-2 ${getStatusColor(selectedVisit.status)}`}>
                  {selectedVisit.status}
                </span>

                <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedVisit.disease}</h2>
                <div className="text-slate-500 flex items-center gap-2 mb-6">
                  <Calendar className="w-4 h-4" /> {selectedVisit.date}
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-8 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg"><Stethoscope className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Consulting Doctor</p>
                      <p className="font-semibold text-slate-800">{selectedVisit.doctorName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg"><MapPin className="w-5 h-5 text-emerald-600" /></div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Location</p>
                      <p className="font-semibold text-slate-800">{selectedVisit.location}</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" /> Detailed Itinerary
                </h3>

                <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-8">
                  {selectedVisit.itinerary.map((item, index) => (
                    <div key={index} className="relative pl-6">
                      <span className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 shadow-sm ${selectedVisit.status === 'Under Review' ? 'bg-white border-orange-500' : 'bg-white border-blue-500'}`} />
                      <div>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-bold text-slate-800">Day {item.day}</span>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{item.date}</span>
                        </div>
                        <h4 className="font-semibold text-slate-700 text-[15px] mb-2">{item.activity}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                          {item.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
