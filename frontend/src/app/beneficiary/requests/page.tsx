"use client";

import React, { useEffect, useState } from "react";
import { ChangeRequest, ChangeRequestType, FamilyMember, SupportingDocument } from "@/types";
import { BeneficiaryService } from "@/services/beneficiary.service";
import { useAuthStore } from "@/stores/auth.store";
import { useBeneficiaryStore } from "@/stores/beneficiary.store";
import {
  Send,
  FileText,
  Plus,
  UserPlus,
  Trash2,
  X,
} from "lucide-react";
import { DocumentBlockchainUpload } from "@/components/shared/DocumentBlockchainUpload";

type FamilyMemberDraft = {
  fullName: string;
  relationship: string;
  dateOfBirth: string;
  gender: string;
  aadhaarNumber: string;
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: "text" | "tel" | "date" | "password";
  placeholder?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: string;
  max?: string;
  readOnly?: boolean;
};

function RequestField({
  label,
  value,
  onChange,
  error,
  required = false,
  type = "text",
  placeholder,
  maxLength,
  inputMode,
  min,
  max,
  readOnly = false,
}: FieldProps) {
  return (
    <label className="block space-y-1">
      <span className="font-semibold text-foreground">
        {label}{required && <span className="ml-1 text-primary">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        min={min}
        max={max}
        readOnly={readOnly}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-md border bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none ${
          readOnly ? "border-border/60 bg-muted/40 text-muted-foreground" : "border-border"
        } ${error ? "border-destructive" : ""}`}
      />
      {error && <span className="block text-[11px] text-destructive">{error}</span>}
    </label>
  );
}

function RequestSelect({
  label,
  value,
  onChange,
  options,
  error,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-semibold text-foreground">
        {label}{required && <span className="ml-1 text-primary">*</span>}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-md border bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none ${
          error ? "border-destructive" : "border-border"
        }`}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <span className="block text-[11px] text-destructive">{error}</span>}
    </label>
  );
}

function RequestTextArea({
  label,
  value,
  onChange,
  error,
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-semibold text-foreground">
        {label}{required && <span className="ml-1 text-primary">*</span>}
      </span>
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`w-full min-h-[5.5rem] resize-y rounded-md border bg-background p-2.5 text-foreground focus:border-primary focus:outline-none ${
          error ? "border-destructive" : "border-border"
        }`}
      />
      {error && <span className="block text-[11px] text-destructive">{error}</span>}
    </label>
  );
}

const newFamilyMember = (): FamilyMemberDraft => ({
  fullName: "",
  relationship: "",
  dateOfBirth: "",
  gender: "",
  aadhaarNumber: "",
});

function safeRequestSummary(value: unknown): string {
  const mask = (item: any): any => {
    if (Array.isArray(item)) return item.map(mask);
    if (!item || typeof item !== "object") return item;
    return Object.fromEntries(Object.entries(item).map(([key, child]) => [
      key,
      /aadhaar/i.test(key) && typeof child === "string"
        ? `XXXX XXXX ${child.slice(-4)}`
        : mask(child),
    ]));
  };
  try {
    return JSON.stringify(mask(value), null, 2);
  } catch {
    return "Details unavailable";
  }
}

export default function ChangeRequestsPage() {
  const { user } = useAuthStore();
  const { profile, ensureLoaded } = useBeneficiaryStore();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [supportingDocuments, setSupportingDocuments] = useState<SupportingDocument[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [submissionNotice, setSubmissionNotice] = useState("");
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestType, setRequestType] = useState<ChangeRequestType>("ADDRESS_CHANGE");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [familyDrafts, setFamilyDrafts] = useState<FamilyMemberDraft[]>([newFamilyMember()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const localNow = new Date();
  const today = new Date(localNow.getTime() - localNow.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  const existingPhone = user?.phone || profile?.phone || "";
  const currentAddress = profile?.address;
  const jurisdictionParts = (user?.jurisdiction || "").split(",").map((part) => part.trim()).filter(Boolean);
  const existingDistrict = currentAddress?.district || jurisdictionParts[0] || "";
  const existingState = currentAddress?.state || jurisdictionParts[jurisdictionParts.length - 1] || "";
  const existingAddress = [
    currentAddress?.doorNo,
    currentAddress?.street,
    currentAddress?.district,
    currentAddress?.state,
    currentAddress?.pincode,
  ].filter(Boolean).join(", ") || user?.jurisdiction || "Address not recorded in your profile";
  useEffect(() => {
    if (user) void ensureLoaded(user);
  }, [user?.id, ensureLoaded]);

  useEffect(() => {
    let active = true;
    BeneficiaryService.getChangeRequests()
      .then((items) => {
        if (active) setRequests(items);
      })
      .catch((error) => {
        if (active) {
          setRequestError(
            error instanceof Error ? error.message : "Could not load your requests.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingRequests(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = (key: string) => formValues[key] || "";
  const requiresSupportingDocument =
    requestType === "ADDRESS_CHANGE" ||
    requestType === "FAMILY_ADDITION" ||
    requestType === "MIGRATION_TRANSFER" ||
    (requestType === "FAMILY_REMOVAL" && ["MIGRATION", "DECEASED"].includes(value("removal_reason")));
  const selectedRemovalMember = profile?.familyMembers.find(
    (member) => member.id === value("removal_member_id"),
  );
  const setValue = (key: string, next: string) => {
    setFormValues((previous) => ({ ...previous, [key]: next }));
    setFieldErrors((previous) => ({ ...previous, [key]: "" }));
  };

  const resetForm = () => {
    setRequestType("ADDRESS_CHANGE");
    setFormValues({});
    setFieldErrors({});
    setFamilyDrafts([newFamilyMember()]);
    setSupportingDocuments([]);
    setRequestError("");
  };

  const handleRequestTypeChange = (next: ChangeRequestType) => {
    setRequestType(next);
    setFormValues({});
    setFieldErrors({});
    setFamilyDrafts([newFamilyMember()]);
    setSupportingDocuments([]);
    setRequestError("");
  };

  const updateFamilyDraft = (index: number, key: keyof FamilyMemberDraft, next: string) => {
    setFamilyDrafts((previous) => previous.map((member, memberIndex) =>
      memberIndex === index ? { ...member, [key]: next } : member,
    ));
    setFieldErrors((previous) => ({ ...previous, [`family_${index}_${key}`]: "" }));
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError("");
    const errors: Record<string, string> = {};
    const requireValue = (key: string, label: string) => {
      if (!value(key).trim()) errors[key] = `${label} is required.`;
    };

    let reason = "";
    let previousData: Record<string, any> = {};
    let requestedData: Record<string, any> = {};
    const addressSnapshot = {
      house_number: currentAddress?.doorNo || "",
      street: currentAddress?.street || "",
      district: existingDistrict,
      state: existingState,
      pin_code: currentAddress?.pincode || "",
    };
    const validPastDate = (input: string) => Boolean(input) && input <= today;
    const validFutureDate = (input: string) => Boolean(input) && input >= today;

    if (requestType === "ADDRESS_CHANGE") {
      [
        ["address_house_number", "House or door number"],
        ["address_street", "Street or village"],
        ["address_mandal", "Mandal or taluk"],
        ["address_district", "District"],
        ["address_state", "State"],
        ["address_pin_code", "PIN code"],
        ["address_reason", "Reason for address change"],
      ].forEach(([key, label]) => requireValue(key, label));
      if (value("address_pin_code") && !/^\d{6}$/.test(value("address_pin_code"))) {
        errors.address_pin_code = "Enter a valid 6-digit PIN code.";
      }
      reason = value("address_reason").trim();
      previousData = { residential_address: addressSnapshot };
      requestedData = {
        house_number: value("address_house_number").trim(),
        street: value("address_street").trim(),
        mandal: value("address_mandal").trim(),
        district: value("address_district").trim(),
        state: value("address_state").trim(),
        pin_code: value("address_pin_code").trim(),
      };
    } else if (requestType === "FAMILY_ADDITION") {
      requireValue("family_reason", "Reason for enrolment");
      familyDrafts.forEach((member, index) => {
        const fields: [keyof FamilyMemberDraft, string][] = [
          ["fullName", "Name"],
          ["relationship", "Relationship"],
          ["dateOfBirth", "Date of birth"],
          ["gender", "Gender"],
          ["aadhaarNumber", "Aadhaar number"],
        ];
        fields.forEach(([key, label]) => {
          if (!member[key].trim()) errors[`family_${index}_${key}`] = `${label} is required.`;
        });
        if (member.dateOfBirth && !validPastDate(member.dateOfBirth)) {
          errors[`family_${index}_dateOfBirth`] = "Date of birth cannot be in the future.";
        }
        if (member.aadhaarNumber && !/^\d{12}$/.test(member.aadhaarNumber)) {
          errors[`family_${index}_aadhaarNumber`] = "Enter a valid 12-digit Aadhaar number.";
        }
      });
      reason = value("family_reason").trim();
      previousData = {
        family_members: (profile?.familyMembers || []).map((member) => ({
          id: member.id,
          full_name: member.fullName,
          relationship: member.relationship,
        })),
      };
      requestedData = {
        family_members: familyDrafts.map((member) => ({
          full_name: member.fullName.trim(),
          relationship: member.relationship,
          date_of_birth: member.dateOfBirth,
          gender: member.gender,
          aadhaar_number: member.aadhaarNumber,
        })),
      };
    } else if (requestType === "FAMILY_REMOVAL") {
      requireValue("removal_member_id", "Family member");
      requireValue("removal_reason", "Removal reason");
      requireValue("removal_explanation", "Additional explanation");
      const member = profile?.familyMembers.find((item) => item.id === value("removal_member_id"));
      if (member && ["MIGRATION", "DECEASED"].includes(value("removal_reason"))) {
        requireValue("removal_date", "Date of migration or death");
        if (value("removal_date") && !validPastDate(value("removal_date"))) {
          errors.removal_date = "Date cannot be in the future.";
        }
      }
      if (value("removal_reason") === "MIGRATION") {
        requireValue("removal_new_district", "New district");
        requireValue("removal_new_state", "New state");
      }
      reason = `${value("removal_reason").replaceAll("_", " ")}: ${value("removal_explanation").trim()}`;
      previousData = {
        family_member: member
          ? { id: member.id, full_name: member.fullName, relationship: member.relationship }
          : {},
      };
      requestedData = {
        member_id: member?.id || value("removal_member_id"),
        member_name: member?.fullName || "",
        relationship: member?.relationship || "",
        removal_reason: value("removal_reason"),
        removal_date: value("removal_date"),
        new_location: value("removal_reason") === "MIGRATION"
          ? { district: value("removal_new_district").trim(), state: value("removal_new_state").trim() }
          : {},
      };
    } else if (requestType === "CONTACT_UPDATE") {
      if (!existingPhone.trim()) errors.contact_existing_phone = "Your existing mobile number is not available in the account profile. Contact support before changing it.";
      requireValue("contact_new_phone", "New mobile number");
      requireValue("contact_confirm_phone", "Confirm new mobile number");
      requireValue("contact_reason", "Reason for mobile number change");
      const newPhone = value("contact_new_phone");
      const existingDigits = existingPhone.replace(/\D/g, "").slice(-10);
      if (newPhone && !/^[6-9]\d{9}$/.test(newPhone)) {
        errors.contact_new_phone = "Enter a valid 10-digit Indian mobile number.";
      }
      if (value("contact_confirm_phone") && newPhone !== value("contact_confirm_phone")) {
        errors.contact_confirm_phone = "The mobile numbers do not match.";
      }
      if (newPhone && existingDigits && newPhone === existingDigits) {
        errors.contact_new_phone = "The new number must differ from the existing number.";
      }
      reason = value("contact_reason").trim();
      previousData = { phone: existingPhone };
      requestedData = { phone: newPhone };
    } else if (requestType === "MIGRATION_TRANSFER") {
      [
        ["migration_state", "Destination state"],
        ["migration_district", "Destination district"],
        ["migration_mandal", "Destination mandal or taluk"],
        ["migration_address", "New residential address"],
        ["migration_date", "Expected migration date"],
        ["migration_reason", "Reason for migration"],
      ].forEach(([key, label]) => requireValue(key, label));
      if (value("migration_date") && !validFutureDate(value("migration_date"))) {
        errors.migration_date = "Expected migration date cannot be in the past.";
      }
      reason = value("migration_reason").trim();
      previousData = {
        state: existingState,
        district: existingDistrict,
        residential_address: addressSnapshot,
      };
      requestedData = {
        destination_state: value("migration_state").trim(),
        destination_district: value("migration_district").trim(),
        destination_mandal: value("migration_mandal").trim(),
        new_address: value("migration_address").trim(),
        expected_migration_date: value("migration_date"),
      };
    }

    const documentRequired =
      requestType === "ADDRESS_CHANGE" ||
      requestType === "FAMILY_ADDITION" ||
      requestType === "MIGRATION_TRANSFER" ||
      (requestType === "FAMILY_REMOVAL" && ["MIGRATION", "DECEASED"].includes(value("removal_reason")));
    if (documentRequired && supportingDocuments.length === 0) {
      errors.supporting_documents = "Upload at least one supporting document for this request.";
    }
    if (isUploadingDocument) errors.supporting_documents = "Wait for the document upload to finish.";
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      const newReq = await BeneficiaryService.submitChangeRequest({
        beneficiaryId: user?.id || "",
        beneficiaryName: user?.name || "",
        requestType,
        reason,
        previousData,
        requestedData,
        supportingDocuments,
      });
      setRequests((current) => [newReq, ...current]);
      setSubmissionNotice(`Request ${newReq.id} was submitted successfully.`);
      setShowModal(false);
      resetForm();
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Could not submit your request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (request: ChangeRequest) => {
    if (request.status !== "SUBMITTED" || withdrawingId) return;
    if (!window.confirm(`Withdraw request ${request.id}? It will no longer be available for officer review.`)) return;
    setRequestError("");
    setWithdrawingId(request.id);
    try {
      const updated = await BeneficiaryService.withdrawChangeRequest(request.id);
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSubmissionNotice(`Request ${request.id} was withdrawn.`);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Could not withdraw the request.");
    } finally {
      setWithdrawingId(null);
    }
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
          onClick={() => {
            resetForm();
            setSubmissionNotice("");
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
        >
          <Plus className="size-4" /> Submit New Request
        </button>
      </div>

      {showModal && (
        <div className="responsive-modal-overlay">
          <form
            noValidate
            onSubmit={handleCreateRequest}
            className="responsive-modal-panel"
          >
            {requestError && (
              <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {requestError}
              </div>
            )}
            <div className="responsive-modal-header flex items-center justify-between gap-3">
              <h3 className="min-w-0 font-bold text-sm sm:text-base">
                Submit Attribute Change Request
              </h3>
              <button
                type="button"
                disabled={isSubmitting || isUploadingDocument}
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
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
                  onChange={(e) => handleRequestTypeChange(e.target.value as ChangeRequestType)}
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

              <div className="space-y-4">
                {requestType === "ADDRESS_CHANGE" && (
                  <>
                    <div className="rounded-md border border-border bg-muted/30 p-3">
                      <p className="mb-1 font-semibold text-foreground">Current registered address</p>
                      <p className="text-muted-foreground">{existingAddress}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <RequestField label="New house / door number" required value={value("address_house_number")} onChange={(v) => setValue("address_house_number", v)} error={fieldErrors.address_house_number} />
                      <RequestField label="New street / village" required value={value("address_street")} onChange={(v) => setValue("address_street", v)} error={fieldErrors.address_street} />
                      <RequestField label="New mandal / taluk" required value={value("address_mandal")} onChange={(v) => setValue("address_mandal", v)} error={fieldErrors.address_mandal} />
                      <RequestField label="New district" required value={value("address_district")} onChange={(v) => setValue("address_district", v)} error={fieldErrors.address_district} />
                      <RequestField label="New state" required value={value("address_state")} onChange={(v) => setValue("address_state", v)} error={fieldErrors.address_state} />
                      <RequestField label="New PIN code" required inputMode="numeric" maxLength={6} value={value("address_pin_code")} onChange={(v) => setValue("address_pin_code", v.replace(/\D/g, "").slice(0, 6))} error={fieldErrors.address_pin_code} />
                    </div>
                    <RequestTextArea label="Reason for address change" required value={value("address_reason")} onChange={(v) => setValue("address_reason", v)} error={fieldErrors.address_reason} placeholder="Explain why your registered address needs to change." />
                  </>
                )}

                {requestType === "FAMILY_ADDITION" && (
                  <>
                    <p className="text-muted-foreground">Add details for each new household member. Aadhaar input is masked on screen and must contain 12 digits.</p>
                    {familyDrafts.map((member, index) => (
                      <section key={index} className="space-y-3 rounded-md border border-border p-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-foreground">New family member {index + 1}</h4>
                          {familyDrafts.length > 1 && <button type="button" onClick={() => setFamilyDrafts((current) => current.filter((_, i) => i !== index))} className="inline-flex items-center gap-1 text-destructive"><Trash2 className="size-4" /> Remove</button>}
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <RequestField label="Full name" required value={member.fullName} onChange={(v) => updateFamilyDraft(index, "fullName", v)} error={fieldErrors[`family_${index}_fullName`]} />
                          <RequestSelect label="Relationship" required value={member.relationship} onChange={(v) => updateFamilyDraft(index, "relationship", v)} error={fieldErrors[`family_${index}_relationship`]} options={[{ value: "SPOUSE", label: "Spouse" }, { value: "SON", label: "Son" }, { value: "DAUGHTER", label: "Daughter" }, { value: "FATHER", label: "Father" }, { value: "MOTHER", label: "Mother" }, { value: "OTHER", label: "Other" }]} />
                          <RequestField label="Date of birth" type="date" required max={today} value={member.dateOfBirth} onChange={(v) => updateFamilyDraft(index, "dateOfBirth", v)} error={fieldErrors[`family_${index}_dateOfBirth`]} />
                          <RequestSelect label="Gender" required value={member.gender} onChange={(v) => updateFamilyDraft(index, "gender", v)} error={fieldErrors[`family_${index}_gender`]} options={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "OTHER", label: "Other" }]} />
                          <RequestField label="Aadhaar number" type="password" inputMode="numeric" maxLength={12} required value={member.aadhaarNumber} onChange={(v) => updateFamilyDraft(index, "aadhaarNumber", v.replace(/\D/g, "").slice(0, 12))} error={fieldErrors[`family_${index}_aadhaarNumber`]} />
                        </div>
                      </section>
                    ))}
                    {familyDrafts.length < 10 && <button type="button" onClick={() => setFamilyDrafts((current) => [...current, newFamilyMember()])} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 font-semibold text-primary hover:bg-muted/40"><UserPlus className="size-4" /> Add another member</button>}
                    <RequestTextArea label="Reason for enrolment" required value={value("family_reason")} onChange={(v) => setValue("family_reason", v)} error={fieldErrors.family_reason} placeholder="For example, newborn, marriage, or an eligible dependent joining the household." />
                  </>
                )}

                {requestType === "FAMILY_REMOVAL" && (
                  <>
                    <RequestSelect label="Registered family member" required value={value("removal_member_id")} onChange={(v) => setValue("removal_member_id", v)} error={fieldErrors.removal_member_id} options={(profile?.familyMembers || []).filter((member) => member.relationship !== "HEAD").map((member) => ({ value: member.id, label: `${member.fullName} — ${member.relationship.toLowerCase()}` }))} />
                    {!(profile?.familyMembers || []).some((member) => member.relationship !== "HEAD") && <p role="status" className="text-muted-foreground">No registered non-head family members are available in your profile to remove.</p>}
                    {selectedRemovalMember && <RequestField label="Relationship with head of family" value={selectedRemovalMember.relationship.toLowerCase()} onChange={() => {}} readOnly />}
                    <RequestSelect label="Removal reason" required value={value("removal_reason")} onChange={(v) => {
                      setValue("removal_reason", v);
                      setValue("removal_date", "");
                      if (v !== "MIGRATION") {
                        setValue("removal_new_district", "");
                        setValue("removal_new_state", "");
                      }
                    }} error={fieldErrors.removal_reason} options={[{ value: "MIGRATION", label: "Migration to another household / location" }, { value: "DECEASED", label: "Deceased" }, { value: "OTHER", label: "Other reason" }]} />
                    {value("removal_reason") !== "OTHER" && <RequestField label={value("removal_reason") === "DECEASED" ? "Date of death" : "Date of migration"} type="date" required max={today} value={value("removal_date")} onChange={(v) => setValue("removal_date", v)} error={fieldErrors.removal_date} />}
                    {value("removal_reason") === "MIGRATION" && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><RequestField label="New district" required value={value("removal_new_district")} onChange={(v) => setValue("removal_new_district", v)} error={fieldErrors.removal_new_district} /><RequestField label="New state" required value={value("removal_new_state")} onChange={(v) => setValue("removal_new_state", v)} error={fieldErrors.removal_new_state} /></div>}
                    <RequestTextArea label="Additional explanation" required value={value("removal_explanation")} onChange={(v) => setValue("removal_explanation", v)} error={fieldErrors.removal_explanation} placeholder="Provide the details needed to review this family-member removal." />
                  </>
                )}

                {requestType === "CONTACT_UPDATE" && (
                  <>
                    <RequestField label="Current registered mobile number" value={existingPhone || "Not recorded"} onChange={() => {}} readOnly error={fieldErrors.contact_existing_phone} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <RequestField label="New mobile number" type="tel" inputMode="numeric" maxLength={10} required value={value("contact_new_phone")} onChange={(v) => setValue("contact_new_phone", v.replace(/\D/g, "").slice(0, 10))} error={fieldErrors.contact_new_phone} placeholder="10-digit Indian mobile number" />
                      <RequestField label="Confirm new mobile number" type="tel" inputMode="numeric" maxLength={10} required value={value("contact_confirm_phone")} onChange={(v) => setValue("contact_confirm_phone", v.replace(/\D/g, "").slice(0, 10))} error={fieldErrors.contact_confirm_phone} />
                    </div>
                    <RequestTextArea label="Reason for mobile number change" required value={value("contact_reason")} onChange={(v) => setValue("contact_reason", v)} error={fieldErrors.contact_reason} placeholder="Explain why your contact number needs to be updated." />
                    <p className="text-muted-foreground">A verification OTP is not enabled for this request in the current application.</p>
                  </>
                )}

                {requestType === "MIGRATION_TRANSFER" && (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <RequestField label="Existing district" value={existingDistrict || "Not recorded"} onChange={() => {}} readOnly />
                      <RequestField label="Existing state" value={existingState || "Not recorded"} onChange={() => {}} readOnly />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <RequestField label="Destination state" required value={value("migration_state")} onChange={(v) => setValue("migration_state", v)} error={fieldErrors.migration_state} />
                      <RequestField label="Destination district" required value={value("migration_district")} onChange={(v) => setValue("migration_district", v)} error={fieldErrors.migration_district} />
                      <RequestField label="Destination mandal / taluk" required value={value("migration_mandal")} onChange={(v) => setValue("migration_mandal", v)} error={fieldErrors.migration_mandal} />
                      <RequestField label="Expected migration date" type="date" required min={today} value={value("migration_date")} onChange={(v) => setValue("migration_date", v)} error={fieldErrors.migration_date} />
                    </div>
                    <RequestTextArea label="New residential address" required value={value("migration_address")} onChange={(v) => setValue("migration_address", v)} error={fieldErrors.migration_address} />
                    <RequestTextArea label="Reason for migration" required value={value("migration_reason")} onChange={(v) => setValue("migration_reason", v)} error={fieldErrors.migration_reason} />
                  </>
                )}

                <div>
                  <label className="mb-1 block font-semibold text-xs">Supporting documents <span className="font-normal text-muted-foreground">{requiresSupportingDocument ? "(Required)" : "(Optional)"}</span></label>
                  <p className="mb-2 text-[11px] text-muted-foreground">{requiresSupportingDocument ? "Upload evidence for this change before submitting." : "You may attach documents to support your request."}</p>
                  <DocumentBlockchainUpload
                    required={requiresSupportingDocument}
                    onUploadStateChange={setIsUploadingDocument}
                    onUploadSuccess={(data) => {
                      setSupportingDocuments((current) => {
                        const existingIndex = current.findIndex((document) => document.documentId === data.documentId);
                        if (existingIndex === -1) return [...current, data];
                        const updated = [...current];
                        updated[existingIndex] = data;
                        return updated;
                      });
                      setFieldErrors((current) => ({ ...current, supporting_documents: "" }));
                    }}
                  />
                  {fieldErrors.supporting_documents && <p role="alert" className="mt-2 text-[11px] text-destructive">{fieldErrors.supporting_documents}</p>}
                  {supportingDocuments.length > 0 && <div className="mt-3 space-y-2">{supportingDocuments.map((document) => <div key={document.documentId} className="flex min-w-0 items-center gap-2 rounded-md border border-border p-2.5"><FileText className="size-4 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate font-semibold text-foreground">{document.fileName}</p><p className="text-muted-foreground">Ready to attach · {document.ipfsCid.slice(0, 18)}…</p></div><button type="button" onClick={() => setSupportingDocuments((current) => current.filter((item) => item.documentId !== document.documentId))} className="ml-auto rounded p-1 text-muted-foreground hover:text-destructive" aria-label={`Remove ${document.fileName}`}><X className="size-4" /></button></div>)}</div>}
                </div>
              </div>
            </div>

            <div className="responsive-modal-footer flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                disabled={isSubmitting || isUploadingDocument}
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingDocument}
                className="px-5 py-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
              >
                {isUploadingDocument
                  ? "Finish document upload first"
                  : isSubmitting
                  ? "Submitting..."
                  : "Confirm & Submit to Inspector"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {submissionNotice && <p role="status" className="rounded-md border border-green-600/20 bg-green-600/5 p-3 text-sm text-green-700">{submissionNotice}</p>}
        {requestError && !showModal && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {requestError}
          </p>
        )}
        {loadingRequests ? (
          <div className="bg-card border border-border rounded-md p-8 text-center text-sm text-muted-foreground">
            Loading your change requests...
          </div>
        ) : requests.length === 0 ? (
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">
                    {req.id}
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {req.requestType.replace("_", " ")}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${req.status === "WITHDRAWN" ? "border-border bg-muted text-muted-foreground" : "border-primary/20 bg-primary/5 text-primary"}`}>
                    {req.status.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Submitted on {new Date(req.submittedAt).toLocaleDateString()}
                  </span>
                  {req.status === "SUBMITTED" && <button type="button" disabled={withdrawingId === req.id} onClick={() => void handleWithdraw(req)} className="rounded-md border border-destructive/30 px-2.5 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50">{withdrawingId === req.id ? "Withdrawing…" : "Withdraw request"}</button>}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">{req.reason}</p>

              <details className="rounded-md border border-border bg-muted/20 p-3">
                <summary className="cursor-pointer text-xs font-semibold text-foreground">Requested and current details</summary>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div><h4 className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Current details</h4><pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-background p-2 text-[11px] text-muted-foreground">{safeRequestSummary(req.previousData)}</pre></div>
                  <div><h4 className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Requested details</h4><pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-background p-2 text-[11px] text-muted-foreground">{safeRequestSummary(req.requestedData)}</pre></div>
                </div>
              </details>

              {req.supportingDocuments?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-foreground">Supporting documents</h4>
                  {req.supportingDocuments.map((document) => (
                    <a
                      key={document.documentId}
                      href={document.gatewayUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center gap-2 rounded-md border border-border p-2 text-xs text-primary hover:bg-muted/40"
                    >
                      <FileText className="size-4 shrink-0" />
                      <span className="truncate">{document.fileName}</span>
                      <span className="ml-auto shrink-0 text-muted-foreground">Open IPFS</span>
                    </a>
                  ))}
                </div>
              )}

              {req.status === "WITHDRAWN" ? (
                <p className="rounded-md bg-muted/50 p-2 text-center text-xs font-semibold text-muted-foreground">This request was withdrawn and is no longer in the review queue.</p>
              ) : <div className="grid grid-cols-4 gap-2 pt-2">
                {steps.map((st, idx) => {
                  const currentIdx = req.status === "UNDER_REVIEW"
                    ? 1
                    : req.status === "OFFICER_VERIFICATION"
                    ? 2
                    : steps.indexOf(req.status);
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
              </div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
