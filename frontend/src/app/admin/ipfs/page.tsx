"use client";

import React, { useState } from "react";
import { MOCK_IPFS_EVIDENCE } from "@/mock-data/pds-data";
import {
  Database,
  Search,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function IPFSEvidenceExplorerPage() {
  const [evidenceList, setEvidenceList] = useState(MOCK_IPFS_EVIDENCE);
  const [searchCid, setSearchCid] = useState("");
  const [copiedCid, setCopiedCid] = useState<string | null>(null);

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
            {filtered.length === 0 ? (
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
                      {searchCid
                        ? "No records match your search CID."
                        : "No audit evidence or transaction receipts are currently pinned to IPFS."}
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
                    {item.payloadSize}
                  </td>
                  <td className="px-4 py-3 text-right font-sans">
                    <button className="px-3 py-1 bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-800 rounded font-semibold text-[11px] inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verify DAG
                    </button>
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
