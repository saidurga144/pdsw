import React from 'react';

export const Spinner: React.FC = () => (
  <div className="flex items-center justify-center space-x-2">
    <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    <span className="text-sm text-muted-foreground">Loading...</span>
  </div>
);
