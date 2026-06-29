'use client';

import { useState, useEffect } from 'react';
import { volunteerHelpService, HelpRequest } from '@/app/services/volunteer-help';
import { toast } from 'sonner';

const priorityColors: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#f5a623',
  low: '#16a34a',
};

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'rgba(245,166,35,0.12)', text: '#f5a623', label: 'Pending' },
  accepted: { bg: 'rgba(22,163,74,0.12)', text: '#16a34a', label: 'Accepted' },
  rejected: { bg: 'rgba(220,38,38,0.12)', text: '#dc2626', label: 'Declined' },
};

export default function HelpRequestsPage() {
  const [receivedRequests, setReceivedRequests] = useState<HelpRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<HelpRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [responseType, setResponseType] = useState<'accepted' | 'rejected'>('accepted');
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const [received, sent] = await Promise.all([
        volunteerHelpService.getReceivedRequests(),
        volunteerHelpService.getSentRequests(),
      ]);
      setReceivedRequests(received);
      setSentRequests(sent);
    } catch (error: any) {
      toast.error('Failed to load help requests');
    } finally {
      setLoading(false);
    }
  };

  const openResponseModal = (request: HelpRequest, type: 'accepted' | 'rejected') => {
    setSelectedRequest(request);
    setResponseType(type);
    setResponseMessage('');
    setShowResponseModal(true);
  };

  const handleRespond = async () => {
    if (!selectedRequest) return;

    if (responseType === 'rejected' && !responseMessage.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }

    try {
      setResponding(selectedRequest.id);
      await volunteerHelpService.respondToRequest(
        selectedRequest.id,
        responseType,
        responseMessage.trim() || undefined
      );

      toast.success(
        responseType === 'accepted'
          ? 'Help request accepted! The volunteer has been notified.'
          : 'Help request declined. The volunteer has been notified.'
      );

      setShowResponseModal(false);
      setSelectedRequest(null);
      setResponseMessage('');
      loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to respond');
    } finally {
      setResponding(null);
    }
  };

  const pendingReceived = receivedRequests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-app">Help Requests</h1>
          <p className="text-sm text-app-muted mt-1">Coordinate with fellow volunteers</p>
        </div>
        {pendingReceived.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(245,166,35,0.12)] border border-[rgba(245,166,35,0.25)]">
            <span className="text-[#f5a623] text-sm font-semibold">{pendingReceived.length} pending</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-app">
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'received'
              ? 'text-accent'
              : 'text-app-muted hover:text-app'
          }`}
        >
          Received
          {pendingReceived.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-[#f5a623] text-white text-xs">
              {pendingReceived.length}
            </span>
          )}
          {activeTab === 'received' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'sent'
              ? 'text-accent'
              : 'text-app-muted hover:text-app'
          }`}
        >
          Sent
          {activeTab === 'sent' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-lg bg-[var(--accent-soft)] animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'received' ? (
        <div className="space-y-4">
          {receivedRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-app-muted">No help requests received yet</p>
            </div>
          ) : (
            receivedRequests.map(request => (
              <div
                key={request.id}
                className="surface-card rounded-lg p-5 hover:border-accent transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          background: statusBadge[request.status].bg,
                          color: statusBadge[request.status].text,
                        }}
                      >
                        {statusBadge[request.status].label}
                      </span>
                      {request.floodRequest && (
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            background: `${priorityColors[request.floodRequest.priority]}15`,
                            color: priorityColors[request.floodRequest.priority],
                          }}
                        >
                          {request.floodRequest.priority?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-app">
                      {request.floodRequest?.title || 'Help Request'}
                    </h3>
                    <p className="text-sm text-app-muted mt-1">
                      📍 {request.floodRequest?.location}
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--accent-soft)] rounded-lg p-3 mb-3">
                  <p className="text-sm text-app font-medium mb-1">Message:</p>
                  <p className="text-sm text-app-muted">{request.message}</p>
                </div>

                {request.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openResponseModal(request, 'accepted')}
                      disabled={!!responding}
                      className="flex-1 px-4 py-2 rounded-lg bg-[#16a34a] text-white font-medium hover:bg-[#15803d] disabled:opacity-50 transition-colors"
                    >
                      ✓ Accept & Help
                    </button>
                    <button
                      onClick={() => openResponseModal(request, 'rejected')}
                      disabled={!!responding}
                      className="flex-1 px-4 py-2 rounded-lg border border-app text-app hover:bg-[var(--accent-soft)] disabled:opacity-50 transition-colors"
                    >
                      ✗ Decline
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-app-muted">
                    <p>
                      <strong>Your response:</strong> {request.responseMessage || 'No additional message'}
                    </p>
                    <p className="text-xs mt-1">
                      Responded on {new Date(request.respondedAt!).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sentRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-app-muted">No help requests sent yet</p>
              <p className="text-sm text-app-muted mt-2">
                You can request help from the task details page
              </p>
            </div>
          ) : (
            sentRequests.map(request => (
              <div
                key={request.id}
                className="surface-card rounded-lg p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          background: statusBadge[request.status].bg,
                          color: statusBadge[request.status].text,
                        }}
                      >
                        {statusBadge[request.status].label}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-app">
                      {request.floodRequest?.title || 'Help Request'}
                    </h3>
                    <p className="text-sm text-app-muted mt-1">
                      📍 {request.floodRequest?.location}
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--accent-soft)] rounded-lg p-3 mb-2">
                  <p className="text-sm text-app font-medium mb-1">Your message:</p>
                  <p className="text-sm text-app-muted">{request.message}</p>
                </div>

                {request.status !== 'pending' && request.responseMessage && (
                  <div className="border-t border-app pt-3 mt-3">
                    <p className="text-sm text-app font-medium mb-1">Response:</p>
                    <p className="text-sm text-app-muted">{request.responseMessage}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowResponseModal(false)}
          />
          <div className="relative surface-card rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-app mb-4">
              {responseType === 'accepted' ? 'Accept Help Request' : 'Decline Help Request'}
            </h2>

            <div className="mb-4">
              <p className="text-sm text-app-muted mb-2">Task: {selectedRequest.floodRequest?.title}</p>
              <p className="text-sm text-app-muted">Message: {selectedRequest.message}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-app mb-2">
                {responseType === 'accepted' ? 'Add a note (optional)' : 'Reason for declining *'}
              </label>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder={
                  responseType === 'accepted'
                    ? 'E.g., "I\'ll join you at the location in 15 minutes"'
                    : 'E.g., "Currently handling another emergency"'
                }
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-app bg-[var(--bg)] text-app"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowResponseModal(false)}
                disabled={!!responding}
                className="flex-1 px-4 py-2 rounded-lg border border-app text-app hover:bg-[var(--accent-soft)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={!!responding}
                className={`flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${
                  responseType === 'accepted'
                    ? 'bg-[#16a34a] text-white hover:bg-[#15803d]'
                    : 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                }`}
              >
                {responding ? 'Sending...' : responseType === 'accepted' ? 'Accept' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
