import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_URL = (process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8002').replace('localhost', '127.0.0.1');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${FASTAPI_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Service unavailable' }, { status: 503 });
  }
}
