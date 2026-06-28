export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
    timeout: 10000,
  },
  auth: {
    tokenKey: 'floodguard_token',
  },
} as const;
