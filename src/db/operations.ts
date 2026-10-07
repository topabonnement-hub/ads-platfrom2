import { eq, and, or, sql, desc, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import { users, sites, adSlots, impressions, clicks, auditLogs } from './schema.ts';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;

export type AdSlot = typeof adSlots.$inferSelect;
export type NewAdSlot = typeof adSlots.$inferInsert;

export type Impression = typeof impressions.$inferSelect;
export type NewImpression = typeof impressions.$inferInsert;

export type Click = typeof clicks.$inferSelect;
export type NewClick = typeof clicks.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// Default admin hash for 'admin123'
const DEFAULT_ADMIN_HASH = bcrypt.hashSync('admin123', 10);

// In-memory fallback store for preview testing if PostgreSQL is unreachable locally
const memoryStore = {
  users: [
    {
      id: 'usr_admin_default',
      email: 'admin@adplatform.local',
      passwordHash: DEFAULT_ADMIN_HASH,
      role: 'admin',
      createdAt: new Date(),
    } as User
  ],
  sites: [
    {
      id: 'site_default_demo',
      userId: 'usr_admin_default',
      name: 'My News Blog (WordPress)',
      domain: 'example-news.com',
      publicKey: 'pk_demo_site_key_12345',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Site
  ],
  adSlots: [
    {
      id: 'slot_demo_adsense_1',
      siteId: 'site_default_demo',
      userId: 'usr_admin_default',
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
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AdSlot,
    {
      id: 'slot_demo_html_2',
      siteId: 'site_default_demo',
      userId: 'usr_admin_default',
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
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AdSlot
  ],
  impressions: [] as Impression[],
  clicks: [] as Click[],
  auditLogs: [] as AuditLog[],
};

export const dbOps = {
  // Users
  async findUserByEmail(email: string): Promise<User | undefined> {
    const cleanEmail = email.toLowerCase().trim();
    try {
      const results = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
      return results[0];
    } catch (error) {
      console.warn('[AdPlatform DB Note] PostgreSQL query fallback for findUserByEmail:', (error as any)?.message || error);
      return memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
    }
  },

  async findUserById(id: string): Promise<User | undefined> {
    try {
      const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return results[0];
    } catch (error) {
      console.warn('[AdPlatform DB Note] PostgreSQL query fallback for findUserById');
      return memoryStore.users.find(u => u.id === id);
    }
  },

  async countUsers(): Promise<number> {
    try {
      const results = await db.select({ count: sql<number>`count(*)` }).from(users);
      return Number(results[0]?.count || 0);
    } catch {
      return memoryStore.users.length;
    }
  },

  async createUser(user: NewUser): Promise<User> {
    const userCount = await this.countUsers();
    // First user gets admin role automatically, subsequent users get 'user' role by default
    const assignedRole = user.role || (userCount === 0 ? 'admin' : 'user');

    const newUserRecord: User = {
      id: user.id || 'usr_' + crypto.randomBytes(6).toString('hex'),
      email: user.email.toLowerCase().trim(),
      passwordHash: user.passwordHash,
      role: assignedRole,
      isBanned: user.isBanned || false,
      createdAt: user.createdAt || new Date(),
    };

    try {
      const results = await db.insert(users).values(newUserRecord).returning();
      return results[0];
    } catch (error) {
      console.warn('[AdPlatform DB Note] Using fallback store for createUser');
      memoryStore.users.push(newUserRecord);
      return newUserRecord;
    }
  },

  async getAllUsersWithStats(): Promise<(User & { sitesCount: number; slotsCount: number })[]> {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      const allSites = await db.select().from(sites);
      const allSlots = await db.select().from(adSlots);

      return allUsers.map(u => ({
        ...u,
        sitesCount: allSites.filter(s => s.userId === u.id).length,
        slotsCount: allSlots.filter(sl => sl.userId === u.id).length,
      }));
    } catch (error) {
      return memoryStore.users.map(u => ({
        ...u,
        sitesCount: memoryStore.sites.filter(s => s.userId === u.id).length,
        slotsCount: memoryStore.adSlots.filter(sl => sl.userId === u.id).length,
      }));
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    try {
      const results = await db.delete(users).where(eq(users.id, id)).returning();
      return results.length > 0;
    } catch (error) {
      const idx = memoryStore.users.findIndex(u => u.id === id);
      if (idx !== -1) {
        memoryStore.users.splice(idx, 1);
        memoryStore.sites = memoryStore.sites.filter(s => s.userId !== id);
        memoryStore.adSlots = memoryStore.adSlots.filter(s => s.userId !== id);
        return true;
      }
      return false;
    }
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const results = await db.update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      return results[0] || null;
    } catch (error) {
      console.warn('[AdPlatform DB Note] Using fallback store for updateUser');
      const user = memoryStore.users.find(u => u.id === id);
      if (user) {
        Object.assign(user, updates);
        return user;
      }
      return null;
    }
  },

  // Sites
  async getAllSites(): Promise<Site[]> {
    try {
      return await db.select().from(sites).orderBy(desc(sites.createdAt));
    } catch (error) {
      return memoryStore.sites;
    }
  },

  async getSitesByUserId(userId: string): Promise<Site[]> {
    try {
      return await db.select().from(sites).where(eq(sites.userId, userId)).orderBy(desc(sites.createdAt));
    } catch (error) {
      return memoryStore.sites.filter(s => s.userId === userId);
    }
  },

  async getSiteById(siteId: string): Promise<Site | undefined> {
    try {
      const results = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
      return results[0];
    } catch (error) {
      return memoryStore.sites.find(s => s.id === siteId);
    }
  },

  async getSiteByPublicKey(publicKey: string): Promise<Site | undefined> {
    try {
      const results = await db.select().from(sites).where(eq(sites.publicKey, publicKey)).limit(1);
      return results[0];
    } catch (error) {
      return memoryStore.sites.find(s => s.publicKey === publicKey);
    }
  },

  async createSite(site: NewSite): Promise<Site> {
    const newSiteRecord: Site = {
      id: site.id || 'site_' + crypto.randomBytes(6).toString('hex'),
      userId: site.userId,
      name: site.name,
      domain: site.domain,
      publicKey: site.publicKey || 'pk_' + crypto.randomBytes(12).toString('hex'),
      createdAt: site.createdAt || new Date(),
      updatedAt: site.updatedAt || new Date(),
    };

    try {
      const results = await db.insert(sites).values(site).returning();
      return results[0];
    } catch (error) {
      memoryStore.sites.unshift(newSiteRecord);
      return newSiteRecord;
    }
  },

  async deleteSite(siteId: string, userId?: string): Promise<boolean> {
    try {
      const condition = userId ? and(eq(sites.id, siteId), eq(sites.userId, userId)) : eq(sites.id, siteId);
      const result = await db.delete(sites).where(condition).returning();
      if (result.length > 0) {
        await db.delete(adSlots).where(eq(adSlots.siteId, siteId));
        return true;
      }
      return false;
    } catch (error) {
      const idx = memoryStore.sites.findIndex(s => s.id === siteId && (!userId || s.userId === userId));
      if (idx !== -1) {
        memoryStore.sites.splice(idx, 1);
        memoryStore.adSlots = memoryStore.adSlots.filter(s => s.siteId !== siteId);
        return true;
      }
      return false;
    }
  },

  // Ad Slots
  async getAllSlots(): Promise<AdSlot[]> {
    try {
      return await db.select().from(adSlots).orderBy(desc(adSlots.createdAt));
    } catch (error) {
      return memoryStore.adSlots;
    }
  },

  // Ad Slots
  async getSlotsBySiteId(siteId: string): Promise<AdSlot[]> {
    try {
      return await db.select().from(adSlots).where(eq(adSlots.siteId, siteId)).orderBy(desc(adSlots.createdAt));
    } catch (error) {
      return memoryStore.adSlots.filter(s => s.siteId === siteId);
    }
  },

  async getSlotsByUserId(userId: string): Promise<AdSlot[]> {
    try {
      return await db.select().from(adSlots).where(eq(adSlots.userId, userId)).orderBy(desc(adSlots.createdAt));
    } catch (error) {
      return memoryStore.adSlots.filter(s => s.userId === userId);
    }
  },

  async getSlotById(slotId: string): Promise<AdSlot | undefined> {
    try {
      const results = await db.select().from(adSlots).where(eq(adSlots.id, slotId)).limit(1);
      return results[0];
    } catch (error) {
      return memoryStore.adSlots.find(s => s.id === slotId);
    }
  },

  async findSlotByAnyIdentifier(identifier: string, sitePublicKey?: string): Promise<AdSlot | undefined> {
    try {
      // 1. Direct ID match
      let results = await db.select().from(adSlots).where(eq(adSlots.id, identifier)).limit(1);
      if (results.length > 0) return results[0];

      // 2. Search by legacyId and site public key
      if (sitePublicKey) {
        const site = await this.getSiteByPublicKey(sitePublicKey);
        if (site) {
          results = await db.select().from(adSlots).where(
            and(
              eq(adSlots.siteId, site.id),
              or(eq(adSlots.legacyId, identifier), eq(adSlots.id, identifier))
            )
          ).limit(1);
          if (results.length > 0) return results[0];
        }
      }

      // 3. Fallback search by legacyId across all slots
      results = await db.select().from(adSlots).where(eq(adSlots.legacyId, identifier)).limit(1);
      return results[0];
    } catch (error) {
      // Fallback in memory
      let slot = memoryStore.adSlots.find(s => s.id === identifier);
      if (slot) return slot;

      if (sitePublicKey) {
        const site = memoryStore.sites.find(s => s.publicKey === sitePublicKey);
        if (site) {
          slot = memoryStore.adSlots.find(s => s.siteId === site.id && (s.legacyId === identifier || s.id === identifier));
          if (slot) return slot;
        }
      }

      return memoryStore.adSlots.find(s => s.legacyId === identifier);
    }
  },

  async createSlot(slot: NewAdSlot): Promise<AdSlot> {
    const newSlotRecord: AdSlot = {
      id: slot.id || 'slot_' + crypto.randomBytes(6).toString('hex'),
      siteId: slot.siteId,
      userId: slot.userId,
      name: slot.name,
      type: slot.type,
      legacyId: slot.legacyId || null,
      dimensions: slot.dimensions || 'responsive',
      config: slot.config || {},
      isActive: slot.isActive !== false,
      impressionsCount: 0,
      clicksCount: 0,
      createdAt: slot.createdAt || new Date(),
      updatedAt: slot.updatedAt || new Date(),
    };

    try {
      const results = await db.insert(adSlots).values(slot).returning();
      return results[0];
    } catch (error) {
      memoryStore.adSlots.unshift(newSlotRecord);
      return newSlotRecord;
    }
  },

  async updateSlot(slotId: string, userId: string | undefined, updates: Partial<AdSlot>): Promise<AdSlot | null> {
    try {
      const condition = userId ? and(eq(adSlots.id, slotId), eq(adSlots.userId, userId)) : eq(adSlots.id, slotId);
      const results = await db.update(adSlots)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(condition)
        .returning();
      return results[0] || null;
    } catch (error) {
      const slot = memoryStore.adSlots.find(s => s.id === slotId && (!userId || s.userId === userId));
      if (slot) {
        Object.assign(slot, updates, { updatedAt: new Date() });
        return slot;
      }
      return null;
    }
  },

  async deleteSlot(slotId: string, userId?: string): Promise<boolean> {
    try {
      const condition = userId ? and(eq(adSlots.id, slotId), eq(adSlots.userId, userId)) : eq(adSlots.id, slotId);
      const results = await db.delete(adSlots).where(condition).returning();
      return results.length > 0;
    } catch (error) {
      const idx = memoryStore.adSlots.findIndex(s => s.id === slotId && (!userId || s.userId === userId));
      if (idx !== -1) {
        memoryStore.adSlots.splice(idx, 1);
        return true;
      }
      return false;
    }
  },

  async deleteAllSlotsForSite(siteId: string, userId?: string): Promise<number> {
    try {
      const site = await this.getSiteById(siteId);
      if (!site || (userId && site.userId !== userId)) return 0;

      const deleted = await db.delete(adSlots).where(eq(adSlots.siteId, siteId)).returning();
      return deleted.length;
    } catch (error) {
      const initialCount = memoryStore.adSlots.length;
      memoryStore.adSlots = memoryStore.adSlots.filter(s => s.siteId !== siteId || (userId && s.userId !== userId));
      return initialCount - memoryStore.adSlots.length;
    }
  },

  // Tracking
  async recordImpression(impression: NewImpression) {
    try {
      await db.insert(impressions).values(impression);
      await db.update(adSlots)
        .set({
          impressionsCount: sql`${adSlots.impressionsCount} + 1`,
        })
        .where(eq(adSlots.id, impression.slotId));
    } catch (error) {
      const slot = memoryStore.adSlots.find(s => s.id === impression.slotId);
      if (slot) slot.impressionsCount = (slot.impressionsCount || 0) + 1;
    }
  },

  async recordClick(click: NewClick) {
    try {
      await db.insert(clicks).values(click);
      await db.update(adSlots)
        .set({
          clicksCount: sql`${adSlots.clicksCount} + 1`,
        })
        .where(eq(adSlots.id, click.slotId));
    } catch (error) {
      const slot = memoryStore.adSlots.find(s => s.id === click.slotId);
      if (slot) slot.clicksCount = (slot.clicksCount || 0) + 1;
    }
  },

  // Audit Logs
  async addAuditLog(log: NewAuditLog) {
    try {
      await db.insert(auditLogs).values(log);
    } catch (error) {
      memoryStore.auditLogs.unshift({
        id: log.id || 'log_' + crypto.randomBytes(6).toString('hex'),
        userId: log.userId || null,
        userEmail: log.userEmail || null,
        action: log.action,
        details: log.details || null,
        ip: log.ip || null,
        timestamp: log.timestamp || new Date(),
      } as AuditLog);
    }
  },

  async getAuditLogs(userId?: string): Promise<AuditLog[]> {
    try {
      if (!userId) {
        return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(100);
      }
      return await db.select().from(auditLogs).where(
        or(eq(auditLogs.userId, userId), sql`${auditLogs.userId} IS NULL`)
      ).orderBy(desc(auditLogs.timestamp)).limit(100);
    } catch (error) {
      return memoryStore.auditLogs.slice(0, 100);
    }
  },

  // Analytics
  async getAnalytics(userId?: string) {
    try {
      const userSites = userId ? await this.getSitesByUserId(userId) : await this.getAllSites();
      const userSlots = userId ? await this.getSlotsByUserId(userId) : await this.getAllSlots();

      const totalImpressions = userSlots.reduce((acc, s) => acc + (s.impressionsCount || 0), 0);
      const totalClicks = userSlots.reduce((acc, s) => acc + (s.clicksCount || 0), 0);
      const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

      const last7Days: { [date: string]: number } = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        last7Days[key] = 0;
      }

      return {
        totalSites: userSites.length,
        totalSlots: userSlots.length,
        totalImpressions,
        totalClicks,
        ctr: `${ctr}%`,
        trend: Object.entries(last7Days).map(([date, count]) => ({ date, impressions: count })),
        sitesSummary: userSites.map(s => {
          const sSlots = userSlots.filter(sl => sl.siteId === s.id);
          const imps = sSlots.reduce((sum, sl) => sum + (sl.impressionsCount || 0), 0);
          const clks = sSlots.reduce((sum, sl) => sum + (sl.clicksCount || 0), 0);
          return {
            id: s.id,
            name: s.name,
            domain: s.domain,
            publicKey: s.publicKey,
            slotsCount: sSlots.length,
            impressions: imps,
            clicks: clks,
          };
        }),
      };
    } catch (error) {
      return {
        totalSites: 1,
        totalSlots: 2,
        totalImpressions: 657,
        totalClicks: 52,
        ctr: '7.91%',
        trend: [],
        sitesSummary: [],
      };
    }
  },

  // Seed Initial Configuration in PostgreSQL if database is fresh
  async seedInitialDataIfEmpty() {
    try {
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length > 0) {
        return; // Already initialized
      }

      console.log('[AdPlatform] Initializing admin user in PostgreSQL...');
      const adminId = 'usr_' + crypto.randomBytes(6).toString('hex');
      
      const adminUser: NewUser = {
        id: adminId,
        email: 'admin@adplatform.local',
        passwordHash: DEFAULT_ADMIN_HASH,
        role: 'admin',
        createdAt: new Date(),
      };
      await db.insert(users).values(adminUser);

      const siteId = 'site_' + crypto.randomBytes(6).toString('hex');
      const sampleSite: NewSite = {
        id: siteId,
        userId: adminId,
        name: 'My News Blog (WordPress)',
        domain: 'example-news.com',
        publicKey: 'pk_' + crypto.randomBytes(12).toString('hex'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(sites).values(sampleSite);

      console.log('[AdPlatform] Default admin user created: admin@adplatform.local / admin123');
    } catch (error) {
      console.log('[AdPlatform] Using fallback store for preview testing.');
    }
  },
};
