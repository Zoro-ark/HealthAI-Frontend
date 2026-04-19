'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  FileText,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Save,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { DUMMY_DOCTOR_ID } from '@/lib/constants';
import type {
  AnalysisType,
  ClinicalAnalysisResponse,
  PatientDocument,
  PatientProfile,
} from '@/lib/medical-workflow';

type Appointment = {
  id: string;
  status: string;
  appointment_date: string;
  notes?: string;
  created_by?: string;
};

function formatSize(size: string | number) {
  const value = typeof size === 'string' ? Number(size) : size;
  if (!value || Number.isNaN(value)) return 'Unknown size';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VirtualClinicClient({
  patient,
  appointments,
  documents,
  request,
}: {
  patient: PatientProfile;
  appointments: Appointment[];
  documents: PatientDocument[];
  request: {
    id: string;
    symptoms?: string | null;
    destinations?: string[] | null;
    budget_range?: string | null;
  } | null;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [analysisTypes, setAnalysisTypes] = useState<Record<string, AnalysisType>>({});
  const [analysis, setAnalysis] = useState<ClinicalAnalysisResponse | null>(null);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [doctorComments, setDoctorComments] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const nextState: Record<string, AnalysisType> = {};
    documents.forEach((document) => {
      nextState[document.id] = analysisTypes[document.id] || 'ocr_only';
    });
    setAnalysisTypes(nextState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents.length]);

  const latestNotes =
    request?.symptoms ||
    appointments.find((appointment) => appointment.notes)?.notes ||
    'Routine health maintenance';

  const pendingApproval = appointments.find(
    (appointment) => appointment.status === 'pending_doctor'
  );

  const requestContext = useMemo(() => {
    return {
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        symptoms: latestNotes,
      },
      documents: documents
        .filter((document) => document.url)
        .map((document) => ({
          id: document.id,
          name: document.name,
          url: document.url,
          analysis_type: analysisTypes[document.id] || 'ocr_only',
        })),
      doctor_suggestions: doctorComments,
    };
  }, [analysisTypes, doctorComments, documents, latestNotes, patient]);

  const runAnalysis = async () => {
    if (requestContext.documents.length === 0) {
      setStatusMessage('No patient documents are available for analysis.');
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage('');

    try {
      const response = await fetch('/api/doctor/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestContext),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed.');
      }

      setAnalysis(data);
      setSummaryDraft(data.biogpt_summary || '');
      setStatusMessage('Analysis complete. Review the generated draft before sending it.');
    } catch (error: unknown) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to run analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submitReport = async () => {
    if (!summaryDraft.trim()) {
      setStatusMessage('A summary is required before sending the report.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('');

    try {
      const response = await fetch('/api/doctor/submit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: {
            id: patient.id,
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            symptoms: latestNotes,
          },
          analysis,
          summary: summaryDraft,
          doctorNotes: doctorComments,
          meetingDate: meetingDate || null,
          destinations: request?.destinations || [],
          budgetRange: request?.budget_range || null,
          doctorId: DUMMY_DOCTOR_ID,
          requestId: request?.id || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to submit the report.');
      }

      setStatusMessage(
        `Report sent successfully. ${data.itinerariesCreated || 0} itinerary option(s) generated for the patient.`
      );
    } catch (error: unknown) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to submit the report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const approvePatientMeeting = async () => {
    if (!pendingApproval) return;

    setIsSubmitting(true);
    setStatusMessage('');

    try {
      const response = await fetch('/api/patient/respond-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: pendingApproval.id,
          approvedBy: 'doctor',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to approve the requested meeting.');
      }

      setStatusMessage('Patient-requested meeting approved and moved to scheduled status.');
    } catch (error: unknown) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unable to approve the requested meeting.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}
      className="relative min-h-screen font-sans pb-32 overflow-hidden"
    >
      <div className="fixed top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-blue-100/40 blur-[150px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-100/30 blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-[92rem] mx-auto px-4 md:px-8 pt-8 md:pt-12">
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
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg shadow-slate-200/20"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-400 p-[2px] shadow-sm">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                    <span className="text-xl font-black text-white">
                      {patient.name
                        .split(' ')
                        .map((name) => name[0])
                        .join('')
                        .substring(0, 2)}
                    </span>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">{patient.name}</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {patient.age} yrs • {patient.gender}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Primary Condition
                </p>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold text-slate-700">{latestNotes}</p>
                </div>
              </div>
            </motion.div>

            {pendingApproval && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-amber-50 rounded-3xl p-6 border border-amber-200 shadow-lg shadow-amber-100/50"
              >
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 mb-2">
                  Patient Requested Meeting
                </p>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                  {mounted
                    ? new Date(pendingApproval.appointment_date).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : pendingApproval.appointment_date}
                </p>
                <button
                  onClick={approvePatientMeeting}
                  disabled={isSubmitting}
                  className="mt-4 w-full px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold transition-colors disabled:opacity-60"
                >
                  Approve Meeting
                </button>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg shadow-slate-200/20"
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Uploaded Reports</h3>
              </div>

              <div className="space-y-3">
                {documents.map((document) => (
                  <div key={document.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800 line-clamp-2">{document.name}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          {formatSize(document.size)}
                        </p>
                      </div>
                      {document.url && (
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-blue-600"
                        >
                          Open
                        </a>
                      )}
                    </div>
                    <select
                      value={analysisTypes[document.id] || 'ocr_only'}
                      onChange={(event) =>
                        setAnalysisTypes((current) => ({
                          ...current,
                          [document.id]: event.target.value as AnalysisType,
                        }))
                      }
                      className="mt-3 w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="ocr_only">Prescription / text report</option>
                      <option value="xray">X-ray image</option>
                      <option value="ct">CT scan</option>
                      <option value="mri">MRI</option>
                    </select>
                  </div>
                ))}

                {documents.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No documents attached.</p>
                )}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] border border-slate-200/80 shadow-2xl shadow-slate-200/40 overflow-hidden"
            >
              <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100/50 rounded-xl">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Doctor Analysis Workspace</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                      OCR → ClinicalBERT → Imaging → BioGPT
                    </p>
                  </div>
                </div>

                <button
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Running Analysis
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" /> Start Analysis
                    </>
                  )}
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="w-5 h-5 text-slate-500" />
                      <h3 className="text-base font-bold text-slate-900">Editable Summary Draft</h3>
                    </div>
                    <textarea
                      value={summaryDraft}
                      onChange={(event) => setSummaryDraft(event.target.value)}
                      className="w-full min-h-[260px] p-5 text-slate-700 bg-white border border-slate-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium text-sm leading-relaxed"
                      placeholder="Run analysis to generate the BioGPT summary draft, then edit it before sending."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-4">
                        ClinicalBERT Findings
                      </p>
                      <div className="space-y-3">
                        {(analysis?.clinicalbert_findings || []).map((finding, index) => (
                          <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-medium text-slate-700">{finding}</p>
                          </div>
                        ))}
                        {!analysis?.clinicalbert_findings?.length && (
                          <p className="text-sm text-slate-400 italic">
                            No ranked findings yet. Start analysis first.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-4">
                        Imaging Findings
                      </p>
                      <div className="space-y-3">
                        {(analysis?.imaging_findings || []).map((finding, index) => (
                          <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-1">
                              {finding.modality}
                            </p>
                            <p className="text-sm font-semibold text-slate-800">{finding.document_name}</p>
                            <p className="text-sm text-slate-600 mt-2">{finding.summary}</p>
                          </div>
                        ))}
                        {!analysis?.imaging_findings?.length && (
                          <p className="text-sm text-slate-400 italic">
                            Imaging output will appear here when X-ray, CT, or MRI files are selected.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 text-white rounded-[1.75rem] p-6 border border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                      <MessageSquarePlus className="w-5 h-5 text-blue-300" />
                      <div>
                        <h3 className="font-bold">Doctor Suggestions</h3>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
                          Optional additions
                        </p>
                      </div>
                    </div>
                    <textarea
                      value={doctorComments}
                      onChange={(event) => setDoctorComments(event.target.value)}
                      className="w-full min-h-[220px] p-4 text-slate-100 bg-white/5 border border-white/10 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                      placeholder="Add treatment priorities, preferred hospitals, travel constraints, or any detail you want Gemini to consider."
                    />
                  </div>

                  <div className="bg-white rounded-[1.75rem] p-6 border border-slate-200 shadow-lg shadow-slate-200/20">
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h3 className="font-bold text-slate-900">Optional Follow-up Meeting</h3>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
                          Creates a patient approval request
                        </p>
                      </div>
                    </div>
                    <input
                      type="datetime-local"
                      value={meetingDate}
                      onChange={(event) => setMeetingDate(event.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <div className="bg-white rounded-[1.75rem] p-6 border border-slate-200 shadow-lg shadow-slate-200/20">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-3">
                      Models Used
                    </p>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>OCR: {analysis?.models_used?.ocr || 'Configured in ML service'}</p>
                      <p>ClinicalBERT: {analysis?.models_used?.clinicalbert || 'Bio_ClinicalBERT'}</p>
                      <p>BioGPT: {analysis?.models_used?.biogpt || 'microsoft/biogpt'}</p>
                      <p>X-ray: {analysis?.models_used?.imaging?.xray || 'torchxrayvision'}</p>
                      <p>CT: {analysis?.models_used?.imaging?.ct || 'MONAI bundle'}</p>
                      <p>MRI: {analysis?.models_used?.imaging?.mri || 'MONAI bundle'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {analysis?.ocr_items?.length ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/20 p-6"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-4">OCR Review</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {analysis.ocr_items.map((item) => (
                    <div key={item.document_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-bold text-slate-800 mb-2">{item.document_name}</p>
                      <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap line-clamp-6">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}

            {analysis?.limitations?.length ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 rounded-[2rem] border border-red-200 p-6"
              >
                <h3 className="text-lg font-bold text-red-700 mb-4">Analysis Limits</h3>
                <div className="space-y-2">
                  {analysis.limitations.map((limitation, index) => (
                    <p key={index} className="text-sm text-red-700">
                      {limitation}
                    </p>
                  ))}
                </div>
              </motion.div>
            ) : null}

            {statusMessage ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-700">
                {statusMessage}
              </div>
            ) : null}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end pt-2 pb-10"
            >
              <button
                onClick={submitReport}
                disabled={isSubmitting}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black tracking-wide rounded-2xl shadow-xl shadow-blue-600/20 hover:-translate-y-1 transition-all flex items-center gap-3 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Sending Report
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Send Report And Generate Plans
                  </>
                )}
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
