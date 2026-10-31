"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import {
  Database,
  Search,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface IPFSEvidenceRecord {
  cid: string;
  eventId: string;
  recordId: string;
  operation: string;
  actor: string;
  payloadSize: number;
  fileName: string;
  fileHash: string;
  gatewayUrl: string;
  submittedAt: string;
}

export default function IPFSEvidenceExplorerPage() {
  const [evidenceList, setEvidenceList] = useState<IPFSEvidenceRecord[]>([]);
  const [searchCid, setSearchCid] = useState("");
  const [copiedCid, setCopiedCid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await apiClient.get("/admin/ipfs");
      if (!response.data?.success || !Array.isArray(response.data.documents)) {
        throw new Error(response.data?.detail || "Could not load IPFS records.");
      }
      setEvidenceList(response.data.documents);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not load IPFS records.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  const filtered = evidenceList.filter(
    (e) =>
      e.cid.toLowerCase().includes(searchCid.toLowerCase()) ||
      e.recordId.toLowerCase().includes(searchCid.toLowerCase()),
  );

  const handleCopy = (cid: string) => {
    navigator.clipboard.writeText(cid);
    setCopiedCid(cid);
    setTimeout(() => setCopiedCid(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">
            IPFS Immutable Provenance Explorer
          </h1>
          <p className="text-xs text-slate-400">
            Content-addressed cryptographic audit evidence ledger anchored to
            IPFS DAG nodes
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search IPFS CID (Qm...)..."
            value={searchCid}
            onChange={(e) => setSearchCid(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => void loadEvidence()}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm responsive-table-wrap">
        <table className="responsive-table text-left text-xs font-mono">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-sans">
            <tr>
              <th className="px-4 py-3">IPFS CID</th>
              <th className="px-4 py-3">Event Ref</th>
              <th className="px-4 py-3">Record ID</th>
              <th className="px-4 py-3">Operation</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Payload Size</th>
              <th className="px-4 py-3 text-right font-sans">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto mb-2 size-6 animate-spin" />
                  Loading IPFS records...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-slate-400 font-sans"
                >
                  <div className="max-w-sm mx-auto flex flex-col items-center justify-center space-y-3">
                    <Database className="w-8 h-8 text-slate-600" />
                    <p className="font-semibold text-slate-300">
                      No IPFS Records Found
                    </p>
                    <p className="text-xs text-slate-500">
                      {loadError
                        ? loadError
                        : searchCid
                        ? "No records match your search CID."
                        : "No beneficiary supporting documents have been submitted yet."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.cid}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-cyan-300 font-bold">
                    <div className="flex items-center gap-2 min-w-0">
                      <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="technical-value">
                        {item.cid.substring(0, 18)}...
                      </span>
                      <button
                        onClick={() => handleCopy(item.cid)}
                        className="text-slate-500 hover:text-slate-200 shrink-0"
                        aria-label="Copy CID"
                      >
                        {copiedCid === item.cid ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{item.eventId}</td>
                  <td className="px-4 py-3 text-slate-200 font-bold">
                    {item.recordId}
                  </td>
                  <td className="px-4 py-3 text-emerald-400 font-sans font-semibold">
                    {item.operation}
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-sans">
                    {item.actor}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {item.payloadSize >= 1024 * 1024
                      ? `${(item.payloadSize / (1024 * 1024)).toFixed(2)} MB`
                      : `${Math.max(1, Math.round(item.payloadSize / 1024))} KB`}
                  </td>
                  <td className="px-4 py-3 text-right font-sans">
                    <a
                      href={item.gatewayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-800 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Open document
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
