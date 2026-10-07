import { pgTable, varchar, text, boolean, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 32 }).default('user').notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Sites Table
export const sites = pgTable('sites', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }).notNull(),
  publicKey: varchar('public_key', { length: 64 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Ad Slots Table
export const adSlots = pgTable('ad_slots', {
  id: varchar('id', { length: 64 }).primaryKey(),
  siteId: varchar('site_id', { length: 64 }).references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar('user_id', { length: 64 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 32 }).notNull(), // 'adsense' | 'html' | 'custom_js'
  legacyId: varchar('legacy_id', { length: 64 }),
  dimensions: varchar('dimensions', { length: 64 }).default('responsive').notNull(),
  config: jsonb('config').default({}).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  impressionsCount: integer('impressions_count').default(0).notNull(),
  clicksCount: integer('clicks_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Impressions Table
export const impressions = pgTable('impressions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  slotId: varchar('slot_id', { length: 64 }).references(() => adSlots.id, { onDelete: 'cascade' }).notNull(),
  siteId: varchar('site_id', { length: 64 }).references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  referer: text('referer'),
  userAgent: text('user_agent'),
  ipHash: varchar('ip_hash', { length: 64 }),
});

// Clicks Table
export const clicks = pgTable('clicks', {
  id: varchar('id', { length: 64 }).primaryKey(),
  slotId: varchar('slot_id', { length: 64 }).references(() => adSlots.id, { onDelete: 'cascade' }).notNull(),
  siteId: varchar('site_id', { length: 64 }).references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  referer: text('referer'),
  targetUrl: text('target_url'),
});

// Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }),
  userEmail: varchar('user_email', { length: 255 }),
  action: varchar('action', { length: 64 }).notNull(),
  details: text('details'),
  ip: varchar('ip', { length: 64 }),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sites: many(sites),
  adSlots: many(adSlots),
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
  user: one(users, {
    fields: [sites.userId],
    references: [users.id],
  }),
  adSlots: many(adSlots),
  impressions: many(impressions),
}));

export const adSlotsRelations = relations(adSlots, ({ one, many }) => ({
  site: one(sites, {
    fields: [adSlots.siteId],
    references: [sites.id],
  }),
  user: one(users, {
    fields: [adSlots.userId],
    references: [users.id],
  }),
  impressions: many(impressions),
  clicks: many(clicks),
}));
