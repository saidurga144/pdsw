'use client';

import React, { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';

function LoginFallback() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-muted rounded-md" />
      <div className="h-10 bg-muted rounded-md" />
      <div className="h-10 bg-muted rounded-md" />
      <div className="h-10 bg-muted rounded-md" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="py-6 px-4">
      <AuthLayout
        title="Access Government Portal"
        subtitle="Sign in with your authorized credentials and select your assigned portal role"
      >
        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </AuthLayout>
    </div>
  );
}
