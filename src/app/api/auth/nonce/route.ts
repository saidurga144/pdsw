import { NextRequest, NextResponse } from 'next/server';
import { WalletAuthService } from '@/server/auth/wallet-auth';
import { getClientIp } from '@/server/middleware/auth.middleware';
import { DEFAULT_CHAIN_ID } from '@/lib/metamask';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { success: false, error: 'Ethereum wallet address is required.' },
      { status: 400 }
    );
  }

  // Validate address format (0x followed by 40 hex chars)
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { success: false, error: 'Invalid Ethereum wallet address format.' },
      { status: 400 }
    );
  }

  const host = req.headers.get('host') || 'localhost:3000';
  const domain = host.split(':')[0];
  const { nonce, issuedAt, expiresAt } = WalletAuthService.generateNonce(address);

  return NextResponse.json({
    success: true,
    nonce,
    domain,
    uri: `${req.nextUrl.protocol}//${host}`,
    chainId: DEFAULT_CHAIN_ID,
    issuedAt,
    expiresAt,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = body.address;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Ethereum wallet address is required.' },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Ethereum wallet address format.' },
        { status: 400 }
      );
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const domain = host.split(':')[0];
    const { nonce, issuedAt, expiresAt } = WalletAuthService.generateNonce(address);

    return NextResponse.json({
      success: true,
      nonce,
      domain,
      uri: `${req.nextUrl.protocol}//${host}`,
      chainId: DEFAULT_CHAIN_ID,
      issuedAt,
      expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate authentication nonce.' },
      { status: 500 }
    );
  }
}
