-- ==========================================================
-- AdPlatform - PostgreSQL Production Schema
-- Safe, Indexed, Multi-tenant Architecture
-- ==========================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'admin' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Sites Table
CREATE TABLE IF NOT EXISTS sites (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    public_key VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);
CREATE INDEX IF NOT EXISTS idx_sites_public_key ON sites(public_key);

-- Ad Slots Table
CREATE TABLE IF NOT EXISTS ad_slots (
    id VARCHAR(64) PRIMARY KEY,
    site_id VARCHAR(64) REFERENCES sites(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL, -- 'adsense', 'html', 'custom_js'
    legacy_id VARCHAR(64),     -- For WordPress WP_KADS [WP_KADS id=X] compatibility
    dimensions VARCHAR(64) DEFAULT 'responsive',
    config JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    impressions_count BIGINT DEFAULT 0 NOT NULL,
    clicks_count BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ad_slots_site_id ON ad_slots(site_id);
CREATE INDEX IF NOT EXISTS idx_ad_slots_user_id ON ad_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_slots_legacy_id ON ad_slots(legacy_id);
CREATE INDEX IF NOT EXISTS idx_ad_slots_active ON ad_slots(is_active);

-- Viewable Impressions Table
CREATE TABLE IF NOT EXISTS impressions (
    id VARCHAR(64) PRIMARY KEY,
    slot_id VARCHAR(64) REFERENCES ad_slots(id) ON DELETE CASCADE,
    site_id VARCHAR(64) REFERENCES sites(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    referer TEXT,
    user_agent TEXT,
    ip_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_impressions_slot_id ON impressions(slot_id);
CREATE INDEX IF NOT EXISTS idx_impressions_timestamp ON impressions(timestamp);

-- Ad Clicks Table
CREATE TABLE IF NOT EXISTS clicks (
    id VARCHAR(64) PRIMARY KEY,
    slot_id VARCHAR(64) REFERENCES ad_slots(id) ON DELETE CASCADE,
    site_id VARCHAR(64) REFERENCES sites(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    referer TEXT,
    target_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_slot_id ON clicks(slot_id);
CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks(timestamp);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    user_email VARCHAR(255),
    action VARCHAR(64) NOT NULL,
    details TEXT,
    ip VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
