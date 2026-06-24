import { routes } from "@/app/lib/routes";

export type BackendRole = "resident" | "volunteer" | "admin";

/** Map the backend role to its dashboard root route. */
export function dashboardRootForRole(role?: string): string {
  switch (role) {
    case "admin":
      return routes.dashboard.admin.root;
    case "volunteer":
      return routes.dashboard.volunteer.root;
    case "resident":
    default:
      return routes.dashboard.resident.root;
  }
}

/** Human-friendly label for a role. */
export function roleLabel(role?: string): string {
  switch (role) {
    case "admin":
      return "Authority Admin";
    case "volunteer":
      return "Volunteer Responder";
    case "resident":
    default:
      return "Resident";
  }
}
