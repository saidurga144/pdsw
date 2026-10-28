"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  ArrowRight,
  ArrowLeft,
  PackageOpen,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Power,
  PowerOff,
  KeyRound,
  Mail,
  X,
  Copy,
  Check,
} from "lucide-react";
import { Beneficiary } from "@/types";

/* ─── helpers ─────────────────────────────────────────────────────────── */
function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("pds_token") || "";
}
function authH(extra?: Record<string, string>): Record<string, string> {
  const t = getToken();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  };
}

/* ─── types ───────────────────────────────────────────────────────────── */
type BeneficiaryRow = Beneficiary & { email?: string; status?: string };

function isInactiveStatus(status?: string): boolean {
  const normalized = String(status || "ACTIVE").toUpperCase();
  return normalized === "INACTIVE" || normalized === "DEACTIVATED";
}

const CREATE_STEPS = [
  "Account Credentials",
  "Personal Details",
  "Address Details",
  "Family & Eligibility",
  "Review & Submit",
];
const EMPTY_FORM = {
  email: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  phone: "",
  doorNo: "",
  street: "",
  district: "",
  state: "",
  pincode: "",
  category: "PHH",
  familyCount: 1,
  income: "",
};

/* ════════════════════════════════════════════════════════════════════════ */
export default function OfficerBeneficiaryManagementPage() {
  /* list */
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  /* create wizard */
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPwd, setShowPwd] = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  /* edit modal */
  const [editTarget, setEditTarget] = useState<BeneficiaryRow | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    district: "",
    category: "PHH",
  });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  /* delete modal */
  const [deleteTarget, setDeleteTarget] = useState<BeneficiaryRow | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  /* reset password modal */
  const [resetTarget, setResetTarget] = useState<BeneficiaryRow | null>(null);
  const [resetData, setResetData] = useState<{
    reset_url: string;
    email: string;
  } | null>(null);
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const inp =
    "w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none";

  /* ── Fetch beneficiaries ──────────────────────────────────────────── */
  const loadBeneficiaries = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/officer/beneficiaries", {
        headers: authH(),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.beneficiaries)) {
        setBeneficiaries([]);
        setLoadError(
          data.error || "Unable to load beneficiaries. Please try again.",
        );
        return;
      }
      setBeneficiaries(data.beneficiaries);
    } catch {
      setBeneficiaries([]);
      setLoadError(
        "Unable to load beneficiaries. Check the backend connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBeneficiaries();
  }, [loadBeneficiaries]);

  const showNotice = (type: "success" | "error", msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 4500);
  };

  /* ── Create wizard ────────────────────────────────────────────────── */
  const resetWizard = () => {
    setStep(1);
    setForm({ ...EMPTY_FORM });
    setCreateError("");
    setCreateSuccess("");
    setShowPwd(false);
    setShowCPwd(false);
  };

  const handleNext = () => {
    setCreateError("");
    if (step === 1) {
      if (!form.email.trim()) {
        setCreateError("Email address is required.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        setCreateError("Enter a valid email address.");
        return;
      }
      if (!form.password) {
        setCreateError("Password is required.");
        return;
      }
      if (form.password.length < 6) {
        setCreateError("Password must be at least 6 characters.");
        return;
      }
      if (!form.confirmPassword) {
        setCreateError("Please confirm the password.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setCreateError("Passwords do not match.");
        return;
      }
    }
    if (step === 2 && !form.fullName.trim()) {
      setCreateError("Full name is required.");
      return;
    }
    setStep((p) => Math.min(p + 1, CREATE_STEPS.length));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setCreateError("Passwords do not match.");
      return;
    }
    setCreateError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/officer/beneficiaries", {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          fullName: form.fullName.trim(),
          phone: form.phone || null,
          jurisdiction: form.district || null,
          cardCategory: form.category,
          rationCardNumber: null,
          walletAddress: null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCreateError(data.error || "Failed to create beneficiary account.");
        return;
      }
      setCreateSuccess(`Account for ${form.fullName} created successfully.`);
      await loadBeneficiaries();
      setTimeout(() => {
        setShowWizard(false);
        resetWizard();
      }, 1500);
    } catch (err: any) {
      setCreateError(
        err?.message || "Network error. Check the backend connection.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Edit ─────────────────────────────────────────────────────────── */
  const openEdit = (b: BeneficiaryRow) => {
    setEditTarget(b);
    setEditForm({
      fullName: b.fullName || "",
      phone: (b as any).phone || "",
      district: b.address?.district || "",
      category: b.rationCategory || "PHH",
    });
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    if (!editForm.fullName.trim()) {
      setEditError("Full name is required.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(
        `/api/officer/beneficiaries/${encodeURIComponent(editTarget.id)}`,
        {
          method: "PATCH",
          headers: authH(),
          body: JSON.stringify({
            fullName: editForm.fullName.trim(),
            phone: editForm.phone || null,
            jurisdiction: editForm.district || null,
            cardCategory: editForm.category,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setEditError(data.error || "Failed to update beneficiary.");
        return;
      }
      setEditTarget(null);
      showNotice(
        "success",
        `Beneficiary ${editForm.fullName} updated successfully.`,
      );
      await loadBeneficiaries();
    } catch (err: any) {
      setEditError(err?.message || "Network error.");
    } finally {
      setEditSaving(false);
    }
  };

  /* ── Account status ───────────────────────────────────────────────── */
  const handleToggleStatus = async () => {
    if (!deleteTarget) return;
    const nextStatus = isInactiveStatus(deleteTarget.status)
      ? "ACTIVE"
      : "INACTIVE";
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(
        `/api/officer/beneficiaries/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "PATCH",
          headers: authH(),
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDeleteError(
          data.error ||
            `Failed to ${nextStatus === "ACTIVE" ? "activate" : "deactivate"} beneficiary.`,
        );
        return;
      }
      setDeleteTarget(null);
      showNotice(
        "success",
        `Beneficiary ${deleteTarget.fullName} ${nextStatus === "ACTIVE" ? "activated" : "deactivated"} successfully.`,
      );
      await loadBeneficiaries();
    } catch (err: any) {
      setDeleteError(err?.message || "Network error.");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Reset password ───────────────────────────────────────────────── */
  const openReset = (b: BeneficiaryRow) => {
    setResetTarget(b);
    setResetData(null);
    setResetError("");
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    setResetError("");
    try {
      const res = await fetch(
        `/api/officer/beneficiaries/${encodeURIComponent(resetTarget.id)}/reset-password`,
        { method: "POST", headers: authH() },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setResetError(data.error || "Failed to generate reset token.");
        return;
      }
      setResetData({ reset_url: data.reset_url, email: data.email });
    } catch (err: any) {
      setResetError(err?.message || "Network error.");
    } finally {
      setResetting(false);
    }
  };

  const copyLink = (url: string) => {
    const full =
      typeof window !== "undefined" ? `${window.location.origin}${url}` : url;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = beneficiaries.filter(
    (b) =>
      b.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      b.email?.toLowerCase().includes(search.toLowerCase()) ||
      b.id?.toLowerCase().includes(search.toLowerCase()),
  );

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Notice banner */}
      {notice && (
        <div
          className={`p-3 rounded-md text-xs flex items-center gap-2 border animate-in fade-in ${notice.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-destructive/10 border-destructive/30 text-destructive"}`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{notice.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Beneficiary Management & Onboarding
          </h1>
          <p className="text-xs text-muted-foreground">
            Create, edit, reset password, or deactivate beneficiary accounts
          </p>
        </div>
        <button
          onClick={() => {
            resetWizard();
            setShowWizard(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
        >
          <Plus className="size-4" /> Register New Beneficiary
        </button>
      </div>

      {/* Search bar */}
      {beneficiaries.length > 0 && (
        <div className="relative w-full sm:w-72">
          <Search className="size-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      )}

      {/* Table / empty state */}
      {loading ? (
        <div className="bg-card border border-border rounded-md p-12 text-center flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">
            Loading enrolled beneficiaries from database...
          </span>
        </div>
      ) : loadError ? (
        <div className="bg-card border border-destructive/30 rounded-md p-12 text-center space-y-3 shadow-subtle">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/30">
            <AlertCircle className="size-6" />
          </div>
          <h3 className="empty-state-title text-foreground uppercase">
            Unable to Load Beneficiaries
          </h3>
          <p className="empty-state-description text-muted-foreground max-w-sm mx-auto">
            {loadError}
          </p>
          <button
            onClick={loadBeneficiaries}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border border-border hover:bg-muted"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-12 text-center space-y-3 shadow-subtle">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary border border-border">
            <PackageOpen className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
            {search ? "No Results Found" : "No Beneficiaries Enrolled"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search
              ? "No beneficiaries match your search."
              : 'Click "Register New Beneficiary" above to onboard citizens.'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md shadow-subtle responsive-table-wrap">
          <table className="responsive-table text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground font-mono text-[10px] uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3 min-w-[110px] whitespace-nowrap text-center">
                  Status
                </th>
                <th className="px-4 py-3 min-w-[132px] whitespace-nowrap text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((b) => {
                const isInactive = isInactiveStatus(b.status);
                return (
                  <tr
                    key={b.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-primary text-[11px]">
                      {b.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {b.fullName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {b.email || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">
                      {b.rationCategory}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {b.address?.district || "—"}
                    </td>
                    <td className="px-4 py-3 min-w-[110px] whitespace-nowrap text-center align-middle">
                      <span
                        className={`inline-flex min-w-[82px] items-center justify-center whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold border ${isInactive ? "bg-secondary text-muted-foreground border-border" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
                      >
                        {isInactive ? "INACTIVE" : b.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(b)}
                          aria-label="Edit beneficiary"
                          title="Edit beneficiary"
                          className="p-1.5 bg-secondary hover:bg-muted text-foreground rounded border border-border transition-colors"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        {/* Reset Password */}
                        <button
                          onClick={() => openReset(b)}
                          aria-label="Send password reset"
                          title="Send Password Reset"
                          className="p-1.5 bg-secondary hover:bg-muted text-foreground rounded border border-border transition-colors"
                        >
                          <Mail className="size-3.5" />
                        </button>
                        {/* Account status */}
                        <button
                          onClick={() => {
                            setDeleteTarget(b);
                            setDeleteError("");
                          }}
                          aria-label={
                            isInactive
                              ? "Activate beneficiary"
                              : "Deactivate beneficiary"
                          }
                          title={
                            isInactive
                              ? "Activate Beneficiary"
                              : "Deactivate Beneficiary"
                          }
                          className={`p-1.5 bg-secondary rounded border border-border transition-colors ${isInactive ? "hover:bg-emerald-50 text-emerald-700" : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"}`}
                        >
                          {isInactive ? (
                            <Power className="size-3.5" />
                          ) : (
                            <PowerOff className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ CREATE WIZARD MODAL ══════════════════════════════════════════ */}
      {showWizard && (
        <div className="responsive-modal-overlay-muted">
          <div className="responsive-modal-panel responsive-modal-panel-lg">
            <div className="responsive-modal-header flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-base">
                  Register New Beneficiary
                </h3>
                <p className="text-xs text-muted-foreground">
                  Step {step} of {CREATE_STEPS.length}: {CREATE_STEPS[step - 1]}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowWizard(false);
                  resetWizard();
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground text-lg"
              >
                ✕
              </button>
            </div>
            <div className="px-5 pt-4">
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${CREATE_STEPS.length}, 1fr)`,
                }}
              >
                {CREATE_STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-colors ${i + 1 <= step ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>
            <div className="responsive-modal-body space-y-4">
              {createError && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{createError}</p>
                </div>
              )}
              {createSuccess && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700">{createSuccess}</p>
                </div>
              )}

              <form id="ben-form" onSubmit={handleCreate} className="space-y-4">
                {step === 1 && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Create login credentials. The beneficiary will use these
                      to sign in.
                    </p>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Email Address <span className="text-primary">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="citizen@example.com"
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Password <span className="text-primary">*</span>{" "}
                        <span className="text-muted-foreground font-normal">
                          (min. 6 chars)
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPwd ? "text" : "password"}
                          required
                          minLength={6}
                          value={form.password}
                          onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                          }
                          placeholder="••••••••"
                          className={`${inp} pr-10`}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPwd((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showPwd ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Confirm Password <span className="text-primary">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCPwd ? "text" : "password"}
                          required
                          minLength={6}
                          value={form.confirmPassword}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              confirmPassword: e.target.value,
                            })
                          }
                          placeholder="••••••••"
                          className={`${inp} pr-10`}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowCPwd((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showCPwd ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                      {form.password && form.confirmPassword && (
                        <p
                          className={`text-[11px] mt-1 flex items-center gap-1 ${form.password === form.confirmPassword ? "text-emerald-600" : "text-destructive"}`}
                        >
                          {form.password === form.confirmPassword ? (
                            <>
                              <CheckCircle2 className="size-3" /> Passwords
                              match
                            </>
                          ) : (
                            <>
                              <AlertCircle className="size-3" /> Passwords do
                              not match
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Full Name <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.fullName}
                        onChange={(e) =>
                          setForm({ ...form, fullName: e.target.value })
                        }
                        placeholder="e.g. Suresh Kumar"
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Mobile Phone
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={form.phone}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            phone: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10),
                          })
                        }
                        placeholder="e.g. 9811234567"
                        className={`${inp} font-mono`}
                      />
                    </div>
                  </div>
                )}
                {step === 3 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          Door / Flat No
                        </label>
                        <input
                          type="text"
                          value={form.doorNo}
                          onChange={(e) =>
                            setForm({ ...form, doorNo: e.target.value })
                          }
                          placeholder="H-42"
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          Street / Colony
                        </label>
                        <input
                          type="text"
                          value={form.street}
                          onChange={(e) =>
                            setForm({ ...form, street: e.target.value })
                          }
                          placeholder="Sector 4"
                          className={inp}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          District
                        </label>
                        <input
                          type="text"
                          value={form.district}
                          onChange={(e) =>
                            setForm({ ...form, district: e.target.value })
                          }
                          placeholder="South Delhi"
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          value={form.state}
                          onChange={(e) =>
                            setForm({ ...form, state: e.target.value })
                          }
                          placeholder="Delhi"
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          Pincode
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={form.pincode}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              pincode: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6),
                            })
                          }
                          placeholder="110016"
                          className={`${inp} font-mono`}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {step === 4 && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Ration Category
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                        className={inp}
                      >
                        <option value="PHH">PHH — Priority Household</option>
                        <option value="AAY">AAY — Antyodaya Anna Yojana</option>
                        <option value="NPHH">
                          NPHH — Non-Priority Household
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Family Dependents
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={form.familyCount}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            familyCount: parseInt(e.target.value) || 1,
                          })
                        }
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Annual Income (₹)
                      </label>
                      <input
                        type="text"
                        value={form.income}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            income: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        placeholder="96000"
                        className={inp}
                      />
                    </div>
                  </div>
                )}
                {step === 5 && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-muted/40 p-4 rounded-md border border-border space-y-1.5">
                      <p>
                        <span className="text-muted-foreground">Email:</span>{" "}
                        <span className="font-mono font-semibold text-primary">
                          {form.email}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Password:</span>{" "}
                        <span>{"•".repeat(form.password.length)}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        <span className="font-semibold">{form.fullName}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Phone:</span>{" "}
                        <span>{form.phone || "—"}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Category:</span>{" "}
                        <span className="font-mono text-primary font-bold">
                          {form.category}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Address:</span>{" "}
                        <span>
                          {[
                            form.doorNo,
                            form.street,
                            form.district,
                            form.state,
                            form.pincode,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </span>
                      </p>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Clicking <strong>Create Beneficiary Account</strong> will
                      persist this account to the database. The beneficiary can
                      then log in using the credentials above.
                    </p>
                  </div>
                )}
              </form>
            </div>
            <div className="responsive-modal-footer flex items-center justify-between gap-2">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setCreateError("");
                    setStep((p) => Math.max(p - 1, 1));
                  }}
                  className="px-4 py-2 border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold rounded-md flex items-center gap-1"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </button>
              ) : (
                <div />
              )}
              {step < CREATE_STEPS.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase rounded-md flex items-center gap-1 shadow-subtle"
                >
                  Next Step <ArrowRight className="size-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  form="ben-form"
                  disabled={submitting || !!createSuccess}
                  className="px-6 py-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold text-xs uppercase rounded-md shadow-subtle flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    "Create Beneficiary Account"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ EDIT MODAL ════════════════════════════════════════════════════ */}
      {editTarget && (
        <div
          className="responsive-modal-overlay"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="responsive-modal-panel responsive-modal-panel-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="responsive-modal-header flex items-center justify-between gap-3">
              <h3 className="font-bold text-sm">Edit Beneficiary</h3>
              <button
                onClick={() => setEditTarget(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="responsive-modal-body space-y-3 text-xs">
              {editError && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-destructive">{editError}</p>
                </div>
              )}
              <p className="text-muted-foreground text-[11px]">
                Role is permanently set to{" "}
                <strong className="text-primary">BENEFICIARY</strong> and cannot
                be changed.
              </p>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Full Name <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, fullName: e.target.value })
                  }
                  className={inp}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Mobile Phone
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                  className={`${inp} font-mono`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  District / Jurisdiction
                </label>
                <input
                  type="text"
                  value={editForm.district}
                  onChange={(e) =>
                    setEditForm({ ...editForm, district: e.target.value })
                  }
                  className={inp}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Ration Category
                </label>
                <select
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category: e.target.value })
                  }
                  className={inp}
                >
                  <option value="PHH">PHH</option>
                  <option value="AAY">AAY</option>
                  <option value="NPHH">NPHH</option>
                </select>
              </div>
            </div>
            <div className="responsive-modal-footer flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 border border-border text-muted-foreground text-xs font-semibold rounded-md hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={editSaving}
                className="px-5 py-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold text-xs uppercase rounded-md shadow-subtle flex items-center gap-2"
              >
                {editSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ACCOUNT STATUS CONFIRMATION ══════════════════════════════════ */}
      {deleteTarget && (
        <div
          className="responsive-modal-overlay"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="responsive-modal-panel responsive-modal-panel-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="responsive-modal-header flex items-center justify-between gap-3">
              <h3
                className={`font-bold text-sm ${isInactiveStatus(deleteTarget.status) ? "text-emerald-700" : "text-destructive"}`}
              >
                {isInactiveStatus(deleteTarget.status)
                  ? "Activate Beneficiary"
                  : "Deactivate Beneficiary"}
              </h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="responsive-modal-body space-y-3 text-xs">
              {deleteError && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-destructive">{deleteError}</p>
                </div>
              )}
              <p className="text-sm font-medium text-foreground">
                Are you sure you want to{" "}
                {isInactiveStatus(deleteTarget.status)
                  ? "activate"
                  : "deactivate"}{" "}
                this account?
              </p>
              <div className="bg-muted/40 border border-border rounded-md p-3 space-y-1 font-mono">
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTarget.fullName}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="text-primary">{deleteTarget.email}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">ID:</span>{" "}
                  <span className="text-muted-foreground">
                    {deleteTarget.id}
                  </span>
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isInactiveStatus(deleteTarget.status)
                  ? "The existing account will regain sign-in access. Historical records are unchanged."
                  : "The account will be inactive and will no longer be able to log in. Historical records are preserved."}
              </p>
            </div>
            <div className="responsive-modal-footer flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 border border-border text-muted-foreground text-xs font-semibold rounded-md hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={deleting}
                className={`px-5 py-2 disabled:opacity-60 text-white font-bold text-xs uppercase rounded-md shadow-subtle flex items-center gap-2 ${isInactiveStatus(deleteTarget.status) ? "bg-emerald-600 hover:bg-emerald-700" : "bg-destructive hover:bg-destructive/90"}`}
              >
                {deleting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />{" "}
                    {isInactiveStatus(deleteTarget.status)
                      ? "Activating..."
                      : "Deactivating..."}
                  </>
                ) : isInactiveStatus(deleteTarget.status) ? (
                  "Activate Account"
                ) : (
                  "Deactivate Account"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ RESET PASSWORD MODAL ════════════════════════════════════════ */}
      {resetTarget && (
        <div
          className="responsive-modal-overlay"
          onClick={() => {
            setResetTarget(null);
            setResetData(null);
          }}
        >
          <div
            className="responsive-modal-panel responsive-modal-panel-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="responsive-modal-header flex items-center justify-between gap-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <KeyRound className="size-4 text-primary" /> Reset Password
              </h3>
              <button
                onClick={() => {
                  setResetTarget(null);
                  setResetData(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="responsive-modal-body space-y-3 text-xs">
              {resetError && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-destructive">{resetError}</p>
                </div>
              )}
              {!resetData ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Generate a password reset link for:
                  </p>
                  <div className="bg-muted/40 border border-border rounded-md p-3 font-mono space-y-1">
                    <p>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <span className="font-semibold text-foreground">
                        {resetTarget.fullName}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      <span className="text-primary">{resetTarget.email}</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    A one-time reset link (15 min expiry) will be generated.
                    Share it with the beneficiary. The current password is never
                    displayed.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 p-3 rounded-md bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-emerald-700">
                      Reset link generated for{" "}
                      <strong>{resetData.email}</strong>.
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      One-Time Reset URL (expires in 15 minutes):
                    </label>
                    <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-md p-2.5 font-mono text-[11px] text-primary break-all">
                      <span className="flex-1 select-all">
                        {resetData.reset_url}
                      </span>
                      <button
                        onClick={() => copyLink(resetData.reset_url)}
                        className="p-1.5 bg-card hover:bg-muted rounded border border-border shrink-0"
                      >
                        {copied ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="responsive-modal-footer flex items-center justify-end gap-2">
              {!resetData ? (
                <>
                  <button
                    onClick={() => {
                      setResetTarget(null);
                      setResetData(null);
                    }}
                    className="px-4 py-2 border border-border text-muted-foreground text-xs font-semibold rounded-md hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="px-5 py-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold text-xs uppercase rounded-md shadow-subtle flex items-center gap-2"
                  >
                    {resetting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />{" "}
                        Generating...
                      </>
                    ) : (
                      "Generate Reset Link"
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setResetTarget(null);
                    setResetData(null);
                  }}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase rounded-md shadow-subtle"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
