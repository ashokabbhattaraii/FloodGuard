'use client';

import { useAuth } from '@/app/queries/auth';

export default function PendingApprovalBanner() {
  const { data: user } = useAuth();

  // Only show for volunteers who are not approved
  if (!user || user.role !== 'volunteer' || user.isApproved) {
    return null;
  }

  return (
    <div className="mb-6 surface-card rounded-2xl p-5 border-2 border-[#f97316] shadow-lg">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-[#f97316] mb-1">
            ⏳ Account Pending Approval
          </h3>
          <p className="text-sm text-app-muted leading-relaxed mb-3">
            Your volunteer account is currently under review by an administrator. You can browse the dashboard, but certain volunteer actions will be restricted until your account is approved.
          </p>
          <div className="flex items-center gap-2 text-xs text-app-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Registered: {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
