"use client";

import React, { useState, useEffect } from "react";
import { BeneficiaryService } from "@/services/beneficiary.service";
import { RiskIndicator } from "@/components/dashboard/RiskIndicator";
import { apiClient } from "@/services/api/client";
import {
  Send,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  PackageOpen,
  Loader2,
} from "lucide-react";

export default function OfficerModificationRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [officerRemarks, setOfficerRemarks] = useState("");
  const [actionError, setActionError] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadRequests() {
      try {
        const res = await apiClient.get("/officer/requests");
        if (res.data?.success && Array.isArray(res.data.requests)) {
          setRequests(res.data.requests);
          setLoadError("");
          if (res.data.requests.length > 0) {
            setSelectedReqId(res.data.requests[0].id);
          }
        } else {
          throw new Error(res.data?.detail || res.data?.error || "Could not load requests.");
        }
      } catch (error) {
        setRequests([]);
        setLoadError(
          error instanceof Error ? error.message : "Could not load requests.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadRequests();
  }, []);

  const currentReq =
    requests.find((r) => r.id === selectedReqId) || requests[0];

  const handleExecuteAction = async (
    actionType: "APPROVE" | "REJECT" | "ESCALATE",
  ) => {
    if (!selectedReqId || isReviewing) return;
    const statusMap = {
      APPROVE: "APPROVED" as const,
      REJECT: "REJECTED" as const,
      ESCALATE: "ESCALATED" as const,
    };
    setActionError("");
    setIsReviewing(true);
    try {
      const updated = await BeneficiaryService.updateChangeRequestStatus(
        selectedReqId,
        statusMap[actionType],
        officerRemarks,
      );
      setRequests((previous) =>
        previous.filter((request) => request.id !== selectedReqId),
      );
      setSelectedReqId(null);
      setOfficerRemarks("");
      if (!updated) throw new Error("Request update was not confirmed by the backend.");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not update the request.",
      );
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold text-foreground">
          Beneficiary Modification Requests & Field Diff Review
        </h1>
        <p className="text-xs text-muted-foreground">
          Validate requested field changes against historical database snapshots
          & AI risk flags
        </p>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-md p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs">Loading modification requests...</span>
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {loadError}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-12 text-center space-y-3 shadow-subtle">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary border border-border">
            <PackageOpen className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="empty-state-title text-foreground uppercase">
              Queue Empty (0 Items)
            </h3>
            <p className="empty-state-description text-muted-foreground max-w-sm mx-auto">
              No beneficiary modification requests in queue. When citizens
              submit address changes, family member updates, or category
              migrations, they will appear here for officer review and
              cryptographic state signing.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Queue Items ({requests.length})
            </h2>
            {requests.map((req) => (
              <button
                key={req.id}
                onClick={() => setSelectedReqId(req.id)}
                className={`w-full text-left p-4 rounded-md border transition-all ${
                  (selectedReqId || requests[0].id) === req.id
                    ? "bg-card border-primary ring-1 ring-primary shadow-subtle"
                    : "bg-card border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono font-bold text-primary">
                    {req.id}
                  </span>
                  <RiskIndicator
                    score={req.ai_risk_score || 5}
                    level="LOW"
                    showDetails={false}
                  />
                </div>
                <p className="text-xs font-bold text-foreground">
                  {req.beneficiary_id || "Citizen Request"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {req.request_type}
                </p>
              </button>
            ))}
          </div>

          {currentReq && (
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-md p-6 shadow-subtle space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-primary">
                        {currentReq.id}
                      </span>
                      <span className="px-2 py-0.5 bg-secondary text-foreground font-mono text-[10px] font-bold rounded border border-border">
                        {currentReq.status || "OFFICER VERIFICATION"}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-foreground">
                      {currentReq.beneficiary_id || "Citizen Record"}
                    </h2>
                  </div>
                  <RiskIndicator
                    score={currentReq.ai_risk_score || 5}
                    level="LOW"
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Attribute Comparison Diff
                  </h3>
                  <div className="border border-border rounded-md responsive-table-wrap">
                    <table className="responsive-table text-left text-xs">
                      <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-mono border-b border-border">
                        <tr>
                          <th className="px-4 py-2.5">Attribute Field</th>
                          <th className="px-4 py-2.5">Previous Value</th>
                          <th className="px-4 py-2.5">Requested Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        <tr>
                          <td className="px-4 py-3 font-mono font-bold text-foreground uppercase technical-value-wrap">
                            {currentReq.request_type}
                          </td>
                          <td className="px-4 py-3 text-destructive font-mono technical-value-wrap">
                            {typeof currentReq.previous_data === "object"
                              ? JSON.stringify(currentReq.previous_data)
                              : currentReq.previous_data || "Current Record"}
                          </td>
                          <td className="px-4 py-3 text-primary font-mono technical-value-wrap">
                            {typeof currentReq.requested_data === "object"
                              ? JSON.stringify(currentReq.requested_data)
                              : currentReq.requested_data ||
                                currentReq.reason ||
                                "New Value"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Supporting Documents
                  </h3>
                  {Array.isArray(currentReq.supporting_documents) &&
                  currentReq.supporting_documents.length > 0 ? (
                    <div className="space-y-2">
                      {currentReq.supporting_documents.map((document: any) => (
                        <div
                          key={document.document_id}
                          className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="size-4 shrink-0 text-primary" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {document.file_name}
                              </p>
                              <p className="truncate font-mono text-[10px] text-muted-foreground">
                                CID: {document.ipfs_cid}
                              </p>
                            </div>
                          </div>
                          <a
                            href={document.gateway_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            Open on IPFS <FileText className="size-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-border p-3 text-xs text-muted-foreground">
                      No supporting documents were attached to this request.
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold text-foreground block">
                    Officer Verification Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={officerRemarks}
                    onChange={(e) => setOfficerRemarks(e.target.value)}
                    placeholder="Enter mandatory field audit remarks before approval or rejection..."
                    className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                  />

                  <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-border">
                    {actionError && (
                      <p role="alert" className="mr-auto w-full text-xs text-destructive">
                        {actionError}
                      </p>
                    )}
                    <button
                      disabled={isReviewing}
                      onClick={() => void handleExecuteAction("REJECT")}
                      className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive text-xs font-bold uppercase rounded-md transition-all"
                    >
                      Reject Request
                    </button>
                    <button
                      disabled={isReviewing}
                      onClick={() => void handleExecuteAction("APPROVE")}
                      className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all shadow-subtle"
                    >
                      Approve & Re-anchor State Hash
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
