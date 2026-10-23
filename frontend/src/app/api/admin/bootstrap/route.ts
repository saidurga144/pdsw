import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_URL = (process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8002').replace('localhost', '127.0.0.1');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName, phone, jurisdiction, bootstrapToken } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and full name are required.' },
        { status: 400 }
      );
    }

    if (!bootstrapToken) {
      return NextResponse.json(
        { success: false, error: 'Bootstrap token is required.' },
        { status: 403 }
      );
    }

    const backendRes = await fetch(`${FASTAPI_URL}/api/auth/bootstrap-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bootstrap-Token': bootstrapToken.trim(),
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        role: 'ADMIN',
        full_name: fullName.trim(),
        phone: phone || null,
        jurisdiction: jurisdiction || 'National Headquarters',
      }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { success: false, error: data.detail || data.error || 'Failed to initialize administrator.' },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('❌ [API /api/admin/bootstrap Error]:', err?.message);
    return NextResponse.json(
      { success: false, error: 'Backend service is unavailable. Please ensure the backend server is running.' },
      { status: 503 }
    );
  }
}
