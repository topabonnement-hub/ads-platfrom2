import { createPool } from './index.ts';

export async function runAutoMigrations() {
  const pool = createPool();

  try {
    // Check if tables already exist
    const checkRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
      LIMIT 1;
    `);

    if (checkRes.rows && checkRes.rows.length > 0) {
      console.log('[AdPlatform] PostgreSQL database tables already verified.');
      return;
    }
  } catch (checkErr: any) {
    // If checking information_schema fails or is restricted, proceed carefully to create statements
    console.warn('[AdPlatform] Table check query note:', checkErr.message || checkErr);
  }

  const migrationSql = `
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(32) DEFAULT 'user' NOT NULL,
      is_banned BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE NOT NULL;

    -- Sites Table
    CREATE TABLE IF NOT EXISTS sites (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      name VARCHAR(255) NOT NULL,
      domain VARCHAR(255) NOT NULL,
      public_key VARCHAR(64) UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);
    CREATE INDEX IF NOT EXISTS idx_sites_public_key ON sites(public_key);

    -- Ad Slots Table
    CREATE TABLE IF NOT EXISTS ad_slots (
      id VARCHAR(64) PRIMARY KEY,
      site_id VARCHAR(64) REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
      user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(32) NOT NULL,
      legacy_id VARCHAR(64),
      dimensions VARCHAR(64) DEFAULT 'responsive' NOT NULL,
      config JSONB DEFAULT '{}'::jsonb NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      impressions_count INTEGER DEFAULT 0 NOT NULL,
      clicks_count INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ad_slots_site_id ON ad_slots(site_id);
    CREATE INDEX IF NOT EXISTS idx_ad_slots_legacy_id ON ad_slots(legacy_id);

    -- Impressions Table
    CREATE TABLE IF NOT EXISTS impressions (
      id VARCHAR(64) PRIMARY KEY,
      slot_id VARCHAR(64) REFERENCES ad_slots(id) ON DELETE CASCADE NOT NULL,
      site_id VARCHAR(64) REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      referer TEXT,
      user_agent TEXT,
      ip_hash VARCHAR(64)
    );

    CREATE INDEX IF NOT EXISTS idx_impressions_slot_id ON impressions(slot_id);
    CREATE INDEX IF NOT EXISTS idx_impressions_timestamp ON impressions(timestamp);

    -- Clicks Table
    CREATE TABLE IF NOT EXISTS clicks (
      id VARCHAR(64) PRIMARY KEY,
      slot_id VARCHAR(64) REFERENCES ad_slots(id) ON DELETE CASCADE NOT NULL,
      site_id VARCHAR(64) REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      referer TEXT,
      target_url TEXT
    );

    -- Audit Logs Table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64),
      user_email VARCHAR(255),
      action VARCHAR(64) NOT NULL,
      details TEXT,
      ip VARCHAR(64),
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `;

  try {
    await pool.query(migrationSql);
    console.log('[AdPlatform] PostgreSQL schema verified & auto-migrated successfully.');
  } catch (error: any) {
    if (error && error.code === '42501') {
      console.warn('[AdPlatform] DDL migration skipped due to schema permissions (using pre-provisioned schema).');
    } else {
      console.warn('[AdPlatform] Migration check note:', error.message || error);
    }
  }
}
