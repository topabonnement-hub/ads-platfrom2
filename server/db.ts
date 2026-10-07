import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface Site {
  id: string;
  userId: string;
  name: string;
  domain: string;
  publicKey: string;
  createdAt: string;
  updatedAt: string;
}

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
  legacyId?: string; // For [WP_KADS id=X] compatibility
  dimensions: string; // e.g. "responsive", "300x250", "728x90", "160x600", "320x50"
  config: AdSlotConfig;
  isActive: boolean;
  impressionsCount: number;
  clicksCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Impression {
  id: string;
  slotId: string;
  siteId: string;
  timestamp: string;
  referer?: string;
  userAgent?: string;
  ipHash?: string;
}

export interface Click {
  id: string;
  slotId: string;
  siteId: string;
  timestamp: string;
  referer?: string;
  targetUrl?: string;
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

interface DatabaseSchema {
  users: User[];
  sites: Site[];
  adSlots: AdSlot[];
  impressions: Impression[];
  clicks: Click[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'adplatform_db.json');

class StorageEngine {
  private data: DatabaseSchema = {
    users: [],
    sites: [],
    adSlots: [],
    impressions: [],
    clicks: [],
    auditLogs: [],
  };

  private isLoaded = false;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory:', err);
      }
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: parsed.users || [],
          sites: parsed.sites || [],
          adSlots: parsed.adSlots || [],
          impressions: parsed.impressions || [],
          clicks: parsed.clicks || [],
          auditLogs: parsed.auditLogs || [],
        };
        this.isLoaded = true;
      } catch (err) {
        console.error('Failed to parse database file, initializing empty:', err);
        this.data = {
          users: [],
          sites: [],
          adSlots: [],
          impressions: [],
          clicks: [],
          auditLogs: [],
        };
      }
    } else {
      this.seedDefaultData();
      this.saveImmediate();
    }
  }

  private seedDefaultData() {
    const adminId = 'usr_' + crypto.randomBytes(6).toString('hex');
    // Pre-hashed for 'admin123' -> $2a$10$w0.y18xG5cQ9L8Hh0FpBquP946g9eA6iWqI8p3V02m6oF9kY9bU6W
    // We also rehash in auth service if required
    const sampleUser: User = {
      id: adminId,
      email: 'admin@adplatform.local',
      passwordHash: '$2a$10$Q7y0eGkYlV5Bv/X9H2w/I.YJv7qV0p3wU1F0bF5i3Y4y9L8Hh0FpB', // default admin hash
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    const siteId = 'site_' + crypto.randomBytes(6).toString('hex');
    const sitePublicKey = 'pk_' + crypto.randomBytes(12).toString('hex');
    const sampleSite: Site = {
      id: siteId,
      userId: adminId,
      name: 'My News Blog (WordPress)',
      domain: 'example-news.com',
      publicKey: sitePublicKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const slot1: AdSlot = {
      id: 'slot_' + crypto.randomBytes(6).toString('hex'),
      siteId: siteId,
      userId: adminId,
      name: 'Header Leaderboard (AdSense)',
      type: 'adsense',
      legacyId: '1',
      dimensions: '728x90',
      config: {
        adsenseClientId: 'ca-pub-1234567890123456',
        adsenseSlotId: '9876543210',
        adsenseFormat: 'horizontal',
        responsive: true,
      },
      isActive: true,
      impressionsCount: 245,
      clicksCount: 14,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const slot2: AdSlot = {
      id: 'slot_' + crypto.randomBytes(6).toString('hex'),
      siteId: siteId,
      userId: adminId,
      name: 'Sidebar Banner (HTML)',
      type: 'html',
      legacyId: '2',
      dimensions: '300x250',
      config: {
        htmlContent: `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; background:linear-gradient(135deg, #1e293b, #0f172a); border:1px solid #334155; border-radius:12px; padding:20px; text-align:center; color:#fff; font-family:sans-serif; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
  <span style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; margin-bottom:6px;">Sponsored</span>
  <h3 style="margin:0 0 8px 0; font-size:18px; font-weight:700; color:#38bdf8;">Premium Web Hosting</h3>
  <p style="margin:0 0 14px 0; font-size:13px; color:#cbd5e1; line-height:1.4;">Ultra-fast SSD servers with 99.9% uptime guarantee.</p>
  <a href="https://example.com/hosting-offer" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#0284c7; color:#ffffff; padding:8px 18px; border-radius:8px; font-size:13px; font-weight:600; text-decoration:none;">Claim 60% Off &rarr;</a>
</div>`,
      },
      isActive: true,
      impressionsCount: 412,
      clicksCount: 38,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const slot3: AdSlot = {
      id: 'slot_' + crypto.randomBytes(6).toString('hex'),
      siteId: siteId,
      userId: adminId,
      name: 'Article Footer Interactive (JS)',
      type: 'custom_js',
      legacyId: '3',
      dimensions: 'responsive',
      config: {
        jsCode: `// Custom Interactive Ad Script
(function(container) {
  if (!container) return;
  var card = document.createElement('div');
  card.style.padding = '16px';
  card.style.background = '#0f172a';
  card.style.border = '1px solid #10b981';
  card.style.borderRadius = '10px';
  card.style.color = '#e2e8f0';
  card.style.fontFamily = 'system-ui, sans-serif';
  card.style.textAlign = 'center';
  card.innerHTML = '<strong style="color:#10b981; font-size:16px;">⚡ Special Promotion:</strong> <span style="margin:0 8px;">Exclusive Developer Toolkit 2026</span> <a href="#" style="color:#38bdf8; text-decoration:underline; font-weight:600;">Learn More</a>';
  container.appendChild(card);
})(document.currentScript ? document.currentScript.parentElement : (window.__ad_target_el || document.body));`,
      },
      isActive: true,
      impressionsCount: 189,
      clicksCount: 9,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.users = [sampleUser];
    this.data.sites = [sampleSite];
    this.data.adSlots = [slot1, slot2, slot3];
    this.data.auditLogs = [
      {
        id: 'log_' + crypto.randomBytes(6).toString('hex'),
        userId: adminId,
        userEmail: sampleUser.email,
        action: 'SYSTEM_INIT',
        details: 'AdPlatform database initialized with sample configuration.',
        ip: '127.0.0.1',
        timestamp: new Date().toISOString(),
      },
    ];
  }

  public save() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.saveImmediate();
    }, 150);
  }

  public saveImmediate() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempFile = DB_FILE + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  // User Operations
  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  // Site Operations
  public getSitesByUserId(userId: string): Site[] {
    return this.data.sites.filter(s => s.userId === userId);
  }

  public getSiteById(siteId: string): Site | undefined {
    return this.data.sites.find(s => s.id === siteId);
  }

  public getSiteByPublicKey(publicKey: string): Site | undefined {
    return this.data.sites.find(s => s.publicKey === publicKey);
  }

  public createSite(site: Site): Site {
    this.data.sites.push(site);
    this.save();
    return site;
  }

  public deleteSite(siteId: string, userId: string): boolean {
    const siteIndex = this.data.sites.findIndex(s => s.id === siteId && s.userId === userId);
    if (siteIndex === -1) return false;

    // Delete site and all its ad slots
    this.data.sites.splice(siteIndex, 1);
    this.data.adSlots = this.data.adSlots.filter(slot => slot.siteId !== siteId);
    this.data.impressions = this.data.impressions.filter(imp => imp.siteId !== siteId);
    this.data.clicks = this.data.clicks.filter(clk => clk.siteId !== siteId);
    this.save();
    return true;
  }

  // Ad Slot Operations
  public getSlotsBySiteId(siteId: string): AdSlot[] {
    return this.data.adSlots.filter(s => s.siteId === siteId);
  }

  public getSlotsByUserId(userId: string): AdSlot[] {
    return this.data.adSlots.filter(s => s.userId === userId);
  }

  public getSlotById(slotId: string): AdSlot | undefined {
    return this.data.adSlots.find(s => s.id === slotId);
  }

  public getSlotByLegacyId(siteId: string, legacyId: string): AdSlot | undefined {
    return this.data.adSlots.find(s => (s.siteId === siteId || !s.siteId) && s.legacyId === legacyId);
  }

  public findSlotByAnyIdentifier(identifier: string, sitePublicKey?: string): AdSlot | undefined {
    // 1. Check direct slot ID
    let slot = this.data.adSlots.find(s => s.id === identifier);
    if (slot) return slot;

    // 2. Check legacy ID if site is known
    if (sitePublicKey) {
      const site = this.getSiteByPublicKey(sitePublicKey);
      if (site) {
        slot = this.data.adSlots.find(s => s.siteId === site.id && (s.legacyId === identifier || s.id === identifier));
        if (slot) return slot;
      }
    }

    // 3. Fallback search by legacyId across all slots
    slot = this.data.adSlots.find(s => s.legacyId === identifier);
    return slot;
  }

  public createSlot(slot: AdSlot): AdSlot {
    this.data.adSlots.push(slot);
    this.save();
    return slot;
  }

  public updateSlot(slotId: string, userId: string, updates: Partial<AdSlot>): AdSlot | null {
    const slot = this.data.adSlots.find(s => s.id === slotId && s.userId === userId);
    if (!slot) return null;

    Object.assign(slot, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return slot;
  }

  public deleteSlot(slotId: string, userId: string): boolean {
    const idx = this.data.adSlots.findIndex(s => s.id === slotId && s.userId === userId);
    if (idx === -1) return false;

    this.data.adSlots.splice(idx, 1);
    this.save();
    return true;
  }

  public deleteAllSlotsForSite(siteId: string, userId: string): number {
    const site = this.getSiteById(siteId);
    if (!site || site.userId !== userId) return 0;

    const initialCount = this.data.adSlots.length;
    this.data.adSlots = this.data.adSlots.filter(s => s.siteId !== siteId);
    const deletedCount = initialCount - this.data.adSlots.length;
    this.save();
    return deletedCount;
  }

  // Tracking Operations
  public recordImpression(impression: Impression) {
    // Keep max 10,000 recent impressions in memory/json to prevent bloat
    if (this.data.impressions.length > 10000) {
      this.data.impressions = this.data.impressions.slice(-5000);
    }
    this.data.impressions.push(impression);

    const slot = this.data.adSlots.find(s => s.id === impression.slotId);
    if (slot) {
      slot.impressionsCount = (slot.impressionsCount || 0) + 1;
    }
    this.save();
  }

  public recordClick(click: Click) {
    if (this.data.clicks.length > 5000) {
      this.data.clicks = this.data.clicks.slice(-2500);
    }
    this.data.clicks.push(click);

    const slot = this.data.adSlots.find(s => s.id === click.slotId);
    if (slot) {
      slot.clicksCount = (slot.clicksCount || 0) + 1;
    }
    this.save();
  }

  // Audit Logs
  public addAuditLog(log: AuditLog) {
    if (this.data.auditLogs.length > 2000) {
      this.data.auditLogs = this.data.auditLogs.slice(-1000);
    }
    this.data.auditLogs.unshift(log);
    this.save();
  }

  public getAuditLogs(userId?: string): AuditLog[] {
    if (!userId) return this.data.auditLogs.slice(0, 100);
    return this.data.auditLogs.filter(l => !l.userId || l.userId === userId).slice(0, 100);
  }

  // Analytics helper
  public getAnalytics(userId: string) {
    const sites = this.getSitesByUserId(userId);
    const siteIds = new Set(sites.map(s => s.id));
    const slots = this.getSlotsByUserId(userId);

    const totalImpressions = slots.reduce((acc, s) => acc + (s.impressionsCount || 0), 0);
    const totalClicks = slots.reduce((acc, s) => acc + (s.clicksCount || 0), 0);
    const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

    // Recent impressions trend (last 7 days)
    const last7Days: { [date: string]: number } = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      last7Days[key] = 0;
    }

    this.data.impressions.forEach(imp => {
      if (siteIds.has(imp.siteId)) {
        const dateKey = imp.timestamp.split('T')[0];
        if (last7Days[dateKey] !== undefined) {
          last7Days[dateKey]++;
        }
      }
    });

    return {
      totalSites: sites.length,
      totalSlots: slots.length,
      totalImpressions,
      totalClicks,
      ctr: `${ctr}%`,
      trend: Object.entries(last7Days).map(([date, count]) => ({ date, impressions: count })),
      sitesSummary: sites.map(s => {
        const siteSlots = slots.filter(sl => sl.siteId === s.id);
        const imps = siteSlots.reduce((sum, sl) => sum + (sl.impressionsCount || 0), 0);
        const clks = siteSlots.reduce((sum, sl) => sum + (sl.clicksCount || 0), 0);
        return {
          id: s.id,
          name: s.name,
          domain: s.domain,
          publicKey: s.publicKey,
          slotsCount: siteSlots.length,
          impressions: imps,
          clicks: clks,
        };
      }),
    };
  }

  public exportData(userId: string) {
    const sites = this.getSitesByUserId(userId);
    const slots = this.getSlotsByUserId(userId);
    return {
      exportedAt: new Date().toISOString(),
      sites,
      slots,
    };
  }
}

export const db = new StorageEngine();
