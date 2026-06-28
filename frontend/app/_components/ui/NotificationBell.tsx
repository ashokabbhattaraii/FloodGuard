'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useUnreadCount,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@/app/queries/notifications';
import type { AppNotification } from '@/app/services/notifications';

const TYPE_META: Record<string, { icon: string; color: string }> = {
  alert: { icon: 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', color: '#f97316' },
  request: { icon: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', color: '#dc2626' },
  report: { icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6', color: '#a855f7' },
  shelter: { icon: 'M3 10l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', color: '#0369a1' },
  system: { icon: 'M12 8v4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', color: '#7c7cff' },
};

const SEV_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#ca8a04',
  low: '#16a34a',
  success: '#16a34a',
  info: '#7c7cff',
};

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = useUnreadCount();
  const list = useNotifications(open);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();

  const count = unread.data?.count ?? 0;
  const items: AppNotification[] = Array.isArray(list.data) ? list.data : [];

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleOpen = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-10 h-10 rounded-[10px] border border-app bg-[var(--glass-bg)] flex items-center justify-center text-app hover:bg-[var(--accent-soft)] transition-colors"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#dc2626] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[var(--chrome-bg)]">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] surface-card rounded-[14px] border border-app shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-app">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-app">Notifications</h3>
              {count > 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#dc2626]/10 text-[#dc2626]">{count} new</span>
              )}
            </div>
            {items.some((n) => !n.readAt) && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="text-[12px] text-accent hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {list.isLoading ? (
              <div className="py-10 text-center text-app-muted text-[13px]">Loading…</div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center px-6">
                <div className="w-12 h-12 mx-auto rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-accent mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  </svg>
                </div>
                <p className="text-[13px] text-app-muted">You're all caught up.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border-soft)]">
                {items.map((n) => {
                  const meta = TYPE_META[n.type] || TYPE_META.system;
                  const sev = SEV_COLOR[n.severity] || meta.color;
                  return (
                    <li
                      key={n.id}
                      className={`group flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-[var(--accent-soft)] ${
                        n.readAt ? '' : 'bg-[var(--accent-soft)]/40'
                      }`}
                      onClick={() => handleOpen(n)}
                    >
                      <span
                        className="shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center mt-0.5"
                        style={{ background: `${sev}1a`, color: sev }}
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d={meta.icon} />
                        </svg>
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-app truncate flex-1">{n.title}</p>
                          {!n.readAt && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                        </div>
                        <p className="text-[12px] text-app-muted leading-snug mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-app-muted mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove.mutate(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-app-muted hover:text-[#dc2626] shrink-0 p-1"
                        aria-label="Dismiss"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
