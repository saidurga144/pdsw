import React, { useEffect } from 'react';
import { useBeneficiaryStore } from '@/stores/beneficiary.store';
import { useAuthStore } from '@/stores/auth.store'; // Assuming an auth store exists
import { Spinner } from '@/components/ui/Spinner'; // Adjust import path if needed
import { Alert } from '@/components/ui/Alert'; // Adjust import path if needed

/**
 * BeneficiaryProfile component displays the authenticated beneficiary's profile.
 * It integrates with the Beneficiary store to handle loading, error, and data display.
 */
export const BeneficiaryProfile: React.FC = () => {
  const { profile, isLoading, error } = useBeneficiaryStore((state) => ({
    profile: state.profile,
    isLoading: state.isLoading,
    error: state.error,
  }));

  const user = useAuthStore((s) => s.user);

  // Load profile on mount
  useEffect(() => {
    if (user) {
      // Call ensureLoaded with the authenticated user
      useBeneficiaryStore.getState().ensureLoaded(user);
    }
  }, [user]);

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  if (!profile) {
    return <div>No profile data available.</div>;
  }

  const { fullName, phone, address, eligibility } = profile;

  return (
    <div className="p-4 bg-white rounded shadow-lg">
      <h2 className="text-xl font-semibold mb-2">Beneficiary Profile</h2>
      <p><strong>Name:</strong> {fullName}</p>
      <p><strong>Phone:</strong> {phone}</p>
      <p><strong>Address:</strong> {address.doorNo}, {address.street}, {address.district}, {address.state} - {address.pincode}</p>
      <h3 className="mt-4 text-lg font-medium">Eligibility</h3>
      <p><strong>Status:</strong> {eligibility.status}</p>
      <p><strong>Monthly Income:</strong> ₹{eligibility.monthlyIncome}</p>
      <ul className="mt-2 list-disc list-inside">
        {eligibility.monthlyEntitlements.map((ent) => (
          <li key={ent.commodity}>
            {ent.commodity}: {ent.quantity} {ent.unit} @ ₹{ent.subsidizedPricePerUnit}/unit
          </li>
        ))}
      </ul>
    </div>
  );
};
