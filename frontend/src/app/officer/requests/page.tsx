'use client';

import React, { useState, useEffect } from 'react';
import { BeneficiaryService } from '@/services/beneficiary.service';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { apiClient } from '@/services/api/client';
import { Send, FileText, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Cpu, PackageOpen, Loader2 } from 'lucide-react';

export default function OfficerModificationRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'ESCALATE' | null>(null);
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequests() {
      try {
        const res = await apiClient.get('/officer/requests');
        if (res.data?.success && Array.isArray(res.data.requests)) {
          setRequests(res.data.requests);
          if (res.data.requests.length > 0) {
            setSelectedReqId(res.data.requests[0].id);
          }
        } else {
          setRequests([]);
        }
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    }

    loadRequests();
  }, []);

  const currentReq = requests.find((r) => r.id === selectedReqId) || requests[0];

  const handleExecuteAction = async () => {
    if (!actionType || !selectedReqId) return;
    const statusMap = {
      APPROVE: 'APPROVED' as const,
      REJECT: 'REJECTED' as const,
      ESCALATE: 'ESCALATED' as const,
    };
    try {
      await BeneficiaryService.updateChangeRequestStatus(selectedReqId, statusMap[actionType], officerRemarks);
    } catch {}

    setRequests((prev) =>
      prev.map((r) => (r.id === selectedReqId ? { ...r, status: statusMap[actionType], review_notes: officerRemarks } : r))
    );
    setActionType(null);
    setOfficerRemarks('');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold text-foreground">Beneficiary Modification Requests & Field Diff Review</h1>
        <p className="text-xs text-muted-foreground">Validate requested field changes against historical database snapshots & AI risk flags</p>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-md p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs">Loading modification requests...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-12 text-center space-y-3 shadow-subtle">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary border border-border">
            <PackageOpen className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="empty-state-title text-foreground uppercase">Queue Empty (0 Items)</h3>
            <p className="empty-state-description text-muted-foreground max-w-sm mx-auto">
              No beneficiary modification requests in queue. When citizens submit address changes, family member updates, or category migrations, they will appear here for officer review and cryptographic state signing.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Queue Items ({requests.length})</h2>
            {requests.map((req) => (
              <button
                key={req.id}
                onClick={() => setSelectedReqId(req.id)}
                className={`w-full text-left p-4 rounded-md border transition-all ${
                  (selectedReqId || requests[0].id) === req.id
                    ? 'bg-card border-primary ring-1 ring-primary shadow-subtle'
                    : 'bg-card border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono font-bold text-primary">{req.id}</span>
                  <RiskIndicator score={req.ai_risk_score || 5} level="LOW" showDetails={false} />
                </div>
                <p className="text-xs font-bold text-foreground">{req.beneficiary_id || 'Citizen Request'}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{req.request_type}</p>
              </button>
            ))}
          </div>

          {currentReq && (
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-md p-6 shadow-subtle space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-primary">{currentReq.id}</span>
                      <span className="px-2 py-0.5 bg-secondary text-foreground font-mono text-[10px] font-bold rounded border border-border">
                        {currentReq.status || 'OFFICER VERIFICATION'}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-foreground">{currentReq.beneficiary_id || 'Citizen Record'}</h2>
                  </div>
                  <RiskIndicator score={currentReq.ai_risk_score || 5} level="LOW" />
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Attribute Comparison Diff</h3>
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
                          <td className="px-4 py-3 font-mono font-bold text-foreground uppercase technical-value-wrap">{currentReq.request_type}</td>
                          <td className="px-4 py-3 text-destructive font-mono technical-value-wrap">{typeof currentReq.previous_data === 'object' ? JSON.stringify(currentReq.previous_data) : currentReq.previous_data || 'Current Record'}</td>
                          <td className="px-4 py-3 text-primary font-mono technical-value-wrap">{typeof currentReq.requested_data === 'object' ? JSON.stringify(currentReq.requested_data) : currentReq.requested_data || currentReq.reason || 'New Value'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold text-foreground block">Officer Verification Remarks</label>
                  <textarea
                    rows={2}
                    value={officerRemarks}
                    onChange={(e) => setOfficerRemarks(e.target.value)}
                    placeholder="Enter mandatory field audit remarks before approval or rejection..."
                    className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                  />

                  <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-border">
                    <button
                      onClick={() => {
                        setActionType('REJECT');
                        handleExecuteAction();
                      }}
                      className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive text-xs font-bold uppercase rounded-md transition-all"
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={() => {
                        setActionType('APPROVE');
                        handleExecuteAction();
                      }}
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
