import { NextRequest, NextResponse } from 'next/server';

const PINATA_SERVICE_URL = process.env.PINATA_SERVICE_URL || 'http://localhost:5001';

/**
 * POST /api/ipfs/upload
 * Server-side proxy that forwards multipart file uploads to the Pinata microservice.
 * This avoids CORS issues from direct browser-to-Pinata-service calls.
 */
export async function POST(req: NextRequest) {
  try {
    // Forward the raw multipart form-data as-is to the Pinata service
    const contentType = req.headers.get('content-type') || '';
    const body = await req.arrayBuffer();

    const pinataRes = await fetch(`${PINATA_SERVICE_URL}/api/ipfs/upload`, {
      method: 'POST',
      headers: {
        'content-type': contentType,
      },
      body: body,
    });

    const data = await pinataRes.json();

    return NextResponse.json(data, { status: pinataRes.status });
  } catch (err: any) {
    console.error('❌ [API /api/ipfs/upload] Pinata proxy error:', err?.message);
    return NextResponse.json(
      {
        success: false,
        error: 'IPFS upload service is unavailable. Please ensure the Pinata service is running.',
      },
      { status: 503 }
    );
  }
}

/**
 * GET /api/ipfs/health
 * Proxies the Pinata service health check.
 */
export async function GET() {
  try {
    const pinataRes = await fetch(`${PINATA_SERVICE_URL}/api/ipfs/health`, {
      method: 'GET',
    });
    const data = await pinataRes.json();
    return NextResponse.json(data, { status: pinataRes.status });
  } catch {
    return NextResponse.json(
      { status: 'unavailable', error: 'Pinata service is not reachable.' },
      { status: 503 }
    );
  }
}
