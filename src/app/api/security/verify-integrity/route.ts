import { NextRequest, NextResponse } from "next/server";
import { IntegrityService } from "@/server/security/integrity.service";
import { TamperDetectionService } from "@/server/security/tamper-detection.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      recordId,
      entityType,
      databaseTarget = "SQLITE",
      currentData,
      storedHash,
      ipfsCid,
    } = body;

    if (!recordId || !storedHash || !ipfsCid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing mandatory fields: recordId, storedHash, ipfsCid are required.",
        },
        { status: 400 },
      );
    }

    const verificationResult = await IntegrityService.verifyRecordIntegrity({
      recordId,
      entityType: entityType || "GENERIC_RECORD",
      databaseTarget,
      currentData: currentData || {},
      storedHash,
      ipfsCid,
    });

    if (verificationResult.tampering_detected) {
      await TamperDetectionService.handleTamperingIncident(verificationResult, {
        actorId: "INTEGRITY_VERIFIER",
        actorRole: "SYSTEM",
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    }

    return NextResponse.json({
      success: true,
      verification: verificationResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Verification execution failed: ${error.message}`,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const sampleRecord = {
      recordId: "TXN-PDS-2026-9921",
      entityType: "DISTRIBUTION",
      databaseTarget: "SQLITE" as const,
      currentData: {
        distId: "txn-demo-01",
        transactionCode: "TXN-PDS-2026-9921",
        beneficiaryId: "ben-demo-01",
        riceQty: 20,
        wheatQty: 15,
      },
      storedHash:
        "0x8f2d6e3c5a1b4f7e9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f",
      ipfsCid: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    };

    const result = await IntegrityService.verifyRecordIntegrity(sampleRecord);

    return NextResponse.json({
      success: true,
      scannedCount: 1,
      tamperFree: !result.tampering_detected,
      results: [result],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
