import { apiClient } from './api-client';

export interface VolunteerInfo {
  id: string;
  name: string;
  email: string;
  regionId?: string;
}

export interface HelpRequest {
  id: string;
  floodRequestId: string;
  requestedBy: string;
  requestedTo: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  responseMessage?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
  floodRequest?: {
    id: string;
    title: string;
    description: string;
    location: string;
    type: string;
    priority: string;
    status: string;
    user: {
      name: string;
      email: string;
    };
  };
}

export interface HelpRequestStats {
  receivedPending: number;
  sentPending: number;
  acceptedByMe: number;
  acceptedForMe: number;
}

export const volunteerHelpService = {
  async getNearbyVolunteers(floodRequestId: string): Promise<VolunteerInfo[]> {
    return apiClient.get<VolunteerInfo[]>(`/volunteer-help/nearby/${floodRequestId}`);
  },

  async requestHelp(floodRequestId: string, requestedTo: string, message: string): Promise<HelpRequest> {
    return apiClient.post<HelpRequest>('/volunteer-help', {
      floodRequestId,
      requestedTo,
      message,
    });
  },

  async getReceivedRequests(status?: string): Promise<HelpRequest[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    return apiClient.get<HelpRequest[]>('/volunteer-help/received', params);
  },

  async getSentRequests(): Promise<HelpRequest[]> {
    return apiClient.get<HelpRequest[]>('/volunteer-help/sent');
  },

  async getHelpRequestsForTask(floodRequestId: string): Promise<HelpRequest[]> {
    return apiClient.get<HelpRequest[]>(`/volunteer-help/task/${floodRequestId}`);
  },

  async respondToRequest(
    helpRequestId: string,
    status: 'accepted' | 'rejected',
    responseMessage?: string
  ): Promise<HelpRequest> {
    return apiClient.patch<HelpRequest>(`/volunteer-help/${helpRequestId}/respond`, {
      status,
      responseMessage,
    });
  },

  async getStats(): Promise<HelpRequestStats> {
    return apiClient.get<HelpRequestStats>('/volunteer-help/stats');
  },
};
