import { NextRequest, NextResponse } from 'next/server';

const PINATA_SERVICE_URL = process.env.PINATA_SERVICE_URL || 'http://localhost:5001';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const body = await req.arrayBuffer();
    const pinataRes = await fetch(`${PINATA_SERVICE_URL}/api/ipfs/upload`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body,
    });
    const data = await pinataRes.json();
    return NextResponse.json(data, { status: pinataRes.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'IPFS upload service is unavailable. Please ensure the Pinata service is running.',
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  try {
    const pinataRes = await fetch(`${PINATA_SERVICE_URL}/api/ipfs/health`);
    const data = await pinataRes.json();
    return NextResponse.json(data, { status: pinataRes.status });
  } catch {
    return NextResponse.json(
      { status: 'unavailable', error: 'Pinata service is not reachable.' },
      { status: 503 }
    );
  }
}
