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
