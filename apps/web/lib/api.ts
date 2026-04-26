import { getSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await getSession();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Leaderboard
export const leaderboard = {
  getAll: (params?: { category?: string; timeRange?: string }) => {
    const query = new URLSearchParams(params || {}).toString();
    return apiClient(`/leaderboard${query ? `?${query}` : ''}`);
  },
  getStats: (userId: string) => apiClient(`/leaderboard/${userId}/stats`),
};

// Matches
export const matches = {
  getAll: (params?: { status?: string }) => {
    const query = new URLSearchParams(params || {}).toString();
    return apiClient(`/matches${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiClient(`/matches/${id}`),
  create: (data: unknown) =>
    apiClient('/matches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Users
export const users = {
  getMe: () => apiClient('/users/me'),
  updateMe: (data: unknown) =>
    apiClient('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getPresets: () => apiClient('/users/avatars/presets'),
};

// Scheduled Matches
export const scheduledMatches = {
  getAll: () => apiClient('/scheduled-matches'),
  getById: (id: string) => apiClient(`/scheduled-matches/${id}`),
  create: (data: unknown) =>
    apiClient('/scheduled-matches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  join: (id: string) =>
    apiClient(`/scheduled-matches/${id}/join`, { method: 'POST' }),
  leave: (id: string) =>
    apiClient(`/scheduled-matches/${id}/leave`, { method: 'DELETE' }),
  delete: (id: string) =>
    apiClient(`/scheduled-matches/${id}`, { method: 'DELETE' }),
};

// Admin
export const admin = {
  getPendingSubmissions: () => apiClient('/admin/submissions'),
  approveSubmission: (id: string, reason?: string) =>
    apiClient(`/admin/submissions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  rejectSubmission: (id: string, reason?: string) =>
    apiClient(`/admin/submissions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getUsers: () => apiClient('/admin/users'),
  updateUser: (id: string, data: unknown) =>
    apiClient(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteUser: (id: string, reason: string) =>
    apiClient(`/admin/users/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  updateMatch: (id: string, data: unknown) =>
    apiClient(`/admin/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteMatch: (id: string, reason: string) =>
    apiClient(`/admin/matches/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
};
