import { apiClient } from './api-client';

// Public API endpoints that don't require authentication
export interface PublicStats {
  totalRegions: number;
  activeAlerts: number;
  criticalAlerts: number;
  totalReports: number;
  totalShelters: number;
  totalVolunteers: number;
  systemUptime: number;
  avgResponseTime: number;
  regionsAtRisk: number;
  recentAlerts: Array<{
    id: string;
    title: string;
    severity: string;
    regionName: string;
    createdAt: string;
  }>;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

class PublicStatsClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

  async getPublicStats(): Promise<PublicStats> {
    try {
      const res = await fetch(`${this.baseUrl}/public/stats`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to fetch stats');
      }

      return res.json();
    } catch (error) {
      console.error('Error fetching public stats:', error);
      // Return fallback data
      return {
        totalRegions: 4,
        activeAlerts: 2,
        criticalAlerts: 0,
        totalReports: 156,
        totalShelters: 12,
        totalVolunteers: 8,
        systemUptime: 99.9,
        avgResponseTime: 245,
        regionsAtRisk: 1,
        recentAlerts: [],
        riskDistribution: {
          critical: 0,
          high: 1,
          medium: 2,
          low: 1,
        },
      };
    }
  }
}

export const publicStatsClient = new PublicStatsClient();
