import { NextRequest, NextResponse } from 'next/server';
import { POST as handleLogin } from '@/app/api/auth/login/route';

export async function POST(req: NextRequest) {
  return handleLogin(req);
}
