import { NextResponse } from 'next/server';


export async function POST(req: Request) {
  try {
    const { clinicalNotes, doctorComments } = await req.json();

    if (!clinicalNotes) {
      return NextResponse.json(
        { error: 'Clinical notes are required for analysis.' },
        { status: 400 }
      );
    }

    const prompt = `
      You are an expert AI clinical assistant reviewing a patient's medical context. 
      Below are the AI-generated clinical notes and any manual observations added by the doctor.

      CLINICAL NOTES DRAFT:
      "${clinicalNotes}"

      ADDITIONAL DOCTOR COMMENTS:
      "${doctorComments || 'None provided.'}"

      TASK: 
      Generate exactly 3 short, actionable, and specific medical suggestions for the doctor based on these combined notes. 
      Focus on potential follow-ups, medication interactions, lab recommendations, or critical care considerations. 
      Keep each suggestion under 2 sentences.

      Return the response STRICTLY as a JSON array of strings, like this:
      ["suggestion 1", "suggestion 2", "suggestion 3"]
      Do not include markdown blocks or any other text outside the JSON array.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API Error JSON:", errorData);
      throw new Error(`Google API responded with status ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Attempt to extract JSON if the model returns it with markdown codeblocks
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    let parsedSuggestions: string[] = [];

    if (jsonMatch) {
      parsedSuggestions = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback
      parsedSuggestions = JSON.parse(responseText.trim());
    }

    // Ensure we send back exactly what the frontend expects
    if (!Array.isArray(parsedSuggestions)) {
      throw new Error('Invalid format returned from AI');
    }

    return NextResponse.json({ suggestions: parsedSuggestions.slice(0, 3) });
  } catch (error: any) {
    console.error('Error generating suggestions with Gemini:', error);
    return NextResponse.json(
      { error: String(error) || 'Unknown error' },
      { status: 500 }
    );
  }
}
