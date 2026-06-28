'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAlerts, useCreateAlert, useUpdateAlert } from '@/app/queries/alerts';
import { useRegions } from '@/app/queries/regions';
import { PageHeader, LoadingRows, EmptyState } from '@/app/(dashboard)/_components/DashboardUI';

const severityColor: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#0369a1',
  low: '#16a34a',
};

export default function AlertConsole() {
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [regionId, setRegionId] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const alertsQuery = useAlerts();
  const regionsQuery = useRegions();
  
  const createMutation = useCreateAlert();
  const updateMutation = useUpdateAlert();

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionId || !title.trim() || !description.trim()) return;

    try {
      await createMutation.mutateAsync({
        regionId,
        severity,
        title,
        description,
      });

      toast.success('Alert issued successfully', {
        description: `${title} has been broadcast to the region.`,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setShowForm(false);
    } catch (error: any) {
      toast.error('Failed to issue alert', {
        description: error?.message || 'Please try again.',
      });
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { status: 'resolved' },
      });
      toast.success('Alert resolved', {
        description: 'The alert has been marked as resolved.',
      });
    } catch (error: any) {
      toast.error('Failed to resolve alert', {
        description: error?.message || 'Please try again.',
      });
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-app">Alert Console</h1>
        <LoadingRows count={3} />
      </div>
    );
  }

  const alerts = Array.isArray(alertsQuery.data) ? alertsQuery.data : [];
  const regions = Array.isArray(regionsQuery.data) ? regionsQuery.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert Console"
        subtitle="Broadcast early flood warnings, manage evacuation mandates, and resolve expired emergency alerts."
        action={
          <button onClick={() => setShowForm(!showForm)} className="btn-primary px-4 py-2 text-sm">
            {showForm ? 'Cancel' : 'Issue New Alert'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleCreateAlert} className="surface-card rounded-[12px] p-5 space-y-4">
          <h2 className="text-lg font-semibold text-app">Issue Emergency Warning</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-app-muted uppercase mb-1">Target Region</label>
              <select
                required
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="form-control w-full px-4 py-2.5 text-sm bg-app/5 border-app rounded-[8px]"
              >
                <option value="">Select Region</option>
                {regions.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-muted uppercase mb-1">Severity Level</label>
              <select
                required
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="form-control w-full px-4 py-2.5 text-sm bg-app/5 border-app rounded-[8px]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium (Moderate)</option>
                <option value="high">High</option>
                <option value="critical">Critical (Immediate Danger)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-muted uppercase mb-1">Alert Headline / Title</label>
            <input
              type="text"
              required
              placeholder="e.g. River Level Danger Warning: Immediate Evacuation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-control w-full px-4 py-2.5 text-sm bg-app/5 border-app rounded-[8px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-muted uppercase mb-1">Advisory Description</label>
            <textarea
              required
              placeholder="Describe details, safety measures, recommended evacuation paths..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-control w-full px-4 py-2.5 text-sm bg-app/5 border-app rounded-[8px] resize-none min-h-[104px]"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded bg-app/10 hover:bg-app/20 text-app text-sm transition-all border-0"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary px-5 py-2.5 text-sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Broadcasting...' : 'Broadcast Alert'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        <h2 className="text-md font-semibold text-app uppercase tracking-wider text-[11px] text-app-muted">
          Active & Historical Warnings Feed
        </h2>
        {alertsQuery.isLoading ? (
          <LoadingRows count={3} />
        ) : alerts.length === 0 ? (
          <EmptyState message="No alerts issued yet." />
        ) : (
          alerts.map((a: any) => {
            const isResolved = a.status === 'resolved';
            const color = severityColor[a.severity.toLowerCase()] || '#a855f7';
            
            return (
              <div
                key={a.id}
                className="surface-card rounded-[12px] p-5 hover:border-[var(--accent)] transition-all duration-200 flex flex-wrap items-center gap-4 border border-app"
              >
                <span
                  className="px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase shrink-0"
                  style={{ backgroundColor: `${color}1a`, color }}
                >
                  {a.severity}
                </span>

                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-semibold text-app">{a.title}</div>
                  <div className="text-xs text-app-muted mt-1 leading-relaxed">{a.description}</div>
                  <div className="text-[11px] text-app-muted mt-2">
                    Region: <span className="font-semibold text-app">{a.regionName || 'Monitored Area'}</span> · Issued By:{' '}
                    <span className="font-semibold text-app">{a.issuedBy || 'Authority'}</span> ·{' '}
                    {new Date(a.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase ${
                      !isResolved
                        ? 'bg-[rgba(220,38,38,0.12)] text-[#dc2626]'
                        : 'bg-[rgba(22,163,74,0.12)] text-[#16a34a]'
                    }`}
                  >
                    {a.status}
                  </span>

                  {!isResolved && (
                    <button
                      onClick={() => handleResolveAlert(a.id)}
                      className="px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[rgba(22,163,74,0.12)] text-[#16a34a] hover:bg-[rgba(22,163,74,0.2)] transition-colors border-0"
                      disabled={updateMutation.isPending}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

