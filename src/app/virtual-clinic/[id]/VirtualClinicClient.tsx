'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, FileText, Activity, Save, Edit3, Check, Stethoscope,
  ActivitySquare, AlertCircle, Sparkles, MessageSquarePlus, RefreshCw
} from 'lucide-react';

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  contact_info?: string;
};

type Appointment = {
  id: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  appointment_date: string;
  notes?: string;
};

type Document = {
  id: string;
  name: string;
  size: string;
  created_at: string;
  url?: string;
};

export default function VirtualClinicClient({
  patient,
  appointments,
  documents,
  medicalRequests
}: {
  patient: Patient,
  appointments: Appointment[],
  documents: Document[],
  medicalRequests: any[]
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // States for Notes and Comments
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState(() => {
    if (medicalRequests && medicalRequests.length > 0) {
      const latestRequest = medicalRequests[0];
      return `Patient presented with the following recorded symptoms:\n"${latestRequest.symptoms}"\n\nClinical Assessment:`
    }
    return "";
  });

  const [doctorComments, setDoctorComments] = useState('');

  // AI Suggestions States
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => setMounted(true), []);

  const latestNotes = appointments.find(a => a.notes)?.notes || "Routine Health Maintenance";
  const pastAppointments = appointments.filter(a => a.status !== 'scheduled');

  const handleSaveAll = () => {
    setIsEditingNotes(false);
    // Future: Save both notes and comments to the database
  };

  const generateSuggestions = async () => {
    if (!clinicalNotes && !doctorComments) return;
    setIsGenerating(true);
    setSuggestions([]);

    try {
      const response = await fetch('/api/generate-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicalNotes, doctorComments })
      });
      
      const data = await response.json();
      
      if (response.ok && data.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        console.error('Failed to get suggestions:', data.error);
        setSuggestions(["Error generating suggestions. Please check your API configuration."]);
      }
    } catch (err) {
      console.error('Network error getting suggestions:', err);
      setSuggestions(["Network error generating suggestions."]);
    } finally {
      setIsGenerating(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setDoctorComments(prev => prev ? `${prev}\n\n${suggestion}` : suggestion);
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', color: '#0f172a' }} className="relative min-h-screen font-sans pb-32 overflow-hidden">
      {/* Background Decor */}
      <div className="fixed top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-blue-100/40 blur-[150px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-100/30 blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-[90rem] mx-auto px-4 md:px-8 pt-8 md:pt-12">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push(`/patient/${patient.id}`)}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors group"
          >
            <div className="p-2 rounded-xl bg-white border border-slate-200 group-hover:border-blue-200 shadow-sm">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back to Patient Profile
          </button>

          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
            <Stethoscope className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">VIRTUAL CLINIC SESSION</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN: Medical Records (3/12 width) */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">

            {/* Minimal Patient Profile */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg shadow-slate-200/20"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-400 p-[2px] shadow-sm">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                    <span className="text-xl font-black text-white">
                      {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </span>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">{patient.name}</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{patient.age} yrs • {patient.gender}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Primary Condition</p>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold text-slate-700 line-clamp-2">{latestNotes}</p>
                </div>
              </div>
            </motion.div>

            {/* Quick History Component */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg shadow-slate-200/20"
            >
              <div className="flex items-center gap-2 mb-4">
                <ActivitySquare className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900">Recent History</h3>
              </div>

              <div className="space-y-4 relative border-l-2 border-slate-100 ml-2 py-1">
                {pastAppointments.slice(0, 3).map((app, idx) => (
                  <div key={idx} className="relative pl-4">
                    <div className="absolute left-[-9px] top-1 w-4 h-4 rounded-full border-[3px] border-white bg-indigo-200" />
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">
                      {mounted ? new Date(app.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '...'}
                    </p>
                    <p className="text-xs font-medium text-slate-600 line-clamp-2">
                      {app.notes || 'Routine checkup.'}
                    </p>
                  </div>
                ))}
                {pastAppointments.length === 0 && (
                  <p className="pl-4 text-xs text-slate-400 italic">No previous sessions.</p>
                )}
              </div>
            </motion.div>

            {/* Quick Documents View */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg shadow-slate-200/20"
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Reports</h3>
              </div>
              <div className="space-y-2">
                {documents.slice(0, 3).map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors cursor-pointer" onClick={() => doc.url && window.open(doc.url, '_blank')}>
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                      <FileText className="w-3 h-3" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 line-clamp-1">{doc.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{doc.size}</p>
                    </div>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-xs text-slate-400 italic font-medium pt-2">No documents attached.</p>
                )}
              </div>
            </motion.div>

          </div>

          {/* RIGHT COLUMN: Interactive Workspace (9/12 width) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">

            {/* Main AI Clinical Notes Editor */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-[2rem] border border-slate-200/80 shadow-2xl shadow-slate-200/40 overflow-hidden flex flex-col relative"
            >
              {/* Header */}
              <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100/50 rounded-xl">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Clinical Notes Draft</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">AI Generated Report</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {isEditingNotes ? (
                    <button
                      onClick={() => setIsEditingNotes(false)}
                      className="px-5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-sm font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Done Editing
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" /> Edit Draft
                    </button>
                  )}
                </div>
              </div>

              {/* Editor Area */}
              <div className="p-8 relative isolate">
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none -z-10" />

                {isEditingNotes ? (
                  <textarea
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    autoFocus
                    className="w-full min-h-[250px] p-6 text-slate-700 bg-white/80 backdrop-blur-sm border-2 border-blue-200 rounded-2xl resize-none focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium text-[15px] leading-relaxed shadow-inner"
                    placeholder="Enter clinical notes here..."
                  />
                ) : (
                  <div
                    className="w-full min-h-[250px] p-6 text-slate-800 bg-transparent rounded-2xl font-medium text-[15px] leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-slate-50 border-2 border-transparent hover:border-slate-100 transition-all group"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    {clinicalNotes ? clinicalNotes : <span className="text-slate-400 italic">No text provided. Click to add notes.</span>}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Doctor Comments & AI Suggestions Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Doctor Comments Box */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-xl shadow-slate-200/20 flex flex-col h-full"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-indigo-50 rounded-xl">
                    <MessageSquarePlus className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Doctor Comments</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Additional Observations</p>
                  </div>
                </div>

                <textarea
                  value={doctorComments}
                  onChange={(e) => setDoctorComments(e.target.value)}
                  className="w-full flex-1 min-h-[160px] p-4 text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium text-sm leading-relaxed"
                  placeholder="Type any additional remarks, prescriptive notes, or private observations here..."
                />
              </motion.div>

              {/* AI Insight Suggestions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-1 border border-slate-700 shadow-xl shadow-slate-900/20 h-full relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[60px] pointer-events-none rounded-full" />
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-[1.8rem] p-6 h-full flex flex-col">

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                        <Sparkles className="w-4 h-4 text-blue-300" />
                      </div>
                      <h2 className="text-white font-bold tracking-wide">AI Assistant</h2>
                    </div>

                    <button
                      onClick={generateSuggestions}
                      disabled={isGenerating || (!clinicalNotes && !doctorComments)}
                      className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors border border-white/10"
                      title="Analyze contexts & generate suggestions"
                    >
                      <RefreshCw className={`w-4 h-4 text-blue-300 ${isGenerating ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                    {!isGenerating && suggestions.length === 0 && (
                      <div className="m-auto text-center p-4">
                        <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-400">Click the refresh icon to scan the notes and generate clinical suggestions.</p>
                      </div>
                    )}

                    {isGenerating && (
                      <div className="m-auto flex flex-col items-center gap-3">
                        <span className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
                        <p className="text-xs font-bold text-blue-300 uppercase tracking-widest animate-pulse">Analyzing Context...</p>
                      </div>
                    )}

                    <AnimatePresence>
                      {!isGenerating && suggestions.map((suggestion, idx) => (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          key={idx}
                          className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                          onClick={() => applySuggestion(suggestion)}
                        >
                          <p className="text-sm text-slate-300 text-left font-medium leading-relaxed group-hover:text-white transition-colors">{suggestion}</p>
                          <div className="mt-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Click to append</span>
                            <MessageSquarePlus className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

            </div>

            {/* Final Save Action */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="flex justify-end pt-4 pb-10"
            >
              <button
                onClick={handleSaveAll}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black tracking-wide rounded-2xl shadow-xl shadow-blue-600/20 hover:-translate-y-1 transition-all flex items-center gap-3"
              >
                <Save className="w-5 h-5" /> Commit Session Records
              </button>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
