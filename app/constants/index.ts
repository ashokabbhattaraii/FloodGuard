export const APP_NAME = 'FloodGuard';
export const APP_DESCRIPTION = 'Real-Time Flood Early Warning System';

export const ROLES = {
  RESIDENT: 'resident',
  VOLUNTEER: 'volunteer',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

export const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#a855f7',
  low: '#22c55e',
};

export const REPORT_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export const ALERT_STATUS = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
} as const;
