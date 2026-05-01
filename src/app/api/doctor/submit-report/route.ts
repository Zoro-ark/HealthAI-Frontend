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
You are generating medical tourism itinerary options for a patient.

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
${input.destinations.length > 0 ? input.destinations.join(', ') : 'Any suitable nearby city'}

Budget range:
${input.budgetRange || 'Not specified'}

Return JSON only with this shape:
{
  "plans": [
    {
      "title": "short title",
      "city": "city name",
      "hospital": "hospital or care center",
      "treatmentPlan": "treatment and travel plan summary",
      "stay": "estimated duration",
      "estimatedTotalCost": "currency string",
      "dailyCostBreakdown": [
        { "day": 1, "label": "activity", "cost": "currency string" }
      ]
    }
  ]
}

Generate 2 to 3 options in the requested region or nearby cities.
Include treatment, accommodation/travel flow, and day-wise cost items.
Do not wrap the JSON in markdown.
  `;

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  
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
        if (errStr.includes('503') || errStr.includes('429') || errStr.includes('UNAVAILABLE')) {
          // Wait before retry
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        throw err; // Non-retryable
      }
    }
  }
  
  // All retries exhausted — return a manual review placeholder
  return [
    {
      title: 'Manual Review Required',
      city: input.destinations[0] || 'Preferred destination',
      hospital: 'To be determined by reviewing physician',
      treatmentPlan: `AI itinerary generation is temporarily unavailable. Based on the clinical summary, please manually create a treatment plan for: ${input.summary.substring(0, 200)}...`,
      stay: '5-7 days (estimated)',
      estimatedTotalCost: input.budgetRange || 'TBD',
      dailyCostBreakdown: [
        { day: 1, label: 'Initial consultation and diagnostics', cost: 'TBD' },
        { day: 2, label: 'Treatment planning', cost: 'TBD' },
        { day: 3, label: 'Procedure / therapy', cost: 'TBD' },
      ],
    },
  ];
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
