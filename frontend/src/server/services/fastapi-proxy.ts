import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = (
  process.env.FASTAPI_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8002"
).replace(/\/+$/, "");

export async function proxyFastApiJson(
  request: NextRequest,
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
): Promise<NextResponse> {
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.cookies.get("pds_token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(`${FASTAPI_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(
      data ?? { success: false, error: "The backend returned an invalid response." },
      { status: response.status },
    );
  } catch (error) {
    console.error("FastAPI request proxy failed:", error);
    return NextResponse.json(
      { success: false, error: "The request service is temporarily unavailable." },
      { status: 503 },
    );
  }
}
