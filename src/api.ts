import { Site, AdSlot, User, AuditLog, AnalyticsData } from './types';

let authToken: string | null = localStorage.getItem('adplatform_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('adplatform_token', token);
  } else {
    localStorage.removeItem('adplatform_token');
  }
}

export function getToken(): string | null {
  return authToken || localStorage.getItem('adplatform_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      setToken(null);
    }
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) errorMsg = body.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const data = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data;
  },

  register: async (email: string, password: string) => {
    const data = await request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data;
  },

  getMe: async () => {
    return request<{ user: User }>('/api/auth/me');
  },

  updateProfile: async (profileData: { email?: string; currentPassword: string; newPassword?: string }) => {
    const data = await request<{ message: string; user: User; token: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  logout: async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setToken(null);
    }
  },

  // Sites
  getSites: async () => {
    return request<{ sites: Site[] }>('/api/sites');
  },

  createSite: async (name: string, domain: string) => {
    return request<{ site: Site }>('/api/sites', {
      method: 'POST',
      body: JSON.stringify({ name, domain }),
    });
  },

  deleteSite: async (id: string) => {
    return request<{ message: string }>(`/api/sites/${id}`, {
      method: 'DELETE',
    });
  },

  // Ad Slots
  getSlots: async (siteId?: string) => {
    const url = siteId ? `/api/slots?siteId=${encodeURIComponent(siteId)}` : '/api/slots';
    return request<{ slots: AdSlot[] }>(url);
  },

  createSlot: async (slotData: Partial<AdSlot>) => {
    return request<{ slot: AdSlot }>('/api/slots', {
      method: 'POST',
      body: JSON.stringify(slotData),
    });
  },

  updateSlot: async (id: string, updates: Partial<AdSlot>) => {
    return request<{ slot: AdSlot }>(`/api/slots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteSlot: async (id: string) => {
    return request<{ message: string }>(`/api/slots/${id}`, {
      method: 'DELETE',
    });
  },

  bulkDeleteSlots: async (siteId: string) => {
    return request<{ message: string; deletedCount: number }>(`/api/sites/${siteId}/slots/bulk-delete`, {
      method: 'DELETE',
    });
  },

  // Analytics & Logs
  getAnalytics: async () => {
    return request<{ analytics: AnalyticsData }>('/api/analytics');
  },

  getAuditLogs: async () => {
    return request<{ logs: AuditLog[] }>('/api/audit-logs');
  },

  getTrafficAnalytics: async () => {
    return request<{
      traffic: {
        totalImpressions: number;
        totalClicks: number;
        successfulLoginsCount: number;
        failedLoginAttemptsCount: number;
        uniqueIpVisitorsCount: number;
        topCountries: {
          code: string;
          name: string;
          flag: string;
          visitorsCount: number;
          percentage: number;
        }[];
        topPages: {
          url: string;
          views: number;
          uniqueIps: number;
        }[];
        liveFeed: {
          id: string;
          email: string;
          action: string;
          status: 'SUCCESS' | 'FAILED' | 'WARNING';
          details: string;
          ip: string;
          country: string;
          countryCode: string;
          countryFlag: string;
          city: string;
          page: string;
          device: string;
          timestamp: string;
        }[];
        loginActivity: {
          id: string;
          email: string;
          action: string;
          status: 'SUCCESS' | 'FAILED';
          details: string;
          ip: string;
          timestamp: string;
        }[];
        auditTrail: AuditLog[];
      };
    }>('/api/traffic-analytics');
  },

  // Admin Users Management
  getAdminUsers: async () => {
    return request<{ users: User[] }>('/api/admin/users');
  },

  createAdminUser: async (userData: { email: string; password: string; role?: 'admin' | 'user' }) => {
    return request<{ user: User }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateAdminUser: async (id: string, updates: { email?: string; role?: 'admin' | 'user'; password?: string }) => {
    return request<{ user: User }>(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  banAdminUser: async (id: string, isBanned: boolean) => {
    return request<{ message: string; user: User }>(`/api/admin/users/${id}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ isBanned }),
    });
  },

  deleteAdminUser: async (id: string) => {
    return request<{ message: string }>(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Public Test Ping
  trackTestImpression: async (slotId: string, siteId: string) => {
    return request('/api/v1/track/impression', {
      method: 'POST',
      body: JSON.stringify({
        slotId,
        siteId,
        referer: window.location.href + ' [AdPlatform Sandbox]',
      }),
    });
  },
};
