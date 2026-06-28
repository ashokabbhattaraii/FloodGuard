"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/queries/auth";
import { dashboardRootForRole } from "@/app/lib/auth-helpers";

export default function DashboardIndex() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isLoading) return;
    router.replace(dashboardRootForRole(auth.data?.role));
  }, [auth.isLoading, auth.data?.role, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <span className="text-app-muted text-[14px] animate-pulse">Redirecting…</span>
    </div>
  );
}
