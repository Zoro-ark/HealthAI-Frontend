import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mlApiBaseUrl = process.env.ML_API_BASE_URL;

    if (!mlApiBaseUrl) {
      return NextResponse.json(
        { error: 'ML_API_BASE_URL is not configured.' },
        { status: 500 }
      );
    }

    const response = await fetch(`${mlApiBaseUrl.replace(/\/$/, '')}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail || data?.error || 'ML analysis failed.' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Doctor analysis proxy failed:', error);
    return NextResponse.json(
      { error: 'Unable to reach the ML analysis service.' },
      { status: 500 }
    );
  }
}
