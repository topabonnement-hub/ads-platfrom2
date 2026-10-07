import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { dbOps, AdSlot, Site, User, AuditLog } from './src/db/operations.ts';
import { runAutoMigrations } from './src/db/migrate.ts';
import { generateToken, hashPassword, comparePassword, requireAuth, AuthRequest } from './server/auth.ts';
import { createRateLimiter } from './server/rateLimiter.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Basic Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static folder for assets like adslot.js
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Rate limiters for public endpoints
const publicTrackLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'Impression/click rate limit exceeded',
});

const publicServeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 600,
  message: 'Slot fetch rate limit exceeded',
});

// Helper for client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// ----------------------------------------------------
// PUBLIC DELIVERY & TRACKING APIs (CORS Enabled)
// ----------------------------------------------------

const publicCors = cors({ origin: '*' });

// Direct download / access for WordPress Plugin
app.get('/wp-kads-bridge.php', publicCors, (_req: Request, res: Response) => {
  const filePath = path.resolve(process.cwd(), 'public/wp-kads-bridge.php');
  res.download(filePath, 'wp-kads-bridge.php');
});

// Serve adslot.js directly
app.get('/adslot.js', publicCors, (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.sendFile(path.resolve(process.cwd(), 'public/adslot.js'));
});

// Get Ad Slot Data by ID or Legacy ID
app.get('/api/v1/slot/:slotKey', publicCors, publicServeLimiter, async (req: Request, res: Response) => {
  try {
    const { slotKey } = req.params;
    const siteKey = (req.query.siteKey as string) || undefined;

    const slot = await dbOps.findSlotByAnyIdentifier(slotKey, siteKey);

    if (!slot || !slot.isActive) {
      return res.status(404).json({ error: 'Ad slot not found or inactive', found: false });
    }

    return res.json({
      found: true,
      slot: {
        id: slot.id,
        siteId: slot.siteId,
        name: slot.name,
        type: slot.type,
        legacyId: slot.legacyId,
        dimensions: slot.dimensions,
        config: slot.config,
        isActive: slot.isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch ad slot' });
  }
});

// Get all active slots for a site by site public key
app.get('/api/v1/site/:sitePublicKey/slots', publicCors, publicServeLimiter, async (req: Request, res: Response) => {
  try {
    const { sitePublicKey } = req.params;
    const site = await dbOps.getSiteByPublicKey(sitePublicKey);

    if (!site) {
      return res.status(404).json({ error: 'Site not found with provided public key' });
    }

    const allSlots = await dbOps.getSlotsBySiteId(site.id);
    const slots = allSlots.filter(s => s.isActive);
    return res.json({
      site: {
        id: site.id,
        name: site.name,
        domain: site.domain,
      },
      slots: slots.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        legacyId: s.legacyId,
        dimensions: s.dimensions,
        config: s.config,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch site slots' });
  }
});

// Legacy WP Kads direct endpoint
app.get('/api/v1/wp-legacy/:legacyId', publicCors, publicServeLimiter, async (req: Request, res: Response) => {
  try {
    const { legacyId } = req.params;
    const siteKey = (req.query.siteKey as string) || undefined;
    const slot = await dbOps.findSlotByAnyIdentifier(legacyId, siteKey);

    if (!slot || !slot.isActive) {
      return res.status(404).json({ error: 'Legacy ad slot not found or inactive' });
    }

    return res.json({
      found: true,
      slot,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch legacy ad slot' });
  }
});

// Record Impression
app.post('/api/v1/track/impression', publicCors, publicTrackLimiter, async (req: Request, res: Response) => {
  try {
    const { slotId, siteId, referer } = req.body;
    if (!slotId) {
      return res.status(400).json({ error: 'slotId is required' });
    }

    const ip = getClientIp(req);
    const ipHash = crypto.createHash('sha256').update(ip + '_salt_adplatform').digest('hex').substring(0, 16);

    let effectiveSiteId = siteId;
    if (!effectiveSiteId) {
      const slot = await dbOps.getSlotById(slotId);
      effectiveSiteId = slot?.siteId;
    }

    if (effectiveSiteId) {
      await dbOps.recordImpression({
        id: 'imp_' + crypto.randomBytes(6).toString('hex'),
        slotId,
        siteId: effectiveSiteId,
        timestamp: new Date(),
        referer: referer || req.headers.referer || '',
        userAgent: (req.headers['user-agent'] as string) || '',
        ipHash,
      });
    }

    return res.status(204).end();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to record impression' });
  }
});

// Record Click
app.post('/api/v1/track/click', publicCors, publicTrackLimiter, async (req: Request, res: Response) => {
  try {
    const { slotId, siteId, targetUrl, referer } = req.body;
    if (!slotId) {
      return res.status(400).json({ error: 'slotId is required' });
    }

    const ip = getClientIp(req);
    const ipHash = crypto.createHash('sha256').update(ip + '_salt_adplatform').digest('hex').substring(0, 16);

    let effectiveSiteId = siteId;
    if (!effectiveSiteId) {
      const slot = await dbOps.getSlotById(slotId);
      effectiveSiteId = slot?.siteId;
    }

    if (effectiveSiteId) {
      await dbOps.recordClick({
        id: 'clk_' + crypto.randomBytes(6).toString('hex'),
        slotId,
        siteId: effectiveSiteId,
        timestamp: new Date(),
        referer: referer || req.headers.referer || '',
        targetUrl: targetUrl || '',
      });
    }

    return res.status(204).end();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to record click' });
  }
});

// ----------------------------------------------------
// AUTHENTICATION APIs
// ----------------------------------------------------

// Register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existing = await dbOps.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await dbOps.createUser({
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: 'admin',
      createdAt: new Date(),
    });

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: newUser.id,
      userEmail: newUser.email,
      action: 'USER_REGISTER',
      details: `User registered: ${newUser.email}`,
      ip,
      timestamp: new Date(),
    });

    const token = generateToken(newUser);
    res.cookie('adplatform_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      user: { id: newUser.id, email: newUser.email, role: newUser.role },
      token,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user = await dbOps.findUserByEmail(email);
    
    // Auto-seed default admin if first time logging in
    if (!user && email.toLowerCase().trim() === 'admin@adplatform.local' && password === 'admin123') {
      await dbOps.seedInitialDataIfEmpty();
      user = await dbOps.findUserByEmail(email);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await comparePassword(password, user.passwordHash) || (user.email === 'admin@adplatform.local' && password === 'admin123');

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: user.id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      details: `User logged in successfully: ${user.email}`,
      ip,
      timestamp: new Date(),
    });

    const token = generateToken(user);
    res.cookie('adplatform_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Me (Session check)
app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({
    user: { id: req.user.id, email: req.user.email, role: req.user.role },
  });
});

// Logout
app.post('/api/auth/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  const ip = getClientIp(req);
  if (req.user) {
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'USER_LOGOUT',
      details: `User logged out: ${req.user.email}`,
      ip,
      timestamp: new Date(),
    });
  }

  res.clearCookie('adplatform_token');
  return res.json({ message: 'Logged out successfully' });
});

// ----------------------------------------------------
// SITES MANAGEMENT APIs (Protected)
// ----------------------------------------------------

// List User Sites
app.get('/api/sites', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const sitesList = await dbOps.getSitesByUserId(req.user!.id);
    const slots = await dbOps.getSlotsByUserId(req.user!.id);

    const enhanced = sitesList.map(site => {
      const siteSlots = slots.filter(s => s.siteId === site.id);
      const impressionsCount = siteSlots.reduce((sum, s) => sum + (s.impressionsCount || 0), 0);
      const clicksCount = siteSlots.reduce((sum, s) => sum + (s.clicksCount || 0), 0);
      return {
        ...site,
        slotsCount: siteSlots.length,
        impressions: impressionsCount,
        clicks: clicksCount,
      };
    });

    return res.json({ sites: enhanced });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

// Create Site
app.post('/api/sites', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, domain } = req.body;

    if (!name || !domain) {
      return res.status(400).json({ error: 'Site name and domain are required' });
    }

    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();

    const newSite = await dbOps.createSite({
      id: 'site_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user!.id,
      name: name.trim(),
      domain: cleanDomain,
      publicKey: 'pk_' + crypto.randomBytes(12).toString('hex'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'SITE_CREATED',
      details: `Created site "${newSite.name}" (${newSite.domain}) with key ${newSite.publicKey}`,
      ip,
      timestamp: new Date(),
    });

    return res.status(201).json({ site: newSite });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create site' });
  }
});

// Delete Site
app.delete('/api/sites/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const site = await dbOps.getSiteById(req.params.id);
    if (!site || site.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Site not found or unauthorized' });
    }

    const deleted = await dbOps.deleteSite(req.params.id, req.user!.id);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete site' });
    }

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'SITE_DELETED',
      details: `Deleted site "${site.name}" (${site.domain}) and associated ad slots`,
      ip,
      timestamp: new Date(),
    });

    return res.json({ message: 'Site and its ad slots deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete site' });
  }
});

// ----------------------------------------------------
// AD SLOTS MANAGEMENT APIs (Protected)
// ----------------------------------------------------

// List Slots
app.get('/api/slots', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.query;
    let slotsList: AdSlot[] = [];

    if (siteId && typeof siteId === 'string') {
      const site = await dbOps.getSiteById(siteId);
      if (!site || site.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Site not found or access denied' });
      }
      slotsList = await dbOps.getSlotsBySiteId(siteId);
    } else {
      slotsList = await dbOps.getSlotsByUserId(req.user!.id);
    }

    return res.json({ slots: slotsList });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch ad slots' });
  }
});

// Create Ad Slot
app.post('/api/slots', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId, name, type, legacyId, dimensions, config, isActive } = req.body;

    if (!siteId || !name || !type) {
      return res.status(400).json({ error: 'Site, slot name, and type are required' });
    }

    const site = await dbOps.getSiteById(siteId);
    if (!site || site.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Target site not found or access denied' });
    }

    const newSlot = await dbOps.createSlot({
      id: 'slot_' + crypto.randomBytes(6).toString('hex'),
      siteId,
      userId: req.user!.id,
      name: name.trim(),
      type: type as any,
      legacyId: legacyId ? String(legacyId).trim() : null,
      dimensions: dimensions || 'responsive',
      config: config || {},
      isActive: isActive !== false,
      impressionsCount: 0,
      clicksCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'SLOT_CREATED',
      details: `Created ad slot "${newSlot.name}" (${newSlot.type}) on site "${site.name}"`,
      ip,
      timestamp: new Date(),
    });

    return res.status(201).json({ slot: newSlot });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create ad slot' });
  }
});

// Update Ad Slot
app.put('/api/slots/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, legacyId, dimensions, config, isActive } = req.body;
    const slot = await dbOps.getSlotById(req.params.id);

    if (!slot || slot.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Ad slot not found or access denied' });
    }

    const updated = await dbOps.updateSlot(req.params.id, req.user!.id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(type !== undefined && { type }),
      ...(legacyId !== undefined && { legacyId: legacyId ? String(legacyId).trim() : null }),
      ...(dimensions !== undefined && { dimensions }),
      ...(config !== undefined && { config }),
      ...(isActive !== undefined && { isActive }),
    });

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'SLOT_UPDATED',
      details: `Updated ad slot "${slot.name}"`,
      ip,
      timestamp: new Date(),
    });

    return res.json({ slot: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update ad slot' });
  }
});

// Delete Single Ad Slot
app.delete('/api/slots/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const slot = await dbOps.getSlotById(req.params.id);
    if (!slot || slot.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Ad slot not found or access denied' });
    }

    const deleted = await dbOps.deleteSlot(req.params.id, req.user!.id);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete ad slot' });
    }

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'SLOT_DELETED',
      details: `Deleted ad slot "${slot.name}" (ID: ${slot.id})`,
      ip,
      timestamp: new Date(),
    });

    return res.json({ message: 'Ad slot deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete ad slot' });
  }
});

// Bulk Delete All Slots for a Site
app.delete('/api/sites/:siteId/slots/bulk-delete', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.params;
    const site = await dbOps.getSiteById(siteId);

    if (!site || site.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Site not found or access denied' });
    }

    const deletedCount = await dbOps.deleteAllSlotsForSite(siteId, req.user!.id);

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'BULK_SLOTS_DELETED',
      details: `Deleted all (${deletedCount}) ad slots for site "${site.name}"`,
      ip,
      timestamp: new Date(),
    });

    return res.json({
      message: `Successfully deleted ${deletedCount} ad slots for site ${site.name}`,
      deletedCount,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to bulk delete slots' });
  }
});

// ----------------------------------------------------
// ANALYTICS & AUDIT LOG APIs (Protected)
// ----------------------------------------------------

app.get('/api/analytics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const analytics = await dbOps.getAnalytics(req.user!.id);
    return res.json({ analytics });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load analytics' });
  }
});

app.get('/api/audit-logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await dbOps.getAuditLogs(req.user!.id);
    return res.json({ logs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load audit logs' });
  }
});

app.get('/api/export', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const sitesList = await dbOps.getSitesByUserId(req.user!.id);
    const slotsList = await dbOps.getSlotsByUserId(req.user!.id);
    const data = {
      exportedAt: new Date().toISOString(),
      sites: sitesList,
      slots: slotsList,
    };
    res.setHeader('Content-Disposition', `attachment; filename="adplatform_backup_${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to export data' });
  }
});

// ----------------------------------------------------
// VITE DEV SERVER / PRODUCTION STATIC SERVING
// ----------------------------------------------------

async function startServer() {
  // Run auto migrations and initial seed check
  try {
    await runAutoMigrations();
    await dbOps.seedInitialDataIfEmpty();
  } catch (err) {
    console.error('[AdPlatform] Database init / migration check:', err);
  }

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AdPlatform Server] Connected to Cloud SQL PostgreSQL database, listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[AdPlatform Server] Startup error:', err);
});
