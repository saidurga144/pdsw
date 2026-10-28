"use client";

import React, { useState } from "react";
import { ChangeRequest } from "@/types";
import { BeneficiaryService } from "@/services/beneficiary.service";
import { useAuthStore } from "@/stores/auth.store";
import {
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Plus,
} from "lucide-react";
import { DocumentBlockchainUpload } from "@/components/shared/DocumentBlockchainUpload";

export default function ChangeRequestsPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [requestType, setRequestType] = useState("ADDRESS_CHANGE");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newReq = await BeneficiaryService.submitChangeRequest({
      beneficiaryId: user?.id || "BEN-USER",
      beneficiaryName: user?.name || "Authenticated Citizen",
      requestType: requestType as any,
      reason,
      previousData: { field: "Previous Record Data" },
      requestedData: { field: "New Updated Citizen Data" },
    });
    setRequests([newReq, ...requests]);
    setIsSubmitting(false);
    setShowModal(false);
    setReason("");
  };

  const steps = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "OFFICER_VERIFICATION",
    "APPROVED",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="ben-title text-foreground">Change Request Module</h1>
          <p className="text-xs text-muted-foreground">
            Submit and track profile modifications, family updates, or location
            transfers
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
        >
          <Plus className="size-4" /> Submit New Request
        </button>
      </div>

      {showModal && (
        <div className="responsive-modal-overlay">
          <form
            onSubmit={handleCreateRequest}
            className="responsive-modal-panel"
          >
            <div className="responsive-modal-header flex items-center justify-between gap-3">
              <h3 className="min-w-0 font-bold text-sm sm:text-base">
                Submit Attribute Change Request
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Close change request modal"
              >
                ✕
              </button>
            </div>

            <div className="responsive-modal-body space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">
                  Modification Type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full bg-background border border-border rounded-md p-2.5 text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="ADDRESS_CHANGE">
                    Residential Address Modification
                  </option>
                  <option value="FAMILY_ADDITION">
                    Family Member Enrolment
                  </option>
                  <option value="FAMILY_REMOVAL">
                    Family Member Removal (Migration / Deceased)
                  </option>
                  <option value="CONTACT_UPDATE">
                    Mobile Phone / Contact Update
                  </option>
                  <option value="MIGRATION_TRANSFER">
                    One Nation One Ration Card (ONORC) State Migration
                  </option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Operational Justification / Reason
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide details and supporting rationale for the modification..."
                  className="w-full min-h-[5.5rem] resize-y bg-background border border-border rounded-md p-2.5 text-foreground placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-xs">
                  Supporting Document{" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Attach a verification document. You can submit your request
                  without uploading one.
                </p>
                <DocumentBlockchainUpload
                  onUploadSuccess={(data) => {
                    console.log("Document audit recorded:", data);
                  }}
                />
              </div>
            </div>

            <div className="responsive-modal-footer flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
              >
                {isSubmitting
                  ? "Submitting..."
                  : "Confirm & Submit to Inspector"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-8 text-center space-y-2 shadow-subtle">
            <Send className="size-8 text-muted-foreground mx-auto opacity-50" />
            <h3 className="empty-state-title text-foreground">
              No Active Change Requests
            </h3>
            <p className="empty-state-description text-muted-foreground max-w-sm mx-auto">
              You currently have no pending profile or address modification
              requests. Click &ldquo;Submit New Request&rdquo; to apply for
              changes.
            </p>
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">
                    {req.id}
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {req.requestType.replace("_", " ")}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Submitted on {new Date(req.submittedAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">{req.reason}</p>

              <div className="grid grid-cols-4 gap-2 pt-2">
                {steps.map((st, idx) => {
                  const currentIdx = steps.indexOf(req.status);
                  const isDone = currentIdx >= idx;
                  return (
                    <div key={st} className="text-center space-y-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          isDone ? "bg-primary" : "bg-muted"
                        }`}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground block truncate">
                        {st.replace("_", " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
