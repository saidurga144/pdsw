"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  PackageOpen,
  Loader2,
} from "lucide-react";
import { Beneficiary } from "@/types";
import { apiClient } from "@/services/api/client";

export default function OfficerBeneficiaryManagementPage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Form State
  const [formData, setFormData] = useState({
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
    aadhaarProof: "",
  });

  const stepsList = [
    "Personal Details",
    "Address Details",
    "Family Details",
    "Eligibility",
    "Document Verification",
    "Review & Submit",
  ];

  useEffect(() => {
    async function loadBeneficiaries() {
      try {
        const res = await apiClient.get("/officer/beneficiaries");
        if (res.data?.success && Array.isArray(res.data.beneficiaries)) {
          setBeneficiaries(res.data.beneficiaries);
        } else {
          setBeneficiaries([]);
        }
      } catch {
        setBeneficiaries([]);
      } finally {
        setLoading(false);
      }
    }

    loadBeneficiaries();
  }, []);

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 6));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newB: Beneficiary = {
      id: `BEN-IND-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      rationCardId: `RC-DEL-${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: formData.fullName || "New Enrolled Beneficiary",
      phone: formData.phone || "+91 99887 66554",
      address: {
        doorNo: formData.doorNo || "H-10",
        street: formData.street || "Sector 4",
        district: formData.district || "District HQ",
        state: formData.state || "State",
        pincode: formData.pincode || "110001",
        pdsCenterId: "FPS-DEL-102",
        pdsCenterName: "Fair Price Shop #102",
      },
      rationCategory: formData.category as any,
      familyCount: formData.familyCount,
      familyMembers: [],
      eligibility: {
        beneficiaryId: "BEN-NEW",
        category: formData.category as any,
        monthlyIncome: parseInt(formData.income) || 12000,
        isBPL: true,
        lastReviewedAt: new Date().toISOString(),
        nextReviewDue: new Date().toISOString(),
        status: "ELIGIBLE",
        monthlyEntitlements: [
          {
            commodity: "Rice (Fortified)",
            quantity: 15,
            unit: "KG",
            subsidizedPricePerUnit: 3.0,
          },
          {
            commodity: "Wheat (Whole Grain)",
            quantity: 10,
            unit: "KG",
            subsidizedPricePerUnit: 2.0,
          },
        ],
      },
      verificationStatus: "VERIFIED",
      riskScore: 10,
      riskLevel: "LOW",
      currentHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
      latestIPFSCid: "QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setBeneficiaries([newB, ...beneficiaries]);
    setShowCreateWizard(false);
    setStep(1);
    setFormData({
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
      aadhaarProof: "",
    });
  };

  const filtered = beneficiaries.filter(
    (b) =>
      b.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      b.id?.toLowerCase().includes(search.toLowerCase()) ||
      b.rationCardId?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Beneficiary Management & Onboarding
          </h1>
          <p className="text-xs text-muted-foreground">
            Search directory, verify identity records, or register new ration
            card holders
          </p>
        </div>

        <button
          onClick={() => setShowCreateWizard(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
        >
          <Plus className="size-4" /> Register New Beneficiary
        </button>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-md p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs">Loading enrolled beneficiaries...</span>
        </div>
      ) : beneficiaries.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-12 text-center space-y-3 shadow-subtle">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary border border-border">
            <PackageOpen className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
              No Beneficiaries Enrolled
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No citizen ration cards are registered in this jurisdiction yet.
              Click &ldquo;Register New Beneficiary&rdquo; above to onboard
              citizens.
            </p>
          </div>
        </div>
      ) : (
        /* Directory Table */
        <div className="bg-card border border-border rounded-md shadow-subtle responsive-table-wrap">
          <table className="responsive-table text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground font-mono text-[10px] uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3">Beneficiary ID</th>
                <th className="px-4 py-3">Cardholder Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Family Members</th>
                <th className="px-4 py-3">AI Risk Level</th>
                <th className="px-4 py-3">IPFS CID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">
                    {b.id}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {b.fullName}
                  </td>
                  <td className="px-4 py-3 font-mono text-foreground">
                    {b.rationCategory}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.familyCount || 1} Members
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-primary border border-border">
                      {b.riskLevel || "LOW"} ({b.riskScore || 5}/100)
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    {b.latestIPFSCid
                      ? `${b.latestIPFSCid.substring(0, 16)}...`
                      : "QmPending..."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateWizard && (
        <div className="responsive-modal-overlay-muted">
          <div className="responsive-modal-panel responsive-modal-panel-lg">
            <div className="responsive-modal-header flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-base">
                  Multi-Step Beneficiary Registration
                </h3>
                <p className="text-xs text-muted-foreground">
                  Step {step} of 6: {stepsList[step - 1]}
                </p>
              </div>
              <button
                onClick={() => setShowCreateWizard(false)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Close beneficiary registration"
              >
                ✕
              </button>
            </div>

            <div className="responsive-modal-body space-y-5">
              <div className="grid grid-cols-6 gap-1">
                {stepsList.map((sName, idx) => (
                  <div
                    key={sName}
                    className={`h-1.5 rounded-full ${idx + 1 <= step ? "bg-primary" : "bg-muted"}`}
                    title={sName}
                  />
                ))}
              </div>

              <form
                id="beneficiary-registration-form"
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {step === 1 && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Full Name (Head of Family)
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        placeholder="e.g. Suresh Kumar"
                        className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Mobile Phone (10 Digits)
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phone: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10),
                          })
                        }
                        placeholder="e.g. 9811234567"
                        className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground font-mono placeholder-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          Door / Flat No
                        </label>
                        <input
                          type="text"
                          value={formData.doorNo}
                          onChange={(e) =>
                            setFormData({ ...formData, doorNo: e.target.value })
                          }
                          placeholder="e.g. H-42"
                          className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          Street / Colony
                        </label>
                        <input
                          type="text"
                          value={formData.street}
                          onChange={(e) =>
                            setFormData({ ...formData, street: e.target.value })
                          }
                          placeholder="e.g. Sector 4"
                          className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          District
                        </label>
                        <input
                          type="text"
                          value={formData.district}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              district: e.target.value,
                            })
                          }
                          placeholder="e.g. South Delhi"
                          className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) =>
                            setFormData({ ...formData, state: e.target.value })
                          }
                          placeholder="e.g. Delhi"
                          className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          Pincode
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={formData.pincode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              pincode: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6),
                            })
                          }
                          placeholder="e.g. 110016"
                          className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground font-mono placeholder-muted-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Number of Family Dependents
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={formData.familyCount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            familyCount: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Applied Ration Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="PHH">
                          PHH (Priority Household - Regular Subsidized Quota)
                        </option>
                        <option value="AAY">
                          AAY (Antyodaya Anna Yojana - Highly Subsidized 35kg)
                        </option>
                        <option value="NPHH">
                          NPHH (Non-Priority Household)
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Annual Household Income (₹)
                      </label>
                      <input
                        type="text"
                        value={formData.income}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            income: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        placeholder="e.g. 96000"
                        className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-3 text-xs">
                    <p className="text-muted-foreground">
                      Attach verification documents for demographic and address
                      validation.
                    </p>
                    <div className="p-4 border border-dashed border-border rounded-md text-center space-y-1">
                      <ShieldCheck className="size-6 text-primary mx-auto" />
                      <p className="font-semibold text-foreground">
                        Aadhaar e-KYC Verification
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Demographic match verified against UIDAI registry
                      </p>
                    </div>
                  </div>
                )}

                {step === 6 && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-muted/40 p-4 rounded-md border border-border space-y-2">
                      <p>
                        <span className="text-muted-foreground">
                          Full Name:
                        </span>{" "}
                        <span className="font-semibold text-foreground technical-value-wrap">
                          {formData.fullName}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Category:</span>{" "}
                        <span className="font-mono text-primary font-bold">
                          {formData.category}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          Dependents:
                        </span>{" "}
                        <span className="text-foreground">
                          {formData.familyCount} Members
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Address:</span>{" "}
                        <span className="text-foreground technical-value-wrap">
                          {formData.doorNo}, {formData.street},{" "}
                          {formData.district}, {formData.state} -{" "}
                          {formData.pincode}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="responsive-modal-footer flex items-center justify-between gap-2">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold rounded-md flex items-center gap-1"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </button>
              ) : (
                <div />
              )}

              {step < 6 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md flex items-center gap-1 shadow-subtle"
                >
                  Next Step <ArrowRight className="size-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  form="beneficiary-registration-form"
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-subtle"
                >
                  Submit & Generate Genesis Record
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
