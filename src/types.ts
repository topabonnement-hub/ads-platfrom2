export type AdSlotType = 'adsense' | 'html' | 'custom_js';

export interface AdSlotConfig {
  adsenseClientId?: string;
  adsenseSlotId?: string;
  adsenseFormat?: string;
  responsive?: boolean;
  htmlContent?: string;
  jsCode?: string;
  targetUrl?: string;
  imageUrl?: string;
  altText?: string;
}

export interface AdSlot {
  id: string;
  siteId: string;
  userId: string;
  name: string;
  type: AdSlotType;
  legacyId?: string;
  dimensions: string;
  config: AdSlotConfig;
  isActive: boolean;
  impressionsCount: number;
  clicksCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Site {
  id: string;
  userId: string;
  name: string;
  domain: string;
  publicKey: string;
  slotsCount?: number;
  impressions?: number;
  clicks?: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

export interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  details: string;
  ip: string;
  timestamp: string;
}

export interface AnalyticsData {
  totalSites: number;
  totalSlots: number;
  totalImpressions: number;
  totalClicks: number;
  ctr: string;
  trend: { date: string; impressions: number }[];
  sitesSummary: {
    id: string;
    name: string;
    domain: string;
    publicKey: string;
    slotsCount: number;
    impressions: number;
    clicks: number;
  }[];
}
