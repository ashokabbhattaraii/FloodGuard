export const routes = {
  home: '/',
  login: '/login',
  register: '/register',

  dashboard: {
    resident: {
      root: '/dashboard/resident',
      alerts: '/dashboard/resident/alerts',
      map: '/dashboard/resident/map',
      reports: '/dashboard/resident/reports',
      evacuation: '/dashboard/resident/evacuation',
      requests: '/dashboard/resident/requests',
    },
    admin: {
      root: '/dashboard/admin',
      alerts: '/dashboard/admin/alerts',
      reports: '/dashboard/admin/reports',
      regions: '/dashboard/admin/regions',
      analytics: '/dashboard/admin/analytics',
      requests: '/dashboard/admin/requests',
      evacuation: '/dashboard/admin/evacuation',
      users: '/dashboard/admin/users',
    },
    volunteer: {
      root: '/dashboard/volunteer',
      requests: '/dashboard/volunteer/requests',
      shelters: '/dashboard/volunteer/shelters',
      relief: '/dashboard/volunteer/relief',
      activity: '/dashboard/volunteer/activity',
    },
  },
} as const;
