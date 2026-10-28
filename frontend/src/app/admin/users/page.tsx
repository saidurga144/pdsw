"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  KeyRound,
  Power,
  PowerOff,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { getRoleLabel } from "@/lib/role-utils";

/** Returns the stored session token from localStorage (preferred) or cookie fallback */
function getSessionToken(): string {
  if (typeof window === "undefined") return "";
  const ls = localStorage.getItem("pds_token");
  if (ls) return ls;
  const match = document.cookie.match(/(?:^|;\s*)pds_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

/** Build fetch headers including Authorization Bearer token */
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getSessionToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  jurisdiction?: string;
  assignedDistrict?: string;
  status: string;
}

export default function UserDirectoryPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ACTIVE");
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Reset password modal state
  const [resetModalData, setResetModalData] = useState<{
    user: UserRecord;
    reset_token: string;
    reset_url: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionNotice, setActionNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "PDS_OFFICER",
    phone: "",
    jurisdiction: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { headers: authHeaders() });
      if (res.status === 401) {
        // Session expired — clear stale tokens and redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("pds_token");
          localStorage.removeItem("pds_user");
          window.location.href = "/login?session=expired";
        }
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formData.fullName || !formData.email || !formData.password) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (formData.phone && formData.phone.length !== 10) {
      setFormError("Mobile number must be exactly 10 digits.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          phone: formData.phone,
          jurisdiction: formData.jurisdiction,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFormSuccess("User account created successfully.");
        setFormData({
          fullName: "",
          email: "",
          password: "",
          role: "PDS_OFFICER",
          phone: "",
          jurisdiction: "",
        });
        await fetchUsers();
        setTimeout(() => {
          setShowModal(false);
          setFormSuccess("");
        }, 1200);
      } else if (res.status === 401) {
        // Session expired — clear stale tokens and prompt re-login
        if (typeof window !== "undefined") {
          localStorage.removeItem("pds_token");
          localStorage.removeItem("pds_user");
        }
        setFormError(
          "Your session has expired. Please log out and log in again.",
        );
      } else {
        setFormError(data.error || "Failed to create user account.");
      }
    } catch (err: any) {
      setFormError(err?.message || "Network error while creating user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isInactiveStatus = (status?: string) => {
    const normalized = String(status || "ACTIVE").toUpperCase();
    return normalized === "INACTIVE" || normalized === "DEACTIVATED";
  };

  const handleToggleUserStatus = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError("");

    const targetStatus = isInactiveStatus(userToDelete.status)
      ? "ACTIVE"
      : "INACTIVE";
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(userToDelete.id)}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ status: targetStatus }),
        },
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setUserToDelete(null);
        setActionNotice({
          type: "success",
          message: `User account '${userToDelete.email}' ${targetStatus === "ACTIVE" ? "activated" : "deactivated"} successfully.`,
        });
        setTimeout(() => setActionNotice(null), 4000);
        await fetchUsers();
      } else {
        setDeleteError(data.error || "Failed to update user account status.");
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Network error while updating user.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInitiatePasswordReset = async (u: UserRecord) => {
    setIsResetting(u.id);
    setActionNotice(null);

    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(u.id)}/reset-password`,
        {
          method: "POST",
          headers: authHeaders(),
        },
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setResetModalData({
          user: u,
          reset_token: data.reset_token,
          reset_url: data.reset_url,
        });
      } else {
        setActionNotice({
          type: "error",
          message: data.error || "Failed to generate password reset token.",
        });
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (err: any) {
      setActionNotice({
        type: "error",
        message: err?.message || "Network error initiating reset.",
      });
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setIsResetting(null);
    }
  };

  const copyToClipboard = (text: string) => {
    const fullUrl =
      typeof window !== "undefined" ? `${window.location.origin}${text}` : text;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q);

    if (statusFilter === "ALL") return matchesSearch;
    const isUserActive = (u.status || "ACTIVE").toUpperCase() === "ACTIVE";
    if (statusFilter === "ACTIVE") return matchesSearch && isUserActive;
    if (statusFilter === "INACTIVE") return matchesSearch && !isUserActive;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 animate-in fade-in duration-200 border ${
            actionNotice.type === "success"
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
              : "bg-rose-950/60 border-rose-800 text-rose-300"
          }`}
        >
          {actionNotice.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{actionNotice.message}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            User Directory & Staff Management
          </h1>
          <p className="text-xs text-slate-400">
            Manage and create active administrator, officer, auditor/SOC, and
            beneficiary accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
            title="Refresh Users List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Create User Account
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filter by name, email, role, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1 rounded font-semibold transition-colors ${
              statusFilter === "ACTIVE"
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1 rounded font-semibold transition-colors ${
              statusFilter === "ALL"
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Accounts
          </button>
          <button
            onClick={() => setStatusFilter("INACTIVE")}
            className={`px-3 py-1 rounded font-semibold transition-colors ${
              statusFilter === "INACTIVE"
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm responsive-table-wrap">
        <table className="responsive-table text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Assigned District</th>
              <th className="px-4 py-3 min-w-[110px] whitespace-nowrap text-center">
                Status
              </th>
              <th className="px-4 py-3 min-w-[118px] whitespace-nowrap text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Loading user accounts from database...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-slate-400"
                >
                  <div className="max-w-sm mx-auto flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-slate-800/80 rounded-full border border-slate-700">
                      <Users className="w-6 h-6 text-slate-500" />
                    </div>
                    <div className="font-semibold text-slate-300">
                      No users found
                    </div>
                    <p className="text-xs text-slate-500 text-center">
                      {searchQuery
                        ? "No accounts match your filter criteria."
                        : 'No user accounts match current filter. Click "Create User Account" to add one.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isDeactivated = isInactiveStatus(u.status);
                const isCurrentAdmin = Boolean(
                  u.id === currentUser?.id ||
                  (u.email &&
                    currentUser?.email &&
                    u.email.toLowerCase() === currentUser.email.toLowerCase()),
                );

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-cyan-400 font-bold">
                      {u.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-300">
                      {getRoleLabel(u.role)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{u.email}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {u.jurisdiction || u.assignedDistrict || "National"}
                    </td>
                    <td className="px-4 py-3 min-w-[110px] whitespace-nowrap text-center align-middle">
                      <span
                        className={`inline-flex min-w-[82px] items-center justify-center whitespace-nowrap rounded border px-2 py-0.5 text-[10px] font-bold ${
                          isDeactivated
                            ? "bg-rose-950/60 text-rose-300 border-rose-800"
                            : "bg-emerald-950 text-emerald-300 border-emerald-800"
                        }`}
                      >
                        {isDeactivated ? "INACTIVE" : u.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[118px] whitespace-nowrap text-right align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleInitiatePasswordReset(u)}
                          disabled={isResetting === u.id}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-400 rounded transition-colors border border-slate-700"
                          title="Send Password Reset"
                          aria-label="Send password reset"
                        >
                          <Mail
                            className={`w-3.5 h-3.5 ${isResetting === u.id ? "animate-spin" : ""}`}
                          />
                        </button>
                        <button
                          onClick={() => setUserToDelete(u)}
                          disabled={isCurrentAdmin}
                          className={`p-1.5 bg-slate-800 disabled:opacity-40 rounded transition-colors border border-slate-700 ${
                            isDeactivated
                              ? "hover:bg-emerald-950/60 text-slate-400 hover:text-emerald-400 hover:border-emerald-800"
                              : "hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 hover:border-rose-800"
                          }`}
                          title={
                            isCurrentAdmin
                              ? "Cannot change your current administrator account"
                              : isDeactivated
                                ? "Activate user account"
                                : "Deactivate user account"
                          }
                          aria-label={
                            isCurrentAdmin
                              ? "Current administrator account cannot be changed"
                              : isDeactivated
                                ? "Activate user"
                                : "Deactivate user"
                          }
                        >
                          {isDeactivated ? (
                            <Power className="w-3.5 h-3.5" />
                          ) : (
                            <PowerOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE USER ACCOUNT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Create User Account
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormError("");
                  setFormSuccess("");
                }}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. user@pds.gov.in"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="PDS_OFFICER">PDS Officer</option>
                    <option value="SOC_ANALYST">SOC Analyst</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Mobile Phone (10 Digits)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => {
                      const digitsOnly = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      setFormData({ ...formData, phone: digitsOnly });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {formData.phone
                      ? `${formData.phone.length}/10 digits`
                      : "10-digit mobile number"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  District / Jurisdiction
                </label>
                <input
                  type="text"
                  placeholder="e.g. Central Delhi / South Zone"
                  value={formData.jurisdiction}
                  onChange={(e) =>
                    setFormData({ ...formData, jurisdiction: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow disabled:opacity-50"
                >
                  {isSubmitting ? "Creating Account..." : "CREATE ACCOUNT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2
                className={`text-sm font-bold flex items-center gap-2 ${isInactiveStatus(userToDelete.status) ? "text-emerald-400" : "text-rose-400"}`}
              >
                {isInactiveStatus(userToDelete.status) ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Confirm User{" "}
                {isInactiveStatus(userToDelete.status)
                  ? "Activation"
                  : "Deactivation"}
              </h2>
              <button
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteError("");
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {deleteError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-slate-300 text-sm font-medium">
                Are you sure you want to{" "}
                {isInactiveStatus(userToDelete.status)
                  ? "activate"
                  : "deactivate"}{" "}
                this user?
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500">Name:</span>{" "}
                  <span className="text-slate-200 font-semibold">
                    {userToDelete.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Email:</span>{" "}
                  <span className="text-cyan-400">{userToDelete.email}</span>
                </div>
                <div>
                  <span className="text-slate-500">Role:</span>{" "}
                  <span className="text-indigo-300">
                    {getRoleLabel(userToDelete.role)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">User ID:</span>{" "}
                  <span className="text-slate-400">{userToDelete.id}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isInactiveStatus(userToDelete.status)
                  ? "This same account will be reactivated. The user can sign in again using their existing credentials and wallet."
                  : "This account will be set to INACTIVE and will no longer be permitted to log in to the portal. No data will be deleted."}
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setUserToDelete(null);
                    setDeleteError("");
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleToggleUserStatus}
                  disabled={isDeleting}
                  className={`px-4 py-2 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow disabled:opacity-50 flex items-center gap-1.5 ${
                    isInactiveStatus(userToDelete.status)
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {isInactiveStatus(userToDelete.status)
                          ? "Activating..."
                          : "Deactivating..."}
                      </span>
                    </>
                  ) : (
                    <span>
                      {isInactiveStatus(userToDelete.status)
                        ? "Activate User"
                        : "Deactivate User"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                Password Reset Generated
              </h2>
              <button
                onClick={() => setResetModalData(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>
                  Single-use password reset token successfully generated.
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">User Account:</span>
                <span className="font-semibold text-slate-200 font-mono text-xs">
                  {resetModalData.user.email}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">
                  One-Time Reset URL (15 Minute Expiration):
                </span>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-cyan-400 break-all">
                  <span className="flex-1 select-all">
                    {resetModalData.reset_url}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(resetModalData.reset_url)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 shrink-0"
                    title="Copy Link"
                  >
                    {copiedLink ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetModalData(null)}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
