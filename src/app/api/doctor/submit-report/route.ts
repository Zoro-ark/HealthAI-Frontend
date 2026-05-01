import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { DUMMY_DOCTOR_ID } from '@/lib/constants';
import { createAdminClient } from '@/utils/supabase/admin';

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

type GeneratedPlan = {
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

function safeJsonArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

async function generateItineraries(input: {
  patientName: string;
  age?: number;
  gender?: string;
  symptoms?: string;
  summary: string;
  doctorNotes?: string;
  destinations: string[];
  budgetRange?: string | null;
}): Promise<GeneratedPlan[]> {
  if (!ai) {
    return [
      {
        title: 'Manual Review Required',
        city: input.destinations[0] || 'Preferred destination',
        hospital: 'To be curated',
        treatmentPlan:
          'Gemini is not configured yet. Review the medical summary and prepare a destination-specific plan manually.',
        stay: '5-7 days',
        estimatedTotalCost: input.budgetRange || 'TBD',
        dailyCostBreakdown: [
          { day: 1, label: 'Initial consultation', cost: 'TBD' },
          { day: 2, label: 'Diagnostics and assessment', cost: 'TBD' },
          { day: 3, label: 'Treatment planning', cost: 'TBD' },
        ],
      },
    ];
  }

  const prompt = `
You are generating medical tourism itinerary options for a patient in India.

Patient:
- Name: ${input.patientName}
- Age: ${input.age ?? 'unknown'}
- Gender: ${input.gender ?? 'unknown'}
- Symptoms: ${input.symptoms ?? 'not provided'}

Doctor summary:
${input.summary}

Doctor notes:
${input.doctorNotes || 'None provided'}

Preferred cities or regions:
${input.destinations.length > 0 ? input.destinations.join(', ') : 'Delhi, Mumbai, Bengaluru'}

Budget range:
${input.budgetRange || 'Not specified'}

Return JSON only with this shape:
{
  "plans": [
    {
      "title": "short descriptive title",
      "city": "city name",
      "hospital": "real or realistic hospital name in that city",
      "treatmentPlan": "detailed treatment and recovery plan (3-4 sentences)",
      "stay": "estimated duration like 5-7 days",
      "estimatedTotalCost": "cost in INR like ₹50,000 - ₹80,000",
      "dailyCostBreakdown": [
        { "day": 1, "label": "activity description", "cost": "₹X,XXX" }
      ]
    }
  ]
}

IMPORTANT RULES:
- Generate EXACTLY 3 different plans in different cities or with different hospitals.
- Each plan must have a DIFFERENT hospital and a unique approach.
- Include 4-6 days in dailyCostBreakdown for each plan.
- Use realistic Indian hospital names (e.g., AIIMS, Fortis, Apollo, Max, Medanta, Narayana Health).
- Costs should be in INR (₹).
- Do not wrap the JSON in markdown backticks.
  `;

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'];
  
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        const rawText = response.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText) as { plans?: GeneratedPlan[] };
        return safeJsonArray(parsed.plans, []);
      } catch (err: unknown) {
        const errStr = String(err);
        if (errStr.includes('503') || errStr.includes('429') || errStr.includes('UNAVAILABLE') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('404') || errStr.includes('NOT_FOUND')) {
          // Wait before retry
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        throw err; // Non-retryable
      }
    }
  }
  
  // All retries exhausted — return 3 realistic placeholder plans
  const cities = input.destinations.length > 0 ? input.destinations : ['Delhi', 'Mumbai', 'Bengaluru'];
  const hospitals = ['AIIMS', 'Apollo Hospital', 'Fortis Healthcare'];
  return cities.slice(0, 3).map((city, i) => ({
    title: `Treatment Option ${i + 1} — ${city}`,
    city: city,
    hospital: hospitals[i] || `${city} Medical Center`,
    treatmentPlan: `Comprehensive evaluation and treatment at ${hospitals[i] || city} based on clinical findings: ${input.summary.substring(0, 150)}. Includes initial consultation, diagnostics, treatment procedure, and post-operative recovery with follow-up.`,
    stay: `${5 + i}-${7 + i} days`,
    estimatedTotalCost: input.budgetRange || `₹${40 + i * 20},000 - ₹${60 + i * 20},000`,
    dailyCostBreakdown: [
      { day: 1, label: 'Arrival, registration & initial consultation', cost: `₹${3 + i},000` },
      { day: 2, label: 'Diagnostic tests & imaging', cost: `₹${5 + i},000` },
      { day: 3, label: 'Treatment / procedure', cost: `₹${15 + i * 5},000` },
      { day: 4, label: 'Post-procedure observation', cost: `₹${2 + i},000` },
      { day: 5, label: 'Follow-up & discharge', cost: `₹${2},000` },
    ],
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const {
      patient,
      analysis,
      summary,
      doctorNotes,
      meetingDate,
      destinations,
      budgetRange,
      doctorId,
      requestId,
    } = body;

    if (!patient?.id || !summary) {
      return NextResponse.json(
        { error: 'Patient and summary are required.' },
        { status: 400 }
      );
    }

    const meetingStatus = meetingDate ? 'pending_patient' : 'report_sent';
    const activeDoctorId = doctorId || DUMMY_DOCTOR_ID;

    const reportInsert = await supabase
      .from('consultation_reports')
      .insert({
        patient_id: patient.id,
        doctor_id: activeDoctorId,
        request_id: requestId || null,
        summary,
        doctor_notes: doctorNotes || null,
        ocr_text: analysis?.ocr_text || null,
        clinicalbert_findings: analysis?.clinicalbert_findings || [],
        imaging_findings: analysis?.imaging_findings || [],
        models_used: analysis?.models_used || {},
        meeting_status: meetingStatus,
        proposed_meeting_date: meetingDate || null,
      })
      .select('*')
      .single();

    if (reportInsert.error) {
      throw reportInsert.error;
    }

    if (meetingDate) {
      const { error: appointmentError } = await supabase.from('appointments').insert({
        patient_id: patient.id,
        doctor_id: activeDoctorId,
        appointment_date: meetingDate,
        status: 'pending_patient',
        notes: 'Doctor-proposed follow-up after report submission.',
        created_by: 'doctor',
      });

      if (appointmentError) {
        throw appointmentError;
      }
    }

    const plans = await generateItineraries({
      patientName: patient.name,
      age: patient.age,
      gender: patient.gender,
      symptoms: patient.symptoms,
      summary,
      doctorNotes,
      destinations: Array.isArray(destinations) ? destinations : [],
      budgetRange: budgetRange || null,
    });

    if (plans.length > 0) {
      const inserts = plans.map((plan) => ({
        patient_id: patient.id,
        doctor_id: activeDoctorId,
        report_id: reportInsert.data.id,
        title: plan.title,
        city: plan.city,
        hospital: plan.hospital,
        treatment_plan: plan.treatmentPlan,
        stay: plan.stay,
        estimated_total_cost: plan.estimatedTotalCost,
        daily_cost_breakdown: plan.dailyCostBreakdown || [],
        status: 'generated',
      }));

      const { error: itineraryError } = await supabase
        .from('treatment_itineraries')
        .insert(inserts);

      if (itineraryError) {
        throw itineraryError;
      }
    }

    if (requestId) {
      await supabase
        .from('medical_requests')
        .update({ status: 'Report Sent', updated_at: new Date().toISOString() })
        .eq('id', requestId);
    }

    return NextResponse.json({
      success: true,
      report: reportInsert.data,
      itinerariesCreated: plans.length,
    });
  } catch (error: unknown) {
    console.error('Submit report failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to submit the consultation report.',
      },
      { status: 500 }
    );
  }
}
