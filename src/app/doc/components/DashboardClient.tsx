'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, UserPlus, MoreVertical,
  Stethoscope, Activity, ArrowRight, CheckCircle2, XCircle, ShieldAlert, ShieldCheck, Clock3
} from 'lucide-react';
import AppointmentCalendar from './AppointmentCalendar';

type Appointment = {
  id: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  appointment_date: string;
  notes: string;
  patients: { id: string; name: string; age: number; gender: string; };
};

export default function DashboardClient({ appointments, verificationStatus = 'none' }: { appointments: Appointment[], verificationStatus?: string }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'past'>('pending');

  useEffect(() => setMounted(true), []);

  const pending = appointments.filter(a => a.status === 'scheduled');
  const past = appointments.filter(a => ['completed', 'cancelled'].includes(a.status));
  const currentList = activeTab === 'pending' ? pending : past;

  return (
    <div style={{ backgroundColor: '#f8fafc', color: '#0f172a' }} className="relative min-h-screen font-sans pb-24">
      {/* Decorative Blob */}
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-12 md:pt-20">

        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">

          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/50 text-blue-700 text-xs font-bold tracking-widest uppercase border border-blue-200">
                 <Activity className="w-4 h-4" /> Doctor Portal
               </div>
               
               {/* Verification Badge */}
               {verificationStatus === 'verified' && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold tracking-widest uppercase border border-emerald-200 shadow-sm">
                    <ShieldCheck className="w-4 h-4" /> Verified Doctor
                  </div>
               )}
               {verificationStatus === 'pending' && (
                  <button onClick={() => router.push('/doctor-details')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold tracking-widest uppercase border border-amber-200 shadow-sm animate-pulse transition-colors cursor-pointer outline-none">
                    <Clock3 className="w-4 h-4" /> Pending Verification
                  </button>
               )}
               {['none', 'rejected'].includes(verificationStatus) && (
                  <button onClick={() => router.push('/doctor-details')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold tracking-widest uppercase border border-slate-900 shadow-sm transition-colors cursor-pointer outline-none">
                    <ShieldAlert className="w-4 h-4 text-amber-400" /> Action Required: Verify Account
                  </button>
               )}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500 pb-1">Doctor</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg pt-1">
              You have <strong className="text-slate-800">{pending.length} sessions</strong> scheduled for today.
            </p>
          </div>

          {/* Fixed Segmented Tab Control */}
          <div className="flex p-2 bg-slate-100/80 rounded-2xl border border-slate-200/60 shadow-inner w-full md:w-fit gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'pending'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
            >
              Upcoming Sessions
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'past'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
            >
              Session History
            </button>
          </div>

        </div>

        {/* Appointment List Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            {currentList.length === 0 ? (
              <div className="bg-white border text-center border-slate-200 rounded-3xl p-16 md:p-32 shadow-sm">
                <CheckCircle2 className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-slate-800 mb-2">You're all caught up!</h3>
                <p className="text-slate-500 text-lg">No {activeTab} appointments to show here.</p>
              </div>
            ) : (
              currentList.map((app, i) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 group"
                >

                  {/* Left: Patient Badge */}
                  <div className="flex items-center gap-5 w-full md:w-80 shrink-0">
                    <div className="h-16 w-16 shrink-0 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 transition-colors duration-300">
                      <Stethoscope className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {app.patients?.name || 'Unknown Patient'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">
                          {app.patients?.gender}
                        </span>
                        <span className="text-sm font-semibold text-slate-500">
                          {app.patients?.age} yrs old
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Clean Time & Date Block */}
                  <div className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 w-full md:w-auto shrink-0">
                    <div className="flex-1 md:flex-none pr-4 md:border-r border-slate-200 mr-2 md:mr-4">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Time
                      </p>
                      <div className="text-slate-800 font-bold px-1">
                        {mounted ? new Date(app.appointment_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '--:--'}
                      </div>
                    </div>
                    <div className="flex-1 md:flex-none hidden md:block">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Date
                      </p>
                      <div className="text-slate-800 font-bold px-1">
                        {mounted ? new Date(app.appointment_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '-- / --'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                    {app.status === 'scheduled' ? (
                      <button
                        onClick={() => router.push(`/patient/${app.patients.id}`)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-95 transition-all"
                      >
                        <UserPlus className="w-4 h-4" /> Start Session
                      </button>
                    ) : (
                      <div className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm border 
                        ${app.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {app.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        {app.status === 'completed' ? 'Completed' : 'Cancelled'}
                      </div>
                    )}

                    <button className="p-4 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl transition-all">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
        
        {/* Calendar Footer */}
        <div className="mt-16 max-w-3xl mx-auto">
           <AppointmentCalendar appointments={appointments} />
        </div>
      </div>
    </div>
  );
}