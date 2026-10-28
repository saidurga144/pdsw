import React from "react";

/**
 * Beneficiary section layout.
 * Adds the `beneficiary-dashboard` scoping class so vintage script typography
 * applies ONLY to beneficiary pages — no other dashboard is affected.
 */
export default function BeneficiaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="beneficiary-dashboard w-full">{children}</div>;
}
