"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useUsers, usePendingVolunteers, useApproveVolunteer, useRejectVolunteer, useDeleteUser } from "@/app/queries/users";
import { PageHeader } from "@/app/(dashboard)/_components/DashboardUI";

const ic = (d: string) => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

const ROLE_COLORS: Record<string, string> = {
  resident: "#0369a1",
  volunteer: "#16a34a",
  admin: "#dc2626",
};

const ROLE_LABELS: Record<string, string> = {
  resident: "Resident",
  volunteer: "Volunteer",
  admin: "Admin",
};

export default function UserManagementPage() {
  const users = useUsers();
  const pendingVolunteers = usePendingVolunteers();
  const approveVolunteer = useApproveVolunteer();
  const rejectVolunteer = useRejectVolunteer();
  const deleteUser = useDeleteUser();

  const [selectedTab, setSelectedTab] = useState<"all" | "pending">("pending");

  const handleApprove = (id: string, name: string) => {
    approveVolunteer.mutate(id, {
      onSuccess: () => {
        toast.success("Volunteer approved", {
          description: `${name} can now access the volunteer dashboard`,
        });
      },
      onError: () => {
        toast.error("Failed to approve volunteer");
      },
    });
  };

  const handleReject = (id: string, name: string) => {
    if (!confirm(`Reject ${name}'s volunteer application? This will delete their account.`)) return;

    rejectVolunteer.mutate(id, {
      onSuccess: () => {
        toast.success("Volunteer application rejected", {
          description: `${name}'s account has been removed`,
        });
      },
      onError: () => {
        toast.error("Failed to reject volunteer");
      },
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This action cannot be undone.`)) return;

    deleteUser.mutate(id, {
      onSuccess: () => {
        toast.success("User deleted", { description: `${name} has been removed` });
      },
      onError: () => {
        toast.error("Failed to delete user");
      },
    });
  };

  const pendingCount = pendingVolunteers.data?.length ?? 0;
  const allUsers = users.data ?? [];

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage volunteer approvals and user accounts"
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedTab("pending")}
          className={`px-4 py-2 rounded-[10px] text-[14px] font-semibold transition-all ${
            selectedTab === "pending"
              ? "bg-[var(--accent-soft)] text-accent border border-accent"
              : "text-app-muted hover:text-app hover:bg-[var(--accent-soft)] border border-transparent"
          }`}
        >
          Pending Approvals
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-[#dc2626] text-white text-[11px] font-bold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setSelectedTab("all")}
          className={`px-4 py-2 rounded-[10px] text-[14px] font-semibold transition-all ${
            selectedTab === "all"
              ? "bg-[var(--accent-soft)] text-accent border border-accent"
              : "text-app-muted hover:text-app hover:bg-[var(--accent-soft)] border border-transparent"
          }`}
        >
          All Users
        </button>
      </div>

      {/* Pending Volunteers */}
      {selectedTab === "pending" && (
        <div className="surface-card rounded-[14px] p-6 border border-app">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-accent">{ic("M12 9v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0")}</span>
            <h2 className="text-[16px] font-[650] text-app">Volunteer Applications</h2>
          </div>

          {pendingVolunteers.isLoading ? (
            <div className="py-12 text-center text-app-muted text-[14px]">Loading...</div>
          ) : pendingCount === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-accent mb-3">
                {ic("M9 5l7 7-7 7")}
              </div>
              <p className="text-[14px] text-app-muted">No pending volunteer applications</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {pendingVolunteers.data?.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-[10px] border border-app bg-[var(--glass-bg-2)]"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold text-app">{user.name}</h3>
                    <p className="text-[13px] text-app-muted mt-0.5">{user.email}</p>
                    <p className="text-[11px] text-app-muted mt-1">
                      Applied: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(user.id, user.name)}
                      disabled={approveVolunteer.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#16a34a] text-white text-[13px] font-semibold hover:bg-[#15803d] transition-colors disabled:opacity-50"
                    >
                      {ic("M5 12l3 3 7-7")}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(user.id, user.name)}
                      disabled={rejectVolunteer.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-[10px] border border-[#dc2626] text-[#dc2626] text-[13px] font-semibold hover:bg-[rgba(220,38,38,0.08)] transition-colors disabled:opacity-50"
                    >
                      {ic("M6 6l12 12M18 6L6 18")}
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Users */}
      {selectedTab === "all" && (
        <div className="surface-card rounded-[14px] border border-app overflow-hidden">
          <div className="p-6 border-b border-app">
            <div className="flex items-center gap-3">
              <span className="text-accent">{ic("M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8z")}</span>
              <h2 className="text-[16px] font-[650] text-app">All Users ({allUsers.length})</h2>
            </div>
          </div>

          {users.isLoading ? (
            <div className="py-12 text-center text-app-muted text-[14px]">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--glass-bg)] text-[12px] text-app-muted uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold">Name</th>
                    <th className="text-left px-6 py-3 font-semibold">Email</th>
                    <th className="text-left px-6 py-3 font-semibold">Role</th>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                    <th className="text-left px-6 py-3 font-semibold">Joined</th>
                    <th className="text-right px-6 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {allUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[var(--accent-soft)] transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-[14px] font-semibold text-app">{user.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[13px] text-app-muted">{user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{
                            background: `${ROLE_COLORS[user.role]}15`,
                            color: ROLE_COLORS[user.role],
                          }}
                        >
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === "volunteer" ? (
                          user.isApproved ? (
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-[#16a34a] font-medium">
                              {ic("M5 12l3 3 7-7")}
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-[#ca8a04] font-medium">
                              {ic("M12 9v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0")}
                              Pending
                            </span>
                          )
                        ) : (
                          <span className="text-[12px] text-app-muted">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[13px] text-app-muted">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user.role !== "admin" && (
                          <button
                            onClick={() => handleDelete(user.id, user.name)}
                            disabled={deleteUser.isPending}
                            className="text-[#dc2626] hover:underline text-[13px] font-medium disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
