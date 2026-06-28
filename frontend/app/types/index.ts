import type { Role, Severity } from '@/app/constants';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  regionId?: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  regionId: string;
  regionName: string;
  status: 'active' | 'resolved';
  issuedBy: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface Report {
  id: string;
  userId: string;
  userName: string;
  location: string;
  description: string;
  photoUrl?: string;
  severity: Severity;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

export interface Region {
  id: string;
  name: string;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  sensorCount: number;
  activeAlerts: number;
  lastUpdated: string;
}

export interface Shelter {
  id: string;
  name: string;
  distance: string;
  capacity: number;
  currentOccupancy: number;
  status: 'open' | 'full';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  details: string;
  ipAddress: string;
}

export interface CloudService {
  name: string;
  status: 'healthy' | 'warning' | 'down';
  metrics: Record<string, string>;
}
