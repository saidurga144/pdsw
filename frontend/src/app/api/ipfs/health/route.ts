import { NextResponse } from 'next/server';

const PINATA_SERVICE_URL = process.env.PINATA_SERVICE_URL || 'http://localhost:5001';

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
