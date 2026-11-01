"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, X, User, Loader2 } from "lucide-react";
import Link from "next/link";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { apiClient } from "@/services/api/client";

type SearchRecord = {
  id: string;
  fullName: string;
  email: string;
  rationCardId: string | null;
  rationCategory: string | null;
};

function toSearchRecord(row: Record<string, unknown>): SearchRecord {
  return {
    id: String(row.id ?? row._id ?? ""),
    fullName: String(row.fullName ?? row.name ?? row.full_name ?? "Unnamed beneficiary"),
    email: String(row.email ?? ""),
    rationCardId: row.rationCardId || row.ration_card_number
      ? String(row.rationCardId ?? row.ration_card_number)
      : null,
    rationCategory: row.rationCategory || row.card_category
      ? String(row.rationCategory ?? row.card_category)
      : null,
  };
}

export const GlobalCommandSearch: React.FC = () => {
  const { searchOpen, setSearchOpen } = useUIStore();
  const role = useAuthStore((state) => state.role);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<SearchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(!searchOpen);
      }
      if (event.key === "Escape" && searchOpen) setSearchOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    let active = true;
    setQuery("");
    setRecords([]);
    setError("");
    if (role !== "ADMIN" && role !== "PDS_OFFICER") return;

    setLoading(true);
    const path = role === "ADMIN" ? "/admin/users" : "/officer/beneficiaries";
    apiClient.get(path).then(({ data }) => {
      const list = role === "ADMIN" ? data?.users : data?.beneficiaries;
      if (!data?.success || !Array.isArray(list)) {
        throw new Error(data?.error || "Beneficiary records could not be loaded.");
      }
      if (active) setRecords(list.map((item: Record<string, unknown>) => toSearchRecord(item)));
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Beneficiary records could not be loaded.");
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [searchOpen, role]);

  const trimmedQuery = query.trim().toLocaleLowerCase();
  const filteredRecords = useMemo(() => {
    if (!trimmedQuery) return [];
    return records.filter((record) =>
      [record.fullName, record.email, record.id, record.rationCardId ?? ""]
        .some((value) => value.toLocaleLowerCase().includes(trimmedQuery)),
    );
  }, [records, trimmedQuery]);

  if (!searchOpen) return null;

  const closeSearch = () => {
    setQuery("");
    setSearchOpen(false);
  };
  const canSearchBeneficiaries = role === "ADMIN" || role === "PDS_OFFICER";

  return (
    <div className="responsive-modal-overlay-muted items-start py-4 sm:py-12">
      <div className="responsive-modal-panel responsive-modal-panel-lg animate-in fade-in zoom-in-95 duration-150">
        <div className="responsive-modal-header flex items-center gap-3">
          <Search className="w-4 h-4 text-primary shrink-0" />
          <input
            type="text"
            placeholder={canSearchBeneficiaries ? "Search by name, email, ID, or ration card…" : "Beneficiary directory search is restricted to administrators and assigned officers"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={!canSearchBeneficiaries}
            className="w-full bg-transparent border-none text-xs text-foreground placeholder-muted-foreground focus:outline-none disabled:cursor-not-allowed"
            autoFocus
          />
          <button type="button" onClick={closeSearch} className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Close search">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="responsive-modal-body space-y-4">
          {!canSearchBeneficiaries ? (
            <div className="py-10 text-center text-xs text-muted-foreground">Beneficiary search is restricted to administrators and PDS officers. Your own information remains available in My Profile.</div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading authorized records…</div>
          ) : error ? (
            <div role="alert" className="py-8 text-center text-xs text-destructive">{error}</div>
          ) : !trimmedQuery ? (
            <div className="py-10 text-center space-y-2 text-muted-foreground">
              <Search className="size-6 mx-auto text-primary/60" />
              <p className="text-xs font-semibold text-foreground">Search beneficiaries</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">Type a name, email, beneficiary ID, or ration card number.</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-10 text-center space-y-1 text-muted-foreground">
              <p className="text-xs font-semibold text-foreground">No matching records found</p>
              <p className="text-[11px]">No authorized beneficiary record matches “{query.trim()}”.</p>
            </div>
          ) : (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Beneficiaries ({filteredRecords.length})</span>
              <div className="space-y-1">
                {filteredRecords.map((record) => (
                  <Link
                    key={record.id}
                    href={role === "PDS_OFFICER" ? `/officer/distribution?id=${encodeURIComponent(record.id)}` : "/admin/users"}
                    onClick={closeSearch}
                    className="flex min-w-0 items-center justify-between gap-3 p-2.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-colors text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="shrink-0 p-1.5 rounded bg-secondary text-primary border border-border"><User className="w-3.5 h-3.5" /></div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{record.fullName}</p>
                        <p className="truncate text-[11px] text-muted-foreground font-mono">{record.id}{record.rationCardId ? ` • ${record.rationCardId}` : " • No ration card recorded"}</p>
                      </div>
                    </div>
                    {record.rationCategory && <span className="shrink-0 text-[10px] bg-secondary text-foreground px-2 py-0.5 rounded font-mono font-bold border border-border">{record.rationCategory}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="responsive-modal-footer flex flex-col gap-1 bg-background text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground font-mono">ESC</kbd> to close search</span>
          <span className="font-medium">{role === "PDS_OFFICER" ? "Assigned Beneficiary Directory" : "Beneficiary Directory"}</span>
        </div>
      </div>
    </div>
  );
};
