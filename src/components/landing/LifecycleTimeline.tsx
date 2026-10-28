"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  CheckCircle,
  Edit3,
  Users,
  FileCheck,
  Building2,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Database,
  Lock,
} from "lucide-react";

export const LifecycleTimeline: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState(2); // Default to Modification

  const stages = [
    {
      id: 0,
      number: "01",
      title: "Creation",
      icon: UserPlus,
      purpose:
        "Initial beneficiary onboarding and digital ration card genesis registration.",
      actor: "PDS Enrolment Officer / Beneficiary Application",
      security: "Aadhaar Demographic Hash & Biometric Match Required",
      ai: "Duplicate Identity & Ghost Card Detection Scan",
      integrity: "Genesis Record Hash computed & stored in state ledger",
      evidence: "IPFS Genesis Evidence CID anchored (Version 1.0)",
    },
    {
      id: 1,
      number: "02",
      title: "Verification",
      icon: CheckCircle,
      purpose:
        "Physical and documentary validation by Field Inspector before entitlement issuance.",
      actor: "PDS Field Verification Officer",
      security: "Multi-factor Officer Digital Signature Authentication",
      ai: "Address & Income Document Consistency Validation",
      integrity: "Verification status transitioned from PENDING to VERIFIED",
      evidence: "Signed Field Inspection Report hash pinned to IPFS DAG",
    },
    {
      id: 2,
      number: "03",
      title: "Modification",
      icon: Edit3,
      purpose:
        "Attribute updates such as residential address, contact number, or scheme category.",
      actor: "Beneficiary (Request) / PDS Officer (Review & Diff Approval)",
      security: "Role-Based Authorization with Prior vs Requested Diff Lock",
      ai: "Behavioral Anomaly & Rapid Update Frequency Scoring",
      integrity:
        "Previous and Current Record Hash compared (State Transition Diff)",
      evidence:
        "IPFS Provenance Reference generated with cryptographic actor identity",
    },
    {
      id: 3,
      number: "04",
      title: "Member Management",
      icon: Users,
      purpose:
        "Addition or removal of family dependents affecting monthly quota entitlements.",
      actor: "PDS Operational Officer",
      security:
        "Aadhaar UID de-duplication cross-checked against municipal records",
      ai: "Family Expansion Velocity & Entitlement Spike Anomaly Scoring",
      integrity: "Family Member Array hash recalculated & anchored",
      evidence: "Family Tree DAG delta committed to decentralized ledger",
    },
    {
      id: 4,
      number: "05",
      title: "Eligibility Change",
      icon: FileCheck,
      purpose:
        "Re-evaluation of BPL / PHH / AAY status based on verified income thresholds.",
      actor: "District Welfare Officer",
      security: "Dual-officer Authorization for Category Escalations",
      ai: "Socio-economic Indicator & Income Discrepancy Detection",
      integrity: "Entitlement Quota Matrix SHA-256 state update",
      evidence: "Eligibility Certification CID pinned with timestamped block",
    },
    {
      id: 5,
      number: "06",
      title: "Distribution Transaction",
      icon: Building2,
      purpose:
        "Physical release of subsidized rice, wheat, and sugar at Fair Price Shops.",
      actor: "Fair Price Shop (FPS) Terminal & Citizen",
      security: "Simulated e-POS Biometric Match & One-Time Token Verification",
      ai: "Unusual Off-Hours Distribution & Stock Depletion Pattern Scan",
      integrity: "Cryptographic Distribution Receipt hash generated",
      evidence: "Immutable Distribution Receipt CID anchored to IPFS",
    },
    {
      id: 6,
      number: "07",
      title: "Migration / Transfer",
      icon: Activity,
      purpose:
        "Inter-district or inter-state relocation to a new Fair Price Shop center.",
      actor: "Relocation Officer & Origin/Destination FPS Authorities",
      security: "Cryptographic Portability Authorization Token",
      ai: "Multi-location Concurrent Quota Claim Detection",
      integrity:
        "Location node provenance pointer updated with unbroken audit chain",
      evidence: "Inter-center Transfer Manifest anchored on IPFS DAG",
    },
    {
      id: 7,
      number: "08",
      title: "Deactivation",
      icon: ShieldAlert,
      purpose:
        "Controlled deactivation due to ineligibility, migration completion, or death.",
      actor: "Chief PDS Administrator with mandatory audit justification",
      security:
        "Multi-level Administrative Approval & Cryptographic Audit Event Log",
      ai: "Deactivation Justification Audit & Anomaly Review",
      integrity:
        "Record status irrevocably flagged as DEACTIVATED in state tree",
      evidence: "Final Termination Certificate CID pinned permanently",
    },
  ];

  const current = stages[selectedStage];

  return (
    <section
      id="lifecycle"
      className="py-14 border-t border-border bg-background"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground bg-secondary px-3 py-1 rounded-md border border-border">
            Interactive Lifecycle Engine
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            End-to-End PDS Record Lifecycle
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Click any of the 8 lifecycle stages below to inspect the responsible
            actor, cryptographic verification, AI risk scan, and generated IPFS
            provenance evidence.
          </p>
        </div>

        {/* 8-Stage Horizontal Interactive Button Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
          {stages.map((stg) => {
            const Icon = stg.icon;
            const isSelected = selectedStage === stg.id;
            return (
              <button
                key={stg.id}
                onClick={() => setSelectedStage(stg.id)}
                className={`p-3 rounded-md border text-left transition-all duration-150 flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-secondary/70 text-foreground ring-1 ring-primary shadow-subtle"
                    : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">
                    {stg.number}
                  </span>
                  <Icon
                    className={`size-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                  />
                </div>
                <span className="text-xs font-bold text-foreground block truncate">
                  {stg.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detailed Stage Inspection Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="rounded-md border border-border bg-card p-6 md:p-8 shadow-card space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border border-border bg-secondary text-foreground">
                    STAGE {current.number}
                  </span>
                  <h3 className="text-xl font-bold text-foreground">
                    {current.title}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {current.purpose}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono text-foreground bg-muted/60 px-3 py-1.5 rounded-md border border-border">
                <ShieldCheck className="size-4 text-primary" />
                <span>NON-REPUDIATION GUARANTEED</span>
              </div>
            </div>

            {/* 5-Attribute Detailed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Actor */}
              <div className="p-4 rounded-md bg-muted/30 border border-border space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" /> Actor Responsible
                </span>
                <p className="font-semibold text-foreground">{current.actor}</p>
              </div>

              {/* Security Validation */}
              <div className="p-4 rounded-md bg-muted/30 border border-border space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Lock className="size-3.5 text-primary" /> Security Validation
                </span>
                <p className="font-semibold text-foreground">
                  {current.security}
                </p>
              </div>

              {/* AI Involvement */}
              <div className="p-4 rounded-md bg-muted/30 border border-border space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Cpu className="size-3.5 text-primary" /> AI Anomaly Scan
                </span>
                <p className="font-semibold text-foreground">{current.ai}</p>
              </div>

              {/* Integrity Event */}
              <div className="p-4 rounded-md bg-muted/30 border border-border space-y-1.5 md:col-span-2 lg:col-span-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" />{" "}
                  Cryptographic Integrity Action
                </span>
                <p className="font-semibold text-foreground font-mono text-[11px]">
                  {current.integrity}
                </p>
              </div>

              {/* IPFS Provenance Evidence */}
              <div className="p-4 rounded-md bg-muted/30 border border-border space-y-1.5 md:col-span-2 lg:col-span-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Database className="size-3.5 text-primary" /> IPFS Evidence
                  Generated
                </span>
                <p className="font-semibold text-primary font-mono text-[11px]">
                  {current.evidence}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
