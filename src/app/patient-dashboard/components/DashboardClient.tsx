'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  MapPin,
  MessageSquarePlus,
  PlusCircle,
  Stethoscope,
  X,
} from 'lucide-react';
import { DUMMY_DOCTOR_ID } from '@/lib/constants';

type ItineraryItem = {
  day: number;
  label: string;
  cost: string;
};

type Visit = {
  id: string;
  date: string;
  disease: string;
  doctorName: string;
  status: string;
  location: string;
  treatmentPlan: string;
  stay?: string;
  estimatedTotalCost?: string;
  itinerary: ItineraryItem[];
  appointmentId?: string;
  appointmentStatus?: string;
};

type MedicalRequestRow = {
  id: string;
  symptoms: string;
  destinations?: string[] | null;
  status?: string | null;
  created_at: string;
};

type TreatmentItineraryRow = {
  id: string;
  created_at: string;
  title: string;
  city?: string | null;
  hospital?: string | null;
  treatment_plan: string;
  stay?: string | null;
  estimated_total_cost?: string | null;
  daily_cost_breakdown?: ItineraryItem[] | null;
  status?: string | null;
};

type AppointmentRow = {
  id: string;
  itinerary_id?: string | null;
  status: string;
  appointment_date: string;
};

export default function DashboardClient() {
  const { user, isLoaded } = useUser();
  const patientId = user?.id;
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetingDate, setMeetingDate] = useState('');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    async function loadRequests() {
      if (!isLoaded) return;
      if (!patientId) {
        setLoading(false);
        return;
      }

      const supabase = createClient();

      try {
        const [{ data: requests }, { data: itineraries }, { data: appointments }] = await Promise.all([
          supabase
            .from('medical_requests')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false }),
          supabase
            .from('treatment_itineraries')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false }),
          supabase
            .from('appointments')
            .select('*')
            .eq('patient_id', patientId)
            .order('appointment_date', { ascending: false }),
        ]);

        const appointmentByItinerary = new Map<string, AppointmentRow>();
        ((appointments || []) as AppointmentRow[]).forEach((appointment) => {
          if (appointment.itinerary_id) {
            appointmentByItinerary.set(appointment.itinerary_id, appointment);
          }
        });

        const requestFallbacks = ((requests || []) as MedicalRequestRow[]).map((request) => ({
          id: request.id,
          date: new Date(request.created_at).toLocaleDateString(),
          disease:
            request.symptoms.length > 40 ? `${request.symptoms.substring(0, 40)}...` : request.symptoms,
          doctorName: 'Pending Assignment',
          status: request.status || 'Under Review',
          location: request.destinations?.join(', ') || 'Not specified',
          treatmentPlan:
            'Your request is under review. Once the doctor finalizes the report and Gemini generates options, they will appear here.',
          itinerary: [{ day: 1, label: 'Awaiting review', cost: 'TBD' }],
        }));

        const liveVisits = ((itineraries || []) as TreatmentItineraryRow[]).map((item) => {
          const appointment = appointmentByItinerary.get(item.id);
          return {
            id: item.id,
            date: new Date(item.created_at).toLocaleDateString(),
            disease: item.title,
            doctorName: 'Assigned Doctor',
            status: appointment?.status || item.status || 'generated',
            location: [item.hospital, item.city].filter(Boolean).join(', ') || 'Not specified',
            treatmentPlan: item.treatment_plan,
            stay: item.stay,
            estimatedTotalCost: item.estimated_total_cost,
            itinerary: Array.isArray(item.daily_cost_breakdown) ? item.daily_cost_breakdown : [],
            appointmentId: appointment?.id,
            appointmentStatus: appointment?.status,
          };
        });

        setVisits(liveVisits.length > 0 ? [...liveVisits, ...requestFallbacks] : requestFallbacks);
      } catch (err) {
        console.error('Failed to load patient dashboard data', err);
      } finally {
        setLoading(false);
      }
    }

    loadRequests();
  }, [isLoaded, patientId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending_patient':
      case 'pending_doctor':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'generated':
      case 'Report Sent':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Under Review':
        return 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const approveMeeting = async () => {
    if (!selectedVisit?.appointmentId) return;
    setActionMessage('');
    const response = await fetch('/api/patient/respond-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentId: selectedVisit.appointmentId,
        approvedBy: 'patient',
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setActionMessage('Meeting approved. It is now scheduled with the doctor.');
      setSelectedVisit({ ...selectedVisit, appointmentStatus: 'scheduled', status: 'scheduled' });
    } else {
      setActionMessage(data.error || 'Unable to approve the meeting.');
    }
  };

  const requestMeeting = async () => {
    if (!selectedVisit || !patientId || !meetingDate) return;
    setActionMessage('');
    const response = await fetch('/api/patient/request-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        itineraryId: selectedVisit.id,
        appointmentDate: meetingDate,
        doctorId: DUMMY_DOCTOR_ID,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setActionMessage('Meeting request sent to the doctor for approval.');
      setSelectedVisit({
        ...selectedVisit,
        appointmentId: data.appointment.id,
        appointmentStatus: 'pending_doctor',
        status: 'pending_doctor',
      });
    } else {
      setActionMessage(data.error || 'Unable to request a meeting.');
    }
  };

  const submitFeedback = async () => {
    if (!selectedVisit || !patientId || !feedback.trim()) return;
    setActionMessage('');
    const response = await fetch('/api/patient/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentId: selectedVisit.appointmentId,
        patientId,
        doctorId: DUMMY_DOCTOR_ID,
        rating,
        feedback,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setActionMessage('Feedback submitted successfully.');
      setFeedback('');
    } else {
      setActionMessage(data.error || 'Unable to submit feedback.');
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
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-4xl font-light text-slate-800 tracking-tight">
              Patient <span className="font-semibold text-blue-600">Portal</span>
            </h1>
            <p className="mt-2 text-slate-500">
              Review generated treatment itineraries, approve meetings, and track your medical trips.
            </p>
          </div>

          <Link href="/patient-dashboard/new-visit">
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
              <PlusCircle className="w-5 h-5" />
              Lodge a New Visit
            </button>
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  transition={{ delay: index * 0.06 }}
                  key={visit.id}
                  onClick={() => {
                    setSelectedVisit(visit);
                    setActionMessage('');
                  }}
                  className="group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 transform origin-left scale-y-0 group-hover:scale-y-100 transition-transform duration-300 ease-out" />

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${getStatusColor(
                          visit.status
                        )}`}
                      >
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

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute -right-6 -top-6 opacity-10">
                <Stethoscope className="w-48 h-48" />
              </div>
              <h3 className="text-2xl font-bold mb-2 relative z-10">Treatment plans are now automatic</h3>
              <p className="text-blue-100 mb-6 text-sm leading-relaxed relative z-10">
                Once the doctor submits the AI-reviewed report, itinerary options appear here for later review.
              </p>
              <Link href="/patient-dashboard/new-visit">
                <button className="w-full bg-white text-indigo-900 font-bold py-3 px-4 rounded-xl shadow hover:bg-blue-50 transition-colors relative z-10">
                  Plan Next Visit
                </button>
              </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" /> What Happens Next
              </h4>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Doctor reviews your uploads and sends the summary.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Gemini creates multiple treatment and tourism plan options.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  You can approve a meeting or request one from the selected plan.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedVisit && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVisit(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-4 md:inset-8 lg:inset-12 bg-white shadow-2xl z-50 overflow-y-auto rounded-3xl border border-slate-200"
            >
              <div className="p-6 md:p-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border mb-3 ${getStatusColor(
                        selectedVisit.status
                      )}`}
                    >
                      {selectedVisit.status}
                    </span>
                    <h2 className="text-3xl font-bold text-slate-900">{selectedVisit.disease}</h2>
                    <div className="text-slate-500 flex items-center gap-2 mt-2">
                      <Calendar className="w-4 h-4" /> {selectedVisit.date}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedVisit(null)}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Info Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-blue-100 p-2 rounded-xl">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-xs text-blue-500 font-bold uppercase tracking-wide">Doctor</p>
                    </div>
                    <p className="font-bold text-slate-800 text-lg">{selectedVisit.doctorName}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-emerald-100 p-2 rounded-xl">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                      </div>
                      <p className="text-xs text-emerald-500 font-bold uppercase tracking-wide">Location</p>
                    </div>
                    <p className="font-bold text-slate-800 text-lg">{selectedVisit.location}</p>
                  </div>
                  {selectedVisit.estimatedTotalCost && (
                    <div className="bg-violet-50 rounded-2xl p-5 border border-violet-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-violet-100 p-2 rounded-xl">
                          <Activity className="w-5 h-5 text-violet-600" />
                        </div>
                        <p className="text-xs text-violet-500 font-bold uppercase tracking-wide">Estimated Cost</p>
                      </div>
                      <p className="font-bold text-slate-800 text-lg">{selectedVisit.estimatedTotalCost}</p>
                    </div>
                  )}
                </div>

                {/* Treatment Plan */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 mb-8">
                  <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400 mb-3">
                    Treatment Plan
                  </h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">{selectedVisit.treatmentPlan}</p>
                  {selectedVisit.stay && (
                    <p className="text-sm text-slate-500 mt-4 font-medium">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Expected stay: {selectedVisit.stay}
                    </p>
                  )}
                </div>

                {/* Day-wise Itinerary */}
                {selectedVisit.itinerary.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <Activity className="w-5 h-5" /> Day-wise Itinerary & Cost
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedVisit.itinerary.map((item, index) => (
                        <div
                          key={index}
                          className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 transition-all"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                              Day {item.day}
                            </span>
                            <span className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded-full">
                              {item.cost}
                            </span>
                          </div>
                          <p className="text-slate-700 font-medium leading-relaxed">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Meeting Actions */}
                  <div>
                    {selectedVisit.appointmentStatus === 'pending_patient' && (
                      <button
                        onClick={approveMeeting}
                        className="w-full mb-4 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all"
                      >
                        Approve Doctor-Proposed Meeting
                      </button>
                    )}

                    {!selectedVisit.appointmentId && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400 mb-3">
                          Request a Meeting
                        </h3>
                        <input
                          type="datetime-local"
                          value={meetingDate}
                          onChange={(event) => setMeetingDate(event.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 mb-3"
                        />
                        <button
                          onClick={requestMeeting}
                          className="w-full px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all"
                        >
                          Request Doctor Approval
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Feedback */}
                  {selectedVisit.appointmentStatus === 'completed' && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400 mb-3">
                        Feedback For Doctor
                      </h3>
                      <select
                        value={rating}
                        onChange={(event) => setRating(Number(event.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium mb-3"
                      >
                        {[5, 4, 3, 2, 1].map((option) => (
                          <option key={option} value={option}>
                            {option} Star{option > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={feedback}
                        onChange={(event) => setFeedback(event.target.value)}
                        placeholder="Share your experience with the doctor."
                        className="w-full min-h-[100px] bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium resize-none mb-3"
                      />
                      <button
                        onClick={submitFeedback}
                        className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                        Submit Feedback
                      </button>
                    </div>
                  )}
                </div>

                {actionMessage && (
                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-700">
                    {actionMessage}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
