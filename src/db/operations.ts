import { eq, and, or, sql, desc, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import { users, sites, adSlots, impressions, clicks, auditLogs } from './schema.ts';
import crypto from 'crypto';

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

export const dbOps = {
  // Users
  async findUserByEmail(email: string): Promise<User | undefined> {
    try {
      const results = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
      return results[0];
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw new Error('Database query failed', { cause: error });
    }
  },

  async findUserById(id: string): Promise<User | undefined> {
    try {
      const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return results[0];
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw new Error('Database query failed', { cause: error });
    }
  },

  async createUser(user: NewUser): Promise<User> {
    try {
      const results = await db.insert(users).values(user).returning();
      return results[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user in database', { cause: error });
    }
  },

  // Sites
  async getSitesByUserId(userId: string): Promise<Site[]> {
    try {
      return await db.select().from(sites).where(eq(sites.userId, userId)).orderBy(desc(sites.createdAt));
    } catch (error) {
      console.error('Error getting sites:', error);
      throw new Error('Failed to query sites', { cause: error });
    }
  },

  async getSiteById(siteId: string): Promise<Site | undefined> {
    try {
      const results = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
      return results[0];
    } catch (error) {
      console.error('Error getting site by id:', error);
      throw new Error('Failed to query site', { cause: error });
    }
  },

  async getSiteByPublicKey(publicKey: string): Promise<Site | undefined> {
    try {
      const results = await db.select().from(sites).where(eq(sites.publicKey, publicKey)).limit(1);
      return results[0];
    } catch (error) {
      console.error('Error getting site by public key:', error);
      throw new Error('Failed to query site', { cause: error });
    }
  },

  async createSite(site: NewSite): Promise<Site> {
    try {
      const results = await db.insert(sites).values(site).returning();
      return results[0];
    } catch (error) {
      console.error('Error creating site:', error);
      throw new Error('Failed to create site in database', { cause: error });
    }
  },

  async deleteSite(siteId: string, userId: string): Promise<boolean> {
    try {
      const result = await db.delete(sites).where(and(eq(sites.id, siteId), eq(sites.userId, userId))).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting site:', error);
      throw new Error('Failed to delete site from database', { cause: error });
    }
  },

  // Ad Slots
  async getSlotsBySiteId(siteId: string): Promise<AdSlot[]> {
    try {
      return await db.select().from(adSlots).where(eq(adSlots.siteId, siteId)).orderBy(desc(adSlots.createdAt));
    } catch (error) {
      console.error('Error getting slots by site ID:', error);
      throw new Error('Failed to query ad slots', { cause: error });
    }
  },

  async getSlotsByUserId(userId: string): Promise<AdSlot[]> {
    try {
      return await db.select().from(adSlots).where(eq(adSlots.userId, userId)).orderBy(desc(adSlots.createdAt));
    } catch (error) {
      console.error('Error getting slots by user ID:', error);
      throw new Error('Failed to query ad slots', { cause: error });
    }
  },

  async getSlotById(slotId: string): Promise<AdSlot | undefined> {
    try {
      const results = await db.select().from(adSlots).where(eq(adSlots.id, slotId)).limit(1);
      return results[0];
    } catch (error) {
      console.error('Error getting slot by ID:', error);
      throw new Error('Failed to query ad slot', { cause: error });
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
      console.error('Error finding slot by identifier:', error);
      return undefined;
    }
  },

  async createSlot(slot: NewAdSlot): Promise<AdSlot> {
    try {
      const results = await db.insert(adSlots).values(slot).returning();
      return results[0];
    } catch (error) {
      console.error('Error creating slot:', error);
      throw new Error('Failed to create ad slot in database', { cause: error });
    }
  },

  async updateSlot(slotId: string, userId: string, updates: Partial<AdSlot>): Promise<AdSlot | null> {
    try {
      const results = await db.update(adSlots)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(adSlots.id, slotId), eq(adSlots.userId, userId)))
        .returning();
      return results[0] || null;
    } catch (error) {
      console.error('Error updating slot:', error);
      throw new Error('Failed to update ad slot in database', { cause: error });
    }
  },

  async deleteSlot(slotId: string, userId: string): Promise<boolean> {
    try {
      const results = await db.delete(adSlots).where(and(eq(adSlots.id, slotId), eq(adSlots.userId, userId))).returning();
      return results.length > 0;
    } catch (error) {
      console.error('Error deleting slot:', error);
      throw new Error('Failed to delete ad slot from database', { cause: error });
    }
  },

  async deleteAllSlotsForSite(siteId: string, userId: string): Promise<number> {
    try {
      const site = await this.getSiteById(siteId);
      if (!site || site.userId !== userId) return 0;

      const deleted = await db.delete(adSlots).where(eq(adSlots.siteId, siteId)).returning();
      return deleted.length;
    } catch (error) {
      console.error('Error bulk deleting slots:', error);
      throw new Error('Failed to delete ad slots from database', { cause: error });
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
      console.error('Error recording impression:', error);
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
      console.error('Error recording click:', error);
    }
  },

  // Audit Logs
  async addAuditLog(log: NewAuditLog) {
    try {
      await db.insert(auditLogs).values(log);
    } catch (error) {
      console.error('Error adding audit log:', error);
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
      console.error('Error getting audit logs:', error);
      return [];
    }
  },

  // Analytics
  async getAnalytics(userId: string) {
    try {
      const userSites = await this.getSitesByUserId(userId);
      const userSlots = await this.getSlotsByUserId(userId);

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

      if (userSites.length > 0) {
        const siteIds = userSites.map(s => s.id);
        const userImpressions = await db.select().from(impressions)
          .where(inArray(impressions.siteId, siteIds))
          .orderBy(desc(impressions.timestamp))
          .limit(1000);

        userImpressions.forEach(imp => {
          if (imp.timestamp) {
            const dateKey = new Date(imp.timestamp).toISOString().split('T')[0];
            if (last7Days[dateKey] !== undefined) {
              last7Days[dateKey]++;
            }
          }
        });
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
      console.error('Error computing analytics:', error);
      throw new Error('Failed to compute analytics', { cause: error });
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
      
      // Hash password for default admin123
      const { hashPassword } = await import('../../server/auth.ts');
      const passwordHash = await hashPassword('admin123');

      const adminUser: NewUser = {
        id: adminId,
        email: 'admin@adplatform.local',
        passwordHash,
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
      console.error('Error during database check:', error);
    }
  },
};
