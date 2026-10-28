import { NextResponse } from "next/server";
import { SecurityAuditService } from "@/server/security/security-audit.service";

export async function GET() {
  try {
    const report = await SecurityAuditService.runFullSecurityAudit();
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Security audit failed: ${error.message}`,
      },
      { status: 500 },
    );
  }
}
