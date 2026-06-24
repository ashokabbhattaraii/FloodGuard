'use client';

import { useState, useEffect } from 'react';
import { floodRequestsService } from '@/app/services';
import { useUsers } from '@/app/queries/users';

const TABS = ['all', 'pending', 'assigned', 'in_progress', 'completed'] as const;
const statusColors: Record<string, string> = { pending: '#ca8a04', assigned: '#2563eb', in_progress: '#0369a1', completed: '#16a34a', cancelled: '#dc2626' };
const priorityColors: Record<string, string> = { low: '#16a34a', medium: '#ca8a04', high: '#f97316', critical: '#dc2626' };
const typeColors: Record<string, string> = { evacuation: '#f97316', rescue: '#dc2626', relief: '#2563eb', medical: '#be123c', shelter: '#0369a1' };

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const usersQuery = useUsers();
  
  // Filter users to get only volunteers
  const rawUsers = Array.isArray(usersQuery.data) ? usersQuery.data : [];
  const volunteerList = rawUsers.filter((u: any) => u.role === 'volunteer');

  const fetchRequests = () => {
    setLoading(true);
    const params = tab === 'all' ? undefined : { status: tab };
    floodRequestsService.getAll(params)
      .then(data => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
    // Setup automatic refresh every 30s to keep escalation timers updated
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [tab]);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      await floodRequestsService.update(id, { status });
      fetchRequests();
    } catch {}
    setActionLoading(null);
  };

  const handleManualAssign = async (requestId: string, volunteerId: string) => {
    if (!volunteerId) return;
    setActionLoading(requestId);
    try {
      await floodRequestsService.assign(requestId, volunteerId);
      alert('Volunteer assigned successfully!');
      fetchRequests();
    } catch (e: any) {
      alert('Failed to assign volunteer: ' + (e.response?.data?.message || e.message));
    } finally {
      setActionLoading(null);
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const isEscalated = (createdAtStr: string, status: string) => {
    if (status !== 'pending') return false;
    const diffMs = Date.now() - new Date(createdAtStr).getTime();
    return diffMs > 180000; // 3 minutes threshold
  };

  const filtered = tab === 'all' ? requests : requests.filter(r => r.status === tab);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-app">SOS Disaster Request Management</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`min-h-10 px-4 py-2 rounded-[10px] text-sm font-medium transition-colors ${tab === t ? 'bg-[var(--accent)] text-white' : 'border border-app bg-[var(--glass-bg-2)] text-app-muted hover:text-app hover:bg-[var(--accent-soft)]'}`}>
            {t === 'all' ? 'All Operations' : t === 'in_progress' ? 'In Progress' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-[12px] bg-[var(--accent-soft)] animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-app-muted text-sm text-center py-12">No requests found in this category.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any) => {
            const escalated = isEscalated(r.createdAt, r.status);
            
            return (
              <div 
                key={r.id} 
                className={`surface-card rounded-[12px] p-5 transition-all border ${
                  escalated 
                    ? 'border-red-500/50 bg-red-500/[0.03] shadow-[0_0_12px_rgba(239,68,68,0.1)]' 
                    : 'border-app hover:border-[var(--accent)]'
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-app">{r.title}</h3>
                      <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold uppercase" style={{ color: typeColors[r.type] || '#2563eb', background: `${typeColors[r.type] || '#2563eb'}18` }}>{r.type}</span>
                      <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold uppercase" style={{ color: priorityColors[r.priority] || '#ca8a04', background: `${priorityColors[r.priority] || '#ca8a04'}18` }}>{r.priority}</span>
                      <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold uppercase" style={{ color: statusColors[r.status] || '#ca8a04', background: `${statusColors[r.status] || '#ca8a04'}18` }}>{r.status?.replace('_', ' ')}</span>
                      
                      {/* SLA Escalation Badge */}
                      {escalated && (
                        <span className="animate-pulse bg-red-600 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          ⚠️ SLA EXPIRED (&gt;3m)
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-app-muted leading-relaxed">
                      <strong>Resident:</strong> {r.user?.name || 'Anonymous'} • <strong>Location:</strong> {r.location} {r.peopleCount ? `• 👥 Stranded: ${r.peopleCount}` : ''} {r.createdAt ? `• 🕒 ${timeAgo(r.createdAt)}` : ''}
                    </p>
                    
                    <p className="text-xs text-app-muted italic border-l-2 border-app pl-2 mt-1">
                      "{r.description}"
                    </p>

                    {r.notes && (
                      <p className="text-xs text-accent font-medium mt-1">
                        <strong>Responder Notes:</strong> "{r.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-app/5">
                    {/* Manual Assignment Dropdown */}
                    {r.status === 'pending' && (
                      <div className="flex items-center gap-1.5 min-w-[200px]">
                        <select
                          disabled={actionLoading === r.id}
                          onChange={(e) => handleManualAssign(r.id, e.target.value)}
                          defaultValue=""
                          className="form-control px-2 py-1.5 text-[11.5px] bg-app/5 border-app rounded-[8px] focus:outline-none focus:border-accent text-app w-full font-medium"
                        >
                          <option value="" disabled>Manual Dispatch...</option>
                          {volunteerList.length === 0 ? (
                            <option value="" disabled>No volunteers registered</option>
                          ) : (
                            volunteerList.map((v: any) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-2 justify-end">
                      {r.status === 'pending' && (
                        <button onClick={() => updateStatus(r.id, 'assigned')} disabled={actionLoading === r.id} className="px-3 py-1.5 rounded-lg bg-[rgba(59,130,246,0.15)] text-[#3b82f6] text-xs font-medium hover:bg-[rgba(59,130,246,0.25)] transition-colors disabled:opacity-50">Assign General</button>
                      )}
                      {(r.status === 'pending' || r.status === 'assigned') && (
                        <button onClick={() => updateStatus(r.id, 'in_progress')} disabled={actionLoading === r.id} className="px-3 py-1.5 rounded-lg bg-[var(--accent-soft)] text-accent text-xs font-medium hover:bg-[var(--glass-bg-2)] transition-colors disabled:opacity-50">In Progress</button>
                      )}
                      {r.status !== 'completed' && r.status !== 'cancelled' && (
                        <button onClick={() => updateStatus(r.id, 'completed')} disabled={actionLoading === r.id} className="px-3 py-1.5 rounded-lg bg-[rgba(22,163,74,0.15)] text-[#16a34a] text-xs font-medium hover:bg-[rgba(22,163,74,0.25)] transition-colors disabled:opacity-50">Complete</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

