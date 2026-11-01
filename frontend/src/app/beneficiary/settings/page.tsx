"use client";

import React, { FormEvent, useState } from "react";
import { apiClient } from "@/services/api/client";
import { AlertCircle, CheckCircle2, Key } from "lucide-react";

export default function BeneficiarySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const changePassword = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice("");
    if (newPassword.length < 8) { setError("Use at least 8 characters for the new password."); return; }
    if (newPassword !== confirmPassword) { setError("The new password and confirmation do not match."); return; }
    setSaving(true);
    try {
      const response = await apiClient.post("/beneficiary/settings", { current_password: currentPassword, new_password: newPassword });
      setNotice(response.data?.message || "Password updated."); setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Password could not be changed."); }
    finally { setSaving(false); }
  };
  return <div className="mx-auto max-w-3xl space-y-6">
    <header className="border-b border-border pb-4"><h1 className="ben-title text-foreground">Account Security & Settings</h1><p className="text-xs text-muted-foreground">Change the password for your beneficiary account.</p></header>
    <section className="space-y-4 rounded-md border border-border bg-card p-5 shadow-subtle"><h2 className="ben-section-title flex items-center gap-2 border-b border-border pb-3 text-foreground"><Key className="size-4 shrink-0 text-primary" />Change Password</h2>
      {error && <div role="alert" className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="size-4" />{error}</div>}
      {notice && <div role="status" className="flex items-center gap-2 border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="size-4" />{notice}</div>}
      <form onSubmit={changePassword} className="space-y-3 text-xs">
        <label className="block font-semibold text-foreground">Current Password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" /></label>
        <label className="block font-semibold text-foreground">New Password<input required type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" /></label>
        <label className="block font-semibold text-foreground">Confirm New Password<input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" /></label>
        <button disabled={saving} className="rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50">{saving ? "Updating…" : "Update Password"}</button>
      </form>
    </section>
  </div>;
}
