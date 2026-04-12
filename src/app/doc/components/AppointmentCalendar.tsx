'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Clock, User, Calendar as CalendarIcon } from 'lucide-react';

type Appointment = {
  id: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  appointment_date: string;
  notes: string;
  patients: { name: string; age: number; gender: string; };
};

export default function AppointmentCalendar({ appointments }: { appointments: Appointment[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar calculations
  const daysInMonth = useMemo(() => {
    const days = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Pad empty squares for first week offset (Sunday = 0)
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [year, month]);

  // Map appointments to date strings for quick lookup
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach(app => {
      const appntDate = new Date(app.appointment_date);
      const dateKey = new Date(appntDate.getFullYear(), appntDate.getMonth(), appntDate.getDate()).toDateString();

      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(app);
    });
    return map;
  }, [appointments]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedDayAppointments = selectedDate ? appointmentsByDate.get(selectedDate.toDateString()) || [] : [];
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={handleNextMonth} className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* WeekDays */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-3 gap-x-2">
        {daysInMonth.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="h-10" />;

          const isToday = new Date().toDateString() === date.toDateString();
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          const dayApps = appointmentsByDate.get(date.toDateString());
          const hasAppointments = !!dayApps && dayApps.length > 0;

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(date)}
              className={`relative h-11 w-full flex items-center justify-center rounded-xl font-semibold text-sm transition-all duration-200 ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-200' :
                  isToday ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'text-slate-700 hover:bg-slate-100 bg-transparent'
                }`}
            >
              <span className="relative z-10">{date.getDate()}</span>
              {hasAppointments && !isSelected && (
                <span className="absolute bottom-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Popover Modal inside Calendar */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="absolute z-50 left-0 right-0 top-full mt-4 bg-white rounded-3xl p-6 shadow-2xl border border-slate-200/60 shadow-slate-300/50 max-h-[300px] overflow-y-auto no-scrollbar"
          >
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  {selectedDayAppointments.length} upcoming session{selectedDayAppointments.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full transition-colors border border-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDayAppointments.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-sm font-medium">
                No upcoming sessions scheduled for this day.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayAppointments.map((app, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-4 sm:items-center bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group">
                    <div className="h-12 w-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-blue-500 group-hover:text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-700">{app.patients?.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{app.patients?.gender} • {app.patients?.age} yrs</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shrink-0 shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-xs font-bold text-slate-700">
                        {new Date(app.appointment_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
