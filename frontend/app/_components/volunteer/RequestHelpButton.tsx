'use client';

import { useState } from 'react';
import { volunteerHelpService, VolunteerInfo } from '@/app/services/volunteer-help';
import { toast } from 'sonner';

interface RequestHelpButtonProps {
  floodRequestId: string;
  taskTitle: string;
}

export default function RequestHelpButton({ floodRequestId, taskTitle }: RequestHelpButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [volunteers, setVolunteers] = useState<VolunteerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const openModal = async () => {
    setShowModal(true);
    setLoading(true);
    try {
      const nearbyVolunteers = await volunteerHelpService.getNearbyVolunteers(floodRequestId);
      setVolunteers(nearbyVolunteers);
    } catch (error: any) {
      toast.error('Failed to load nearby volunteers');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestHelp = async () => {
    if (!selectedVolunteer) {
      toast.error('Please select a volunteer');
      return;
    }

    if (!message.trim()) {
      toast.error('Please provide a message explaining why you need help');
      return;
    }

    try {
      setRequesting(selectedVolunteer);
      await volunteerHelpService.requestHelp(floodRequestId, selectedVolunteer, message);
      toast.success('Help request sent! The volunteer will be notified.');
      setShowModal(false);
      setSelectedVolunteer(null);
      setMessage('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send help request');
    } finally {
      setRequesting(null);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[#075985] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 6v6M10 14h.01"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Request Help
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <div className="relative surface-card rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-app">Request Help from Volunteer</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-app-muted hover:text-app"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M6 6l8 8M14 6l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-app-muted">Task: <span className="font-medium text-app">{taskTitle}</span></p>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-lg bg-[var(--accent-soft)] animate-pulse" />
                ))}
              </div>
            ) : volunteers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-app-muted">No nearby volunteers available at the moment</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-app mb-2">
                    Select a volunteer to request help from:
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {volunteers.map(volunteer => (
                      <button
                        key={volunteer.id}
                        onClick={() => setSelectedVolunteer(volunteer.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                          selectedVolunteer === volunteer.id
                            ? 'border-accent bg-[var(--accent-soft)]'
                            : 'border-app hover:border-accent hover:bg-[var(--accent-soft)]'
                        }`}
                      >
                        <p className="font-medium text-app">{volunteer.name}</p>
                        <p className="text-sm text-app-muted">{volunteer.email}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-app mb-2">
                    Why do you need help? *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="E.g., 'Need assistance with evacuation of 5 people' or 'Situation is more complex than expected'"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-app bg-[var(--bg)] text-app"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={!!requesting}
                    className="flex-1 px-4 py-2 rounded-lg border border-app text-app hover:bg-[var(--accent-soft)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestHelp}
                    disabled={!!requesting || !selectedVolunteer}
                    className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[#075985] disabled:opacity-50"
                  >
                    {requesting ? 'Sending...' : 'Send Help Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
