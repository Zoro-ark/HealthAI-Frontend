'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, FileText, Activity, Calendar, Clock, Download, 
  Stethoscope, ShieldAlert, Phone, RefreshCw, CheckCircle2 
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

export default function PatientDetailsClient({ 
  patient, 
  appointments,
  documents
}: { 
  patient: Patient, 
  appointments: Appointment[],
  documents: Document[]
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Compute "Disease/Condition" from the most recent clinical notes if available, else generic.
  const latestNotes = appointments.find(a => a.notes)?.notes || "Routine Health Maintenance";
  const nextSession = appointments.find(a => a.status === 'scheduled');

  return (
    <div style={{ backgroundColor: '#f8fafc', color: '#0f172a' }} className="relative min-h-screen font-sans pb-32">
      {/* Background Decor */}
      <div className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-blue-100/30 blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-10 md:pt-16">
        
        {/* Navigation & Header */}
        <button 
          onClick={() => router.push('/doc')}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm mb-8 transition-colors group"
        >
          <div className="p-2 rounded-xl bg-white border border-slate-200 group-hover:border-blue-200 shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Back to Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Profile & Primary Info */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Patient ID Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
              className="bg-white rounded-[2rem] p-8 border border-slate-200/80 shadow-lg shadow-slate-200/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] pointer-events-none rounded-full" />
              
              <div className="h-24 w-24 rounded-[1.5rem] bg-gradient-to-br from-blue-600 to-teal-400 p-[3px] shadow-xl shadow-blue-500/30 mb-6">
                 <div className="w-full h-full bg-slate-900 rounded-[1.3rem] flex items-center justify-center">
                    <span className="text-3xl font-black text-white">
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </span>
                 </div>
              </div>
              
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">
                {patient.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-2 mb-8">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-lg border border-slate-200/60">
                  {patient.gender}
                </span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-widest rounded-lg border border-blue-100">
                  {patient.age} YRS OLD
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Contact</p>
                    <p className="font-semibold text-slate-700 text-sm">{patient.contact_info || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Current Active Disease / Condition */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-[2rem] p-8 border border-red-100 shadow-lg shadow-red-500/5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/10 blur-[40px] pointer-events-none rounded-full" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-50 rounded-xl">
                  <ShieldAlert className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Primary Condition</h2>
              </div>
              
              <p className="text-xl font-bold text-slate-800 leading-snug">
                {latestNotes}
              </p>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: History, Reports, Active Session */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Action Banner (If session exists) */}
            {nextSession ? (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                 className="bg-slate-900 rounded-[2rem] p-8 md:p-10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative"
               >
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[60px] pointer-events-none rounded-full" />
                 <div className="relative z-10">
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-black uppercase tracking-widest rounded-lg mb-4">
                     <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Upcoming Session
                   </div>
                   <h2 className="text-3xl font-black text-white mb-2">Ready to initiate?</h2>
                   <p className="text-slate-400 font-medium flex items-center gap-2">
                     <Clock className="w-4 h-4" /> 
                     {mounted ? new Date(nextSession.appointment_date).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' }) : 'Loading...'}
                   </p>
                 </div>
                 
                 <button onClick={() => router.push('/virtual-clinic/' + patient.id)} className="relative z-10 px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-2xl shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 w-full md:w-auto">
                   <Stethoscope className="w-5 h-5" /> Enter Virtual Clinic
                 </button>
               </motion.div>
            ) : (
               <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100 flex items-center gap-4">
                 <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                 <div>
                   <h3 className="text-lg font-bold text-emerald-900">All caught up</h3>
                   <p className="text-emerald-700/80 font-medium">There are no upcoming sessions scheduled for this patient.</p>
                 </div>
               </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Medical Reports (S3 Uploads View) */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white rounded-[2rem] p-8 border border-slate-200/80 shadow-lg shadow-slate-200/20"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-teal-50 rounded-xl">
                      <FileText className="w-6 h-6 text-teal-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Uploaded Reports</h2>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase">{documents.length} Files</span>
                </div>

                <div className="space-y-4">
                  {documents.length > 0 ? documents.map((report, idx) => (
                    <div key={report.id || idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors group cursor-pointer" onClick={() => report.url && window.open(report.url, '_blank')}>
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center border border-slate-200">
                             <FileText className="w-4 h-4 text-slate-400 group-hover:text-teal-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{report.name}</p>
                            <p className="text-xs text-slate-500 font-medium">{report.size} • {mounted ? new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '...'}</p>
                          </div>
                       </div>
                       {report.url ? (
                         <a 
                           href={report.url} 
                           download={report.name}
                           onClick={(e) => e.stopPropagation()}
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="p-2 text-slate-400 hover:text-teal-600 bg-white shadow-sm border border-slate-200 rounded-lg flex items-center justify-center"
                         >
                           <Download className="w-4 h-4" />
                         </a>
                       ) : (
                         <button disabled className="p-2 text-slate-400 opacity-50 cursor-not-allowed bg-white shadow-sm border border-slate-200 rounded-lg">
                           <Download className="w-4 h-4" />
                         </button>
                       )}
                    </div>
                  )) : (
                    <p className="text-sm font-medium text-slate-500 italic p-4 text-center">No documents uploaded yet.</p>
                  )}
                </div>
              </motion.div>

              {/* Consultation History */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="bg-white rounded-[2rem] p-8 border border-slate-200/80 shadow-lg shadow-slate-200/20"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <Activity className="w-6 h-6 text-orange-500" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Session History</h2>
                </div>

                <div className="space-y-0 relative border-l-2 border-slate-100 ml-4 py-2">
                   {appointments.filter(a => a.status !== 'scheduled').map((app, idx) => (
                     <div key={idx} className="relative pl-8 pb-8 last:pb-0">
                        <div className="absolute left-[-9px] top-1 w-4 h-4 rounded-full border-4 border-white bg-slate-300 ring-1 ring-slate-200" />
                        
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">
                          {mounted ? new Date(app.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '...'}
                        </p>
                        
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mt-2">
                           <div className="flex items-center gap-2 mb-2">
                             {app.status === 'completed' ? (
                               <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-md">Completed</span>
                             ) : (
                               <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold uppercase rounded-md">Cancelled</span>
                             )}
                           </div>
                           <p className="text-sm font-medium text-slate-600 line-clamp-3">
                             {app.notes || 'No extensive clinical notes recorded for this past session.'}
                           </p>
                        </div>
                     </div>
                   ))}
                   
                   {appointments.filter(a => a.status !== 'scheduled').length === 0 && (
                     <p className="pl-6 text-sm text-slate-400 font-medium italic">No past history recorded.</p>
                   )}
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
