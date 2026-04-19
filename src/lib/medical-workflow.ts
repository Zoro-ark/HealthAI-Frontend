export type AnalysisType = 'ocr_only' | 'xray' | 'ct' | 'mri';

export type PatientProfile = {
  id: string;
  name: string;
  age: number;
  gender: string;
  contact_info?: string;
};

export type PatientDocument = {
  id: string;
  name: string;
  size: string | number;
  created_at: string;
  url?: string;
};

export type ClinicalAnalysisResponse = {
  ocr_text: string;
  ocr_items: Array<{
    document_id: string;
    document_name: string;
    text: string;
  }>;
  clinicalbert_findings: string[];
  imaging_findings: Array<{
    document_name: string;
    modality: string;
    summary: string;
    scores?: Array<[string, number]>;
    analysis_method?: string;
  }>;
  biogpt_summary: string;
  limitations: string[];
  models_used: {
    ocr: string;
    clinicalbert: string;
    biogpt: string;
    imaging: {
      xray: string;
      ct: string;
      mri: string;
    };
  };
};

export type TreatmentPlanOption = {
  title: string;
  city: string;
  hospital: string;
  treatmentPlan: string;
  stay: string;
  estimatedTotalCost: string;
  dailyCostBreakdown: Array<{
    day: number;
    label: string;
    cost: string;
  }>;
};

export type ConsultationReportRecord = {
  id: string;
  patient_id: string;
  doctor_id: string;
  summary: string;
  doctor_notes?: string | null;
  clinicalbert_findings?: string[] | null;
  imaging_findings?: Array<Record<string, unknown>> | null;
  ocr_text?: string | null;
  models_used?: Record<string, unknown> | null;
  meeting_status?: string | null;
  proposed_meeting_date?: string | null;
  created_at: string;
};
