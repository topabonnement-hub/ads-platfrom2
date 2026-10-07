import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    let poolConfig: PoolConfig = {
      max: 10,
      connectionTimeoutMillis: 15000,
    };

    if (databaseUrl) {
      // Connect using connection string (Coolify, Supabase, Neon, Railway, Docker, etc.)
      const isSslNeeded = databaseUrl.includes('sslmode=require') || databaseUrl.includes('neon.tech') || databaseUrl.includes('supabase');
      poolConfig = {
        ...poolConfig,
        connectionString: databaseUrl,
        ...(isSslNeeded ? { ssl: { rejectUnauthorized: false } } : {}),
      };
    } else {
      // Connect using discrete parameters (Cloud SQL, local docker, etc.)
      const host = process.env.SQL_HOST || process.env.PGHOST || '127.0.0.1';
      const user = process.env.SQL_USER || process.env.PGUSER || 'postgres';
      const password = process.env.SQL_PASSWORD || process.env.PGPASSWORD || 'postgres';
      const database = process.env.SQL_DB_NAME || process.env.PGDATABASE || 'adplatform_db';
      const port = process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432;

      poolConfig = {
        ...poolConfig,
        host,
        user,
        password,
        database,
        port,
      };
    }

    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (err) => {
      console.error('[AdPlatform DB Pool] Unexpected error on idle client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });
export { schema };
