interface RegionCardProps {
  region: any;
  onClick: () => void;
}

const RISK_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  critical: {
    bg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, var(--card-bg) 60%)',
    text: '#dc2626',
    badge: '#dc262620',
  },
  high: {
    bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, var(--card-bg) 60%)',
    text: '#f97316',
    badge: '#f9731620',
  },
  medium: {
    bg: 'linear-gradient(135deg, rgba(3, 105, 161, 0.08) 0%, var(--card-bg) 60%)',
    text: '#0369a1',
    badge: '#0369a120',
  },
  low: {
    bg: 'linear-gradient(135deg, rgba(22, 163, 74, 0.08) 0%, var(--card-bg) 60%)',
    text: '#16a34a',
    badge: '#16a34a20',
  },
};

export default function RegionCard({ region, onClick }: RegionCardProps) {
  const risk = region.riskLevel || 'low';
  const colors = RISK_COLORS[risk] || RISK_COLORS.low;

  const sensorCount = region.sensorCount || 0;
  const alertCount = region.alertCount || 0;
  const volunteerCount = region.volunteerCount || 0;
  const shelterCount = region.shelterCount || 0;

  const updatedAt = region.updatedAt ? new Date(region.updatedAt) : null;
  const timeAgo = updatedAt ? getTimeAgo(updatedAt) : '—';

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden surface-card rounded-[12px] p-5 transition-all duration-200 hover:scale-[1.01] text-left w-full"
      style={{ background: colors.bg }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-app truncate">{region.name}</h3>
          {region.description && (
            <p className="text-xs text-app-muted mt-1 line-clamp-2">
              {region.description}
            </p>
          )}
        </div>
        <span
          className="ml-3 px-2.5 py-1 rounded-[6px] text-[11px] font-medium capitalize shrink-0"
          style={{ backgroundColor: colors.badge, color: colors.text }}
        >
          {risk}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div>
          <div className="text-[10px] text-app-muted uppercase tracking-wide">Sensors</div>
          <div className="text-lg font-bold text-app">{sensorCount}</div>
        </div>
        <div>
          <div className="text-[10px] text-app-muted uppercase tracking-wide">Alerts</div>
          <div className="text-lg font-bold text-app">{alertCount}</div>
        </div>
        <div>
          <div className="text-[10px] text-app-muted uppercase tracking-wide">Volunteers</div>
          <div className="text-lg font-bold text-app">{volunteerCount}</div>
        </div>
        <div>
          <div className="text-[10px] text-app-muted uppercase tracking-wide">Shelters</div>
          <div className="text-lg font-bold text-app">{shelterCount}</div>
        </div>
      </div>

      {/* Location Info */}
      {region.centerLat && region.centerLng && (
        <div className="text-[11px] text-app-muted mb-3 font-mono">
          📍 {region.centerLat.toFixed(4)}°, {region.centerLng.toFixed(4)}°
          {region.population && (
            <span className="ml-3">
              👥 {region.population.toLocaleString()} residents
            </span>
          )}
        </div>
      )}

      {/* Status Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
        <p className="text-xs text-app-muted">
          {alertCount > 0 ? (
            <span style={{ color: colors.text }}>
              ⚠ {alertCount} active alert{alertCount > 1 ? 's' : ''}
            </span>
          ) : (
            '✓ All systems normal'
          )}
        </p>
        <span className="text-[11px] text-app-muted">Updated {timeAgo}</span>
      </div>
    </button>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
