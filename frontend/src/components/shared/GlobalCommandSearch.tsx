"use client";

import React, { useEffect, useState } from "react";
import { Search, X, User } from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { MOCK_BENEFICIARIES } from "@/mock-data/pds-data";
import Link from "next/link";

export const GlobalCommandSearch: React.FC = () => {
  const { searchOpen, setSearchOpen } = useUIStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  if (!searchOpen) return null;

  const trimmedQuery = query.trim();

  const filteredBeneficiaries = trimmedQuery
    ? MOCK_BENEFICIARIES.filter(
        (b) =>
          b.fullName.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
          b.id.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
          b.rationCardId.toLowerCase().includes(trimmedQuery.toLowerCase()),
      )
    : [];

  return (
    <div className="responsive-modal-overlay-muted items-start py-4 sm:py-12">
      <div className="responsive-modal-panel responsive-modal-panel-lg animate-in fade-in zoom-in-95 duration-150">
        <div className="responsive-modal-header flex items-center gap-3">
          <Search className="w-4 h-4 text-primary shrink-0" />
          <input
            type="text"
            placeholder="Search Beneficiaries & Citizens (by name, ID, or ration card)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-foreground placeholder-muted-foreground focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => {
              setQuery("");
              setSearchOpen(false);
            }}
            className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="responsive-modal-body space-y-4">
          {!trimmedQuery ? (
            <div className="py-10 text-center space-y-2 text-muted-foreground">
              <Search className="size-6 mx-auto text-primary/60" />
              <p className="text-xs font-semibold text-foreground">
                Search Beneficiaries & Citizens
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Type a citizen name, Beneficiary ID, or Ration Card number above
                to look up records.
              </p>
            </div>
          ) : filteredBeneficiaries.length === 0 ? (
            <div className="py-10 text-center space-y-1 text-muted-foreground">
              <p className="text-xs font-semibold text-foreground">
                No matching records found
              </p>
              <p className="text-[11px] text-muted-foreground">
                No beneficiaries or citizens found matching &ldquo;
                {trimmedQuery}&rdquo;.
              </p>
            </div>
          ) : (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Beneficiaries & Citizens ({filteredBeneficiaries.length})
              </span>
              <div className="space-y-1">
                {filteredBeneficiaries.map((b) => (
                  <Link
                    key={b.id}
                    href={`/officer/distribution?id=${b.id}`}
                    onClick={() => {
                      setQuery("");
                      setSearchOpen(false);
                    }}
                    className="flex min-w-0 items-center justify-between gap-3 p-2.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-colors text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="shrink-0 p-1.5 rounded bg-secondary text-primary border border-border">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {b.fullName}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground font-mono">
                          {b.id} • {b.rationCardId}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] bg-secondary text-foreground px-2 py-0.5 rounded font-mono font-bold border border-border">
                      {b.rationCategory}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="responsive-modal-footer flex flex-col gap-1 bg-background text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Tip: Press{" "}
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground font-mono">
              ESC
            </kbd>{" "}
            to close search
          </span>
          <span className="font-medium">Beneficiary Search Directory</span>
        </div>
      </div>
    </div>
  );
};
