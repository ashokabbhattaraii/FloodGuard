'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { floodRequestsService } from '@/app/services';

const REQUEST_TYPES = ['evacuation', 'rescue', 'relief', 'medical', 'shelter'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

const statusColors: Record<string, string> = { pending: '#ca8a04', assigned: '#2563eb', in_progress: '#0369a1', completed: '#16a34a', cancelled: '#dc2626' };
const priorityColors: Record<string, string> = { low: '#16a34a', medium: '#ca8a04', high: '#f97316', critical: '#dc2626' };

const typeIcons: Record<string, React.ReactNode> = {
  evacuation: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="13" width="22" height="6" rx="1"/><path d="M2 13V7a2 2 0 012-2h4l2-2h4l2 2h4a2 2 0 012 2v6"/></svg>,
  rescue: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>,
  relief: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
  medical: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
  shelter: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
};

export function ResidentRequestsPageContent() {
  const searchParams = useSearchParams();
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  
  // Safe toggle state
  const [isSafe, setIsSafe] = useState(true);

  const [form, setForm] = useState({
    type: 'rescue',
    priority: 'medium',
    title: '',
    description: '',
    location: '',
    peopleCount: '',
    contactPhone: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const [msg, setMsg] = useState('');

  // Prefill coordinates if present in URL search params
  useEffect(() => {
    if (latParam && lngParam) {
      const parsedLat = parseFloat(latParam);
      const parsedLng = parseFloat(lngParam);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setForm((prev) => ({
          ...prev,
          latitude: parsedLat,
          longitude: parsedLng,
          location: prev.location ? prev.location : `Map Location (${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)})`,
        }));
      }
    }
  }, [latParam, lngParam]);

  useEffect(() => {
    const savedSafe = localStorage.getItem('fg_resident_safe');
    if (savedSafe !== null) {
      setIsSafe(savedSafe === 'true');
    }
  }, []);

  const handleSafeToggle = async () => {
    const nextSafe = !isSafe;
    setIsSafe(nextSafe);
    localStorage.setItem('fg_resident_safe', String(nextSafe));

    if (nextSafe) {
      toast.success('Status updated', {
        description: 'You\'ve been marked as safe.',
      });
    } else {
      toast.warning('Status updated', {
        description: 'You\'ve been marked as needing help.',
      });
    }

    // If marking safe, offer to cancel active requests
    if (nextSafe) {
      const active = requests.filter(r => r.status === 'pending' || r.status === 'assigned' || r.status === 'in_progress');
      if (active.length > 0 && confirm(`You have ${active.length} active help request(s). Would you like to cancel them?`)) {
        let cancelled = 0;
        for (const req of active) {
          try {
            await floodRequestsService.update(req.id, { status: 'cancelled' });
            cancelled++;
          } catch (e) {
            console.error('Failed to cancel request:', e);
          }
        }
        if (cancelled > 0) {
          toast.success(`${cancelled} request(s) cancelled`, {
            description: 'Your active requests have been cancelled.',
          });
        }
        fetchRequests();
      }
    }
  };

  const fetchRequests = () => {
    floodRequestsService.getMy()
      .then(data => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);

  const triggerOneTapSOS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    if (!confirm('WARNING: This will immediately broadcast a CRITICAL SOS Alert with your real-time GPS coordinates. Proceed?')) {
      return;
    }

    setSosLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await floodRequestsService.create({
            type: 'rescue',
            priority: 'critical',
            title: 'EMERGENCY: One-Tap SOS Broadcasted',
            description: 'Stranded resident triggered emergency button. Search & rescue required at exact GPS target.',
            location: `GPS Coordinates: [${latitude.toFixed(5)}, ${longitude.toFixed(5)}]`,
            latitude,
            longitude,
            peopleCount: 1,
          });
          setIsSafe(false);
          localStorage.setItem('fg_resident_safe', 'false');
          alert('SOS Alert Dispatched! Responders are being coordinated to your location.');
          fetchRequests();
        } catch (err: any) {
          alert('Failed to dispatch SOS request: ' + (err.message || 'Unknown error'));
        } finally {
          setSosLoading(false);
        }
      },
      (error) => {
        setSosLoading(false);
        let errMsg = 'Failed to capture GPS location. Please check browser permissions.';
        if (error.code === error.PERMISSION_DENIED) errMsg = 'GPS Access Denied.';
        else if (error.code === error.POSITION_UNAVAILABLE) errMsg = 'GPS signal unavailable.';
        setGpsError(errMsg);
        alert(errMsg + ' SOS could not be triggered automatically.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const detectFormLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setForm(f => ({
          ...f,
          latitude,
          longitude,
          location: `${latitude.toFixed(5)}, ${longitude.toFixed(5)} (My Current Location)`,
        }));
      },
      () => alert('Could not resolve location. Please input address manually.')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await floodRequestsService.create({
        ...form,
        peopleCount: form.peopleCount ? Number(form.peopleCount) : undefined,
      });
      toast.success('Help request submitted', {
        description: 'Emergency responders have been notified of your request.',
      });
      setMsg('Request submitted successfully!');
      setForm({ type: 'rescue', priority: 'medium', title: '', description: '', location: '', peopleCount: '', contactPhone: '', latitude: undefined, longitude: undefined });
      fetchRequests();
    } catch (err: any) {
      toast.error('Failed to submit request', {
        description: err.message || 'Please try again.',
      });
      setMsg(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-app">Flood Help Requests</h1>
        
        {/* Safety toggle */}
        <div className="flex items-center gap-3 bg-[var(--accent-soft)] border border-app rounded-xl p-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-app-muted uppercase">My Safety Status</span>
            <span className={`text-[13px] font-bold ${isSafe ? 'text-emerald-400' : 'text-red-400'}`}>
              {isSafe ? 'I am currently Safe' : 'Awaiting Rescue'}
            </span>
          </div>
          <button 
            onClick={handleSafeToggle}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${
              isSafe 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
            }`}
          >
            {isSafe ? 'Mark Stranded' : 'Mark Safe'}
          </button>
        </div>
      </div>

      {/* Emergency SOS Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Big SOS button card */}
        <div className="md:col-span-2 bg-gradient-to-br from-red-600/20 to-orange-600/15 border border-red-500/30 rounded-2xl p-6 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="space-y-2 flex-1">
            <h2 className="text-red-400 text-lg font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              One-Tap Emergency SOS
            </h2>
            <p className="text-app-muted text-[13.5px] leading-relaxed max-w-md">
              Stranded? Injured? Need instant evacuation? Press this button to broadcast your immediate GPS location to all online volunteer responders and administrators.
            </p>
            {gpsError && <p className="text-[12px] text-red-400 font-semibold">{gpsError}</p>}
          </div>

          <button
            onClick={triggerOneTapSOS}
            disabled={sosLoading}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-red-500/40 bg-red-600 hover:bg-red-500 text-white font-black text-[22px] shadow-2xl flex items-center justify-center flex-col uppercase transition-all duration-300 transform active:scale-95 shrink-0 ${
              sosLoading ? 'animate-pulse' : 'animate-[beacon_2s_infinite]'
            }`}
          >
            {sosLoading ? (
              <span className="text-[12px] font-semibold text-white/90">Locating...</span>
            ) : (
              <>
                <span>SOS</span>
                <span className="text-[10px] tracking-widest font-bold opacity-80 mt-0.5">Press</span>
              </>
            )}
          </button>
        </div>

        {/* Dynamic Risk Guidance */}
        <div className="surface-card rounded-2xl p-5 border border-app flex flex-col justify-between">
          <div>
            <h3 className="text-app text-[14.5px] font-bold mb-2">Emergency Protocols</h3>
            <ul className="text-app-muted text-[12.5px] space-y-2 leading-relaxed">
              <li>• Seek high ground immediately if basement floods.</li>
              <li>• Turn off main breaker switches to avoid electrocution.</li>
              <li>• Stay away from power lines and fast-moving rivers.</li>
              <li>• Keep phone batteries conserved for search operations.</li>
            </ul>
          </div>
          <a
            href="/dashboard/resident/evacuation"
            className="text-accent text-[12px] font-semibold hover:underline block mt-4"
          >
            View Evacuation Routes & Shelters →
          </a>
        </div>
      </div>

      {/* Submit Form */}
      <div className="surface-card rounded-[12px] p-6 border border-app">
        <h2 className="text-lg font-medium text-app mb-4">Request Relief, Shelter, or Support</h2>
        {msg && <div className={`px-4 py-2 rounded-[10px] text-sm mb-4 ${msg.includes('success') ? 'bg-[rgba(22,163,74,0.1)] text-[#16a34a]' : 'bg-[rgba(220,38,38,0.1)] text-[#dc2626]'}`}>{msg}</div>}
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-app-muted block mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="form-control px-3 py-2.5 text-sm bg-app/5 border-app rounded-[10px] w-full text-app">
              {REQUEST_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-app-muted block mb-1">Priority</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="form-control px-3 py-2.5 text-sm bg-app/5 border-app rounded-[10px] w-full text-app">
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-app-muted block mb-1">Title</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="form-control px-3 py-2.5 text-sm bg-app/5 border-app rounded-[10px] w-full text-app" placeholder="e.g. Clean water shortage" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-app-muted block mb-1">Description</label>
            <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="form-control px-3 py-2.5 text-sm resize-none min-h-[104px] bg-app/5 border-app rounded-[10px] w-full text-app" placeholder="Describe what supplies or assistance is needed, including headcount details..." />
          </div>
          <div>
            <label className="text-xs text-app-muted block mb-1 flex items-center justify-between">
              <span>Location / Street Address</span>
              <button
                type="button"
                onClick={detectFormLocation}
                className="text-accent text-[11px] hover:underline flex items-center gap-1 font-semibold"
              >
                📍 Use My GPS
              </button>
            </label>
            <input required value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="form-control px-3 py-2.5 text-sm bg-app/5 border-app rounded-[10px] w-full text-app" placeholder="e.g. Kathmandu Block 4B or coordinates" />
          </div>
          <div>
            <label className="text-xs text-app-muted block mb-1">People Count</label>
            <input type="number" min="1" value={form.peopleCount} onChange={e => setForm(f => ({ ...f, peopleCount: e.target.value }))} className="form-control px-3 py-2.5 text-sm bg-app/5 border-app rounded-[10px] w-full text-app" placeholder="Number of people stranded" />
          </div>
          <div>
            <label className="text-xs text-app-muted block mb-1">Contact Phone</label>
            <input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} className="form-control px-3 py-2.5 text-sm bg-app/5 border-app rounded-[10px] w-full text-app" placeholder="e.g. 9841234567" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm shadow">
              {submitting ? 'Submitting...' : 'Submit Help Request'}
            </button>
          </div>
        </form>
      </div>

      {/* My Requests List */}
      <div className="surface-card rounded-[12px] p-6 border border-app">
        <h2 className="text-lg font-medium text-app mb-4">My Requests & Dispatch Logs</h2>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--accent-soft)] animate-pulse" />)}</div>
        ) : requests.length === 0 ? (
          <p className="text-app-muted text-sm text-center py-8">No requests yet. Submit one above.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r: any) => (
              <div key={r.id} className="rounded-[10px] border border-app p-4 hover:border-[var(--accent)] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-app-muted">{typeIcons[r.type] || typeIcons.rescue}</span>
                    <h3 className="text-sm font-medium text-app">{r.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="px-2 py-1 rounded-[6px] text-[10px] font-bold uppercase" style={{ color: priorityColors[r.priority] || '#ca8a04', background: `${priorityColors[r.priority] || '#ca8a04'}18` }}>{r.priority}</span>
                    <span className="px-2 py-1 rounded-[6px] text-[10px] font-bold uppercase" style={{ color: statusColors[r.status] || '#ca8a04', background: `${statusColors[r.status] || '#ca8a04'}18` }}>{r.status?.replace('_', ' ')}</span>
                  </div>
                </div>
                <p className="text-xs text-app-muted mt-2">{r.location} • {r.peopleCount ? `${r.peopleCount} people` : ''} {r.createdAt ? `• ${timeAgo(r.createdAt)}` : ''}</p>
                {r.notes && (
                  <p className="text-xs text-app italic mt-2 border-t border-app/5 pt-2">
                    Responder Notes: "{r.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResidentRequestsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    }>
      <ReportsPageWrap />
    </Suspense>
  );
}

function ReportsPageWrap() {
  return <ResidentRequestsPageContent />;
}

