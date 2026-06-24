'use client';
import { useState, useEffect } from 'react';
import { useReports, useUpdateReport } from '@/app/queries/reports';
import { PageHeader, LoadingRows, EmptyState } from '@/app/(dashboard)/_components/DashboardUI';

const tabs = ['All', 'Pending', 'Verified', 'Rejected'] as const;
type TabType = (typeof tabs)[number];

export default function ReportsReview() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('All');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Map Tab selector to query param
  const statusParam = activeTab === 'All' ? undefined : activeTab.toLowerCase();
  
  const reportsQuery = useReports({ status: statusParam });
  const updateMutation = useUpdateReport();

  const handleReviewReport = async (id: string, status: 'verified' | 'rejected') => {
    await updateMutation.mutateAsync({ id, status });
  };

  const getInitials = (name: string) => {
    if (!name) return 'RE';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-app">Reports Review</h1>
        <LoadingRows count={3} />
      </div>
    );
  }

  const reports = Array.isArray(reportsQuery.data) ? reportsQuery.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports Review"
        subtitle="Review, verify, and catalog flood reports submitted by local residents in real time."
      />
      
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`min-h-10 px-4 py-2 rounded-[10px] text-sm font-semibold transition-colors ${
              activeTab === tab
                ? 'bg-[var(--accent)] text-white'
                : 'border border-app bg-[var(--glass-bg-2)] text-app-muted hover:text-app hover:bg-[var(--accent-soft)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {reportsQuery.isLoading ? (
        <LoadingRows count={3} />
      ) : reports.length === 0 ? (
        <EmptyState message={`No reports found in the "${activeTab}" queue.`} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reports.map((r: any) => {
            const userName = r.user?.name || 'Anonymous Resident';
            const initials = getInitials(userName);
            const isPending = r.status === 'pending';
            
            // Status colors
            const statusStyle =
              r.status === 'verified'
                ? 'bg-emerald-500/10 text-emerald-400'
                : r.status === 'rejected'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-yellow-500/10 text-yellow-400';

            return (
              <div
                key={r.id}
                className="surface-card rounded-[12px] p-5 hover:border-[var(--accent)] transition-all duration-200 space-y-3 flex flex-col justify-between border border-app"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[var(--accent-soft)] flex items-center justify-center text-xs font-bold text-accent shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-app truncate">{userName}</div>
                      <div className="flex items-center gap-1 text-xs text-app-muted mt-0.5 truncate">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{r.latitude ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}` : 'No GPS Coordinates'}</span>
                      </div>
                    </div>
                    <span className="text-xs text-app-muted shrink-0">
                      {new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <p className="text-sm text-app-muted leading-relaxed">{r.description}</p>
                  
                  {r.waterLevel !== null && r.waterLevel !== undefined && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-app-muted">Water Level Reported:</span>
                      <span className="font-semibold text-accent">{r.waterLevel} meters</span>
                    </div>
                  )}

                  {r.photoUrl ? (
                    <div className="w-full rounded-[10px] overflow-hidden border border-app aspect-video relative bg-app/10">
                      <img src={r.photoUrl} alt="Report evidence" className="object-cover w-full h-full" />
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-[10px] bg-app/5 border border-app flex flex-col items-center justify-center text-app-muted gap-1.5">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      <span className="text-[11px]">No Photo Attachment</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-app/5 mt-3">
                  <span className={`px-2.5 py-0.5 rounded-[6px] text-[10px] font-bold uppercase ${statusStyle}`}>
                    {r.status}
                  </span>

                  {isPending && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewReport(r.id, 'verified')}
                        className="px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[rgba(22,163,74,0.12)] text-[#16a34a] hover:bg-[rgba(22,163,74,0.2)] transition-colors border-0 cursor-pointer"
                        disabled={updateMutation.isPending}
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => handleReviewReport(r.id, 'rejected')}
                        className="px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[rgba(220,38,38,0.12)] text-[#dc2626] hover:bg-[rgba(220,38,38,0.2)] transition-colors border-0 cursor-pointer"
                        disabled={updateMutation.isPending}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

