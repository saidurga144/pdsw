"use client";

import React, { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div
      className="w-full h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: "#eef0f5" }}
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
