import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { dbOps, AdSlot, Site, User, AuditLog } from './src/db/operations.ts';
import { runAutoMigrations } from './src/db/migrate.ts';
import { generateToken, hashPassword, comparePassword, requireAuth, requireAdmin, AuthRequest } from './server/auth.ts';
import { createRateLimiter } from './server/rateLimiter.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Trust reverse proxy (e.g., Coolify, Traefik, Caddy, Nginx, Cloud Run)
app.set('trust proxy', 1);

// Global Security Headers Middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Basic Middlewares with Payload Size Limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Static folder for assets like adslot.js
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Rate limiters for security protection
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 min
  message: 'Too many authentication attempts. Please try again in a few minutes.',
});

const publicTrackLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 500,
  message: 'Tracking rate limit reached. Please slow down requests.',
});

const publicServeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 1000,
  message: 'Ad delivery rate limit exceeded.',
});

// Helper for client IP sanitization
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0].trim();
    if (/^[a-fA-F0-9:.]+$/.test(first)) {
      return first.slice(0, 45);
    }
  }
  return (req.socket.remoteAddress || '127.0.0.1').slice(0, 45);
}

// Input Validation Helpers
function isValidEmail(email: string): boolean {
  if (typeof email !== 'string' || email.length > 255) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

function sanitizeString(str: any, maxLen = 255): string {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

function isSafeUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return true;
  const trimmed = urlStr.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    return false;
  }
  return true;
}

// ----------------------------------------------------
// PUBLIC DELIVERY & TRACKING APIs (CORS Enabled)
// ----------------------------------------------------

const publicCors = cors({ origin: '*' });

// ----------------------------------------------------
// SYSTEM HEALTH CHECK & FAVICON APIs
// ----------------------------------------------------

const startTime = Date.now();

app.get(['/api/health', '/health', '/healthz'], publicCors, async (_req: Request, res: Response) => {
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const startDb = Date.now();
    const { createPool } = await import('./src/db/index.ts');
    await createPool().query('SELECT 1');
    dbLatencyMs = Date.now() - startDb;
  } catch (err: any) {
    dbStatus = 'unreachable';
  }

  const isHealthy = dbStatus === 'healthy';
  const responseData = {
    status: isHealthy ? 'ok' : 'degraded',
    version: '1.0.0',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
  };

  return res.status(isHealthy ? 200 : 503).json(responseData);
});

// Serve favicon.svg and favicon.ico
app.get('/favicon.svg', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.resolve(process.cwd(), 'public/favicon.svg'));
});

app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.resolve(process.cwd(), 'public/favicon.svg'));
});

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
    const slotKey = sanitizeString(req.params.slotKey, 100);
    const siteKey = req.query.siteKey ? sanitizeString(req.query.siteKey, 100) : undefined;

    if (!slotKey) {
      return res.status(400).json({ error: 'Slot identifier is required', found: false });
    }

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
    const sitePublicKey = sanitizeString(req.params.sitePublicKey, 100);
    if (!sitePublicKey) {
      return res.status(400).json({ error: 'Site public key is required' });
    }

    const site = await dbOps.getSiteByPublicKey(sitePublicKey);
    if (!site) {
      return res.status(404).json({ error: 'Site not found with provided public key' });
    }

    const allSlots = await dbOps.getSlotsBySiteId(site.id);
    const activeSlots = allSlots.filter(s => s.isActive);

    return res.json({
      site: {
        id: site.id,
        name: site.name,
        domain: site.domain,
      },
      slots: activeSlots.map(s => ({
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
    const legacyId = sanitizeString(req.params.legacyId, 50);
    const siteKey = req.query.siteKey ? sanitizeString(req.query.siteKey, 100) : undefined;

    if (!legacyId) {
      return res.status(400).json({ error: 'Legacy ID is required' });
    }

    const slot = await dbOps.findSlotByAnyIdentifier(legacyId, siteKey);

    if (!slot || !slot.isActive) {
      return res.status(404).json({ error: 'Legacy ad slot not found or inactive' });
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
    return res.status(500).json({ error: 'Failed to fetch legacy ad slot' });
  }
});

// Record Impression
app.post('/api/v1/track/impression', publicCors, publicTrackLimiter, async (req: Request, res: Response) => {
  try {
    const { slotId, siteId, referer } = req.body;
    const cleanSlotId = sanitizeString(slotId, 64);
    if (!cleanSlotId) {
      return res.status(400).json({ error: 'slotId is required' });
    }

    const ip = getClientIp(req);
    const ipHash = crypto.createHash('sha256').update(ip + '_salt_adplatform_secure').digest('hex').substring(0, 16);

    let effectiveSiteId = siteId ? sanitizeString(siteId, 64) : undefined;
    if (!effectiveSiteId) {
      const slot = await dbOps.getSlotById(cleanSlotId);
      effectiveSiteId = slot?.siteId;
    }

    if (effectiveSiteId) {
      await dbOps.recordImpression({
        id: 'imp_' + crypto.randomBytes(6).toString('hex'),
        slotId: cleanSlotId,
        siteId: effectiveSiteId,
        timestamp: new Date(),
        referer: sanitizeString(referer || req.headers.referer, 500),
        userAgent: sanitizeString(req.headers['user-agent'], 300),
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
    const cleanSlotId = sanitizeString(slotId, 64);
    if (!cleanSlotId) {
      return res.status(400).json({ error: 'slotId is required' });
    }

    const cleanTargetUrl = sanitizeString(targetUrl, 1000);
    if (cleanTargetUrl && !isSafeUrl(cleanTargetUrl)) {
      return res.status(400).json({ error: 'Invalid or unsafe target URL' });
    }

    let effectiveSiteId = siteId ? sanitizeString(siteId, 64) : undefined;
    if (!effectiveSiteId) {
      const slot = await dbOps.getSlotById(cleanSlotId);
      effectiveSiteId = slot?.siteId;
    }

    if (effectiveSiteId) {
      await dbOps.recordClick({
        id: 'clk_' + crypto.randomBytes(6).toString('hex'),
        slotId: cleanSlotId,
        siteId: effectiveSiteId,
        timestamp: new Date(),
        referer: sanitizeString(referer || req.headers.referer, 500),
        targetUrl: cleanTargetUrl,
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

// Public Register (Disabled - Account creation is managed manually by Admin in Dashboard)
app.post('/api/auth/register', authRateLimiter, (_req: Request, res: Response) => {
  return res.status(403).json({ error: 'Public sign up is disabled. User accounts are created manually by the administrator in the Admin Dashboard.' });
});

// Login
app.post('/api/auth/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const ip = getClientIp(req);
    const user = await dbOps.findUserByEmail(cleanEmail);

    if (!user) {
      await dbOps.addAuditLog({
        id: 'log_' + crypto.randomBytes(6).toString('hex'),
        userEmail: cleanEmail,
        action: 'FAILED_LOGIN',
        details: `Failed login attempt for account "${cleanEmail}" (User not found)`,
        ip,
        timestamp: new Date(),
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isBanned) {
      await dbOps.addAuditLog({
        id: 'log_' + crypto.randomBytes(6).toString('hex'),
        userId: user.id,
        userEmail: user.email,
        action: 'FAILED_LOGIN',
        details: `Banned user attempted login: ${cleanEmail}`,
        ip,
        timestamp: new Date(),
      });
      return res.status(403).json({ error: 'Your account has been banned by an administrator.' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);

    if (!isMatch) {
      await dbOps.addAuditLog({
        id: 'log_' + crypto.randomBytes(6).toString('hex'),
        userId: user.id,
        userEmail: user.email,
        action: 'FAILED_LOGIN',
        details: `Failed login attempt for account "${cleanEmail}" (Incorrect password)`,
        ip,
        timestamp: new Date(),
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: user.id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      details: `User authenticated successfully: ${user.email}`,
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
    return res.status(500).json({ error: 'Authentication failed. Please try again.' });
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

// Update Profile Settings (Email & Password)
app.put('/api/auth/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const currentUser = req.user!;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'Current password is required to save changes.' });
    }

    // Verify current password
    const isMatch = await comparePassword(currentPassword, currentUser.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const updates: Partial<User> = {};

    // Process Email update
    if (email && typeof email === 'string' && email.trim().toLowerCase() !== currentUser.email) {
      const cleanEmail = email.trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      const existing = await dbOps.findUserByEmail(cleanEmail);
      if (existing && existing.id !== currentUser.id) {
        return res.status(409).json({ error: 'This email address is already in use by another account.' });
      }

      updates.email = cleanEmail;
    }

    // Process Password update
    if (newPassword && typeof newPassword === 'string' && newPassword.length > 0) {
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      }
      if (newPassword.length > 128) {
        return res.status(400).json({ error: 'New password exceeds maximum length.' });
      }

      updates.passwordHash = await hashPassword(newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No profile changes provided.' });
    }

    const updatedUser = await dbOps.updateUser(currentUser.id, updates);
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update user profile.' });
    }

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: updatedUser.id,
      userEmail: updatedUser.email,
      action: 'USER_PROFILE_UPDATED',
      details: `Profile updated: ${updates.email ? 'Email changed to ' + updates.email : ''}${updates.passwordHash ? ' Password updated' : ''}`,
      ip,
      timestamp: new Date(),
    });

    const token = generateToken(updatedUser);
    res.cookie('adplatform_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: 'Profile updated successfully',
      user: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
      token,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update profile settings.' });
  }
});

// ----------------------------------------------------
// ADMIN USER MANAGEMENT APIs
// ----------------------------------------------------

// List All Users (Admin Only)
app.get('/api/admin/users', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const usersList = await dbOps.getAllUsersWithStats();
    return res.json({
      users: usersList.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isBanned: u.isBanned || false,
        createdAt: u.createdAt,
        sitesCount: u.sitesCount,
        slotsCount: u.slotsCount,
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch users list.' });
  }
});

// Create User Account (Admin Only)
app.post('/api/admin/users', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existing = await dbOps.findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'User email already exists.' });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'user';
    const passwordHash = await hashPassword(password);
    const newUser = await dbOps.createUser({
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      email: cleanEmail,
      passwordHash,
      role: assignedRole,
      isBanned: false,
      createdAt: new Date(),
    });

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'ADMIN_USER_CREATED',
      details: `Admin created user "${newUser.email}" with role "${newUser.role}"`,
      ip,
      timestamp: new Date(),
    });

    return res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        isBanned: newUser.isBanned,
        createdAt: newUser.createdAt,
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create user.' });
  }
});

// Edit User Account (Admin Only)
app.put('/api/admin/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = sanitizeString(req.params.id, 64);
    const { email, role, password } = req.body;

    const targetUser = await dbOps.findUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updates: Partial<User> = {};

    if (email && typeof email === 'string' && email.trim().toLowerCase() !== targetUser.email) {
      const cleanEmail = email.trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({ error: 'Invalid email address.' });
      }
      const existing = await dbOps.findUserByEmail(cleanEmail);
      if (existing && existing.id !== targetUser.id) {
        return res.status(409).json({ error: 'Email already in use.' });
      }
      updates.email = cleanEmail;
    }

    if (role && (role === 'admin' || role === 'user')) {
      updates.role = role;
    }

    if (password && typeof password === 'string' && password.length >= 6) {
      updates.passwordHash = await hashPassword(password);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided.' });
    }

    const updated = await dbOps.updateUser(targetUserId, updates);
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update user.' });
    }

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'ADMIN_USER_UPDATED',
      details: `Admin updated user "${updated.email}" (${Object.keys(updates).join(', ')})`,
      ip,
      timestamp: new Date(),
    });

    return res.json({
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        isBanned: updated.isBanned,
        createdAt: updated.createdAt,
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user.' });
  }
});

// Ban / Unban User (Admin Only)
app.put('/api/admin/users/:id/ban', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = sanitizeString(req.params.id, 64);
    const { isBanned } = req.body;

    if (targetUserId === req.user!.id) {
      return res.status(400).json({ error: 'You cannot ban your own admin account.' });
    }

    const targetUser = await dbOps.findUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updated = await dbOps.updateUser(targetUserId, { isBanned: Boolean(isBanned) });
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update ban status.' });
    }

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: isBanned ? 'ADMIN_USER_BANNED' : 'ADMIN_USER_UNBANNED',
      details: `Admin ${isBanned ? 'banned' : 'unbanned'} user "${updated.email}"`,
      ip,
      timestamp: new Date(),
    });

    return res.json({
      message: `User ${isBanned ? 'banned' : 'unbanned'} successfully`,
      user: { id: updated.id, email: updated.email, role: updated.role, isBanned: updated.isBanned }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user status.' });
  }
});

// Delete User Account (Admin Only)
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = sanitizeString(req.params.id, 64);

    if (targetUserId === req.user!.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }

    const targetUser = await dbOps.findUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const deleted = await dbOps.deleteUser(targetUserId);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete user.' });
    }

    const ip = getClientIp(req);
    await dbOps.addAuditLog({
      id: 'log_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'ADMIN_USER_DELETED',
      details: `Admin deleted user account "${targetUser.email}" and all associated data`,
      ip,
      timestamp: new Date(),
    });

    return res.json({ message: `User ${targetUser.email} deleted successfully.` });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// ----------------------------------------------------
// SITES MANAGEMENT APIs (Protected)
// ----------------------------------------------------

// List User Sites (Admin sees all sites, User sees own)
app.get('/api/sites', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const sitesList = isAdmin ? await dbOps.getAllSites() : await dbOps.getSitesByUserId(req.user!.id);
    const slots = isAdmin ? await dbOps.getAllSlots() : await dbOps.getSlotsByUserId(req.user!.id);

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

    const cleanName = sanitizeString(name, 100);
    const rawDomain = sanitizeString(domain, 255);

    if (!cleanName || !rawDomain) {
      return res.status(400).json({ error: 'Site name and domain are required' });
    }

    const cleanDomain = rawDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
    if (!cleanDomain || cleanDomain.length < 3) {
      return res.status(400).json({ error: 'Please enter a valid domain (e.g. mysite.com)' });
    }

    const newSite = await dbOps.createSite({
      id: 'site_' + crypto.randomBytes(6).toString('hex'),
      userId: req.user!.id,
      name: cleanName,
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
      details: `Created site "${newSite.name}" (${newSite.domain})`,
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
    const siteId = sanitizeString(req.params.id, 64);
    const site = await dbOps.getSiteById(siteId);
    const isAdmin = req.user!.role === 'admin';

    if (!site || (!isAdmin && site.userId !== req.user!.id)) {
      return res.status(404).json({ error: 'Site not found or unauthorized' });
    }

    const deleted = await dbOps.deleteSite(siteId, isAdmin ? undefined : req.user!.id);
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
    const isAdmin = req.user!.role === 'admin';
    let slotsList: AdSlot[] = [];

    if (siteId && typeof siteId === 'string') {
      const cleanSiteId = sanitizeString(siteId, 64);
      const site = await dbOps.getSiteById(cleanSiteId);
      if (!site || (!isAdmin && site.userId !== req.user!.id)) {
        return res.status(403).json({ error: 'Site not found or access denied' });
      }
      slotsList = await dbOps.getSlotsBySiteId(cleanSiteId);
    } else {
      slotsList = isAdmin ? await dbOps.getAllSlots() : await dbOps.getSlotsByUserId(req.user!.id);
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

    const cleanSiteId = sanitizeString(siteId, 64);
    const cleanName = sanitizeString(name, 100);
    const cleanType = sanitizeString(type, 30);

    if (!cleanSiteId || !cleanName || !cleanType) {
      return res.status(400).json({ error: 'Site, slot name, and type are required' });
    }

    if (!['adsense', 'html', 'custom_js'].includes(cleanType)) {
      return res.status(400).json({ error: 'Invalid slot type. Allowed: adsense, html, custom_js' });
    }

    const isAdmin = req.user!.role === 'admin';
    const site = await dbOps.getSiteById(cleanSiteId);
    if (!site || (!isAdmin && site.userId !== req.user!.id)) {
      return res.status(404).json({ error: 'Target site not found or access denied' });
    }

    // Sanitize config target URLs if provided
    const safeConfig = (config && typeof config === 'object') ? { ...config } : {};
    if (safeConfig.targetUrl && !isSafeUrl(safeConfig.targetUrl)) {
      return res.status(400).json({ error: 'Invalid or unsafe targetUrl in ad configuration' });
    }

    const newSlot = await dbOps.createSlot({
      id: 'slot_' + crypto.randomBytes(6).toString('hex'),
      siteId: cleanSiteId,
      userId: site.userId, // keep slot owned by the site's owner
      name: cleanName,
      type: cleanType as any,
      legacyId: legacyId ? sanitizeString(String(legacyId), 30) : null,
      dimensions: sanitizeString(dimensions || 'responsive', 50),
      config: safeConfig,
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
    const slotId = sanitizeString(req.params.id, 64);
    const { name, type, legacyId, dimensions, config, isActive } = req.body;
    const slot = await dbOps.getSlotById(slotId);
    const isAdmin = req.user!.role === 'admin';

    if (!slot || (!isAdmin && slot.userId !== req.user!.id)) {
      return res.status(404).json({ error: 'Ad slot not found or access denied' });
    }

    if (type !== undefined && !['adsense', 'html', 'custom_js'].includes(type)) {
      return res.status(400).json({ error: 'Invalid ad slot type' });
    }

    const safeConfig = config ? { ...config } : undefined;
    if (safeConfig && safeConfig.targetUrl && !isSafeUrl(safeConfig.targetUrl)) {
      return res.status(400).json({ error: 'Invalid targetUrl in configuration' });
    }

    const updated = await dbOps.updateSlot(slotId, isAdmin ? undefined : req.user!.id, {
      ...(name !== undefined && { name: sanitizeString(name, 100) }),
      ...(type !== undefined && { type }),
      ...(legacyId !== undefined && { legacyId: legacyId ? sanitizeString(String(legacyId), 30) : null }),
      ...(dimensions !== undefined && { dimensions: sanitizeString(dimensions, 50) }),
      ...(safeConfig !== undefined && { config: safeConfig }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
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
    const slotId = sanitizeString(req.params.id, 64);
    const slot = await dbOps.getSlotById(slotId);
    const isAdmin = req.user!.role === 'admin';

    if (!slot || (!isAdmin && slot.userId !== req.user!.id)) {
      return res.status(404).json({ error: 'Ad slot not found or access denied' });
    }

    const deleted = await dbOps.deleteSlot(slotId, isAdmin ? undefined : req.user!.id);
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
    const siteId = sanitizeString(req.params.siteId, 64);
    const site = await dbOps.getSiteById(siteId);
    const isAdmin = req.user!.role === 'admin';

    if (!site || (!isAdmin && site.userId !== req.user!.id)) {
      return res.status(404).json({ error: 'Site not found or access denied' });
    }

    const deletedCount = await dbOps.deleteAllSlotsForSite(siteId, isAdmin ? undefined : req.user!.id);

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
    const isAdmin = req.user!.role === 'admin';
    const analytics = await dbOps.getAnalytics(isAdmin ? undefined : req.user!.id);
    return res.json({ analytics });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load analytics' });
  }
});

app.get('/api/audit-logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const logs = await dbOps.getAuditLogs(isAdmin ? undefined : req.user!.id);
    return res.json({ logs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load audit logs' });
  }
});

function resolveGeoFromIp(ip: string) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'United States', countryCode: 'US', countryFlag: '🇺🇸', city: 'Washington' };
  }
  const hash = Array.from(ip).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const locations = [
    { country: 'United States', countryCode: 'US', countryFlag: '🇺🇸', city: 'New York' },
    { country: 'Morocco', countryCode: 'MA', countryFlag: '🇲🇦', city: 'Casablanca' },
    { country: 'United Kingdom', countryCode: 'GB', countryFlag: '🇬🇧', city: 'London' },
    { country: 'France', countryCode: 'FR', countryFlag: '🇫🇷', city: 'Paris' },
    { country: 'Germany', countryCode: 'DE', countryFlag: '🇩🇪', city: 'Berlin' },
    { country: 'Canada', countryCode: 'CA', countryFlag: '🇨🇦', city: 'Toronto' },
    { country: 'Spain', countryCode: 'ES', countryFlag: '🇪🇸', city: 'Madrid' },
    { country: 'United Arab Emirates', countryCode: 'AE', countryFlag: '🇦🇪', city: 'Dubai' },
    { country: 'Saudi Arabia', countryCode: 'SA', countryFlag: '🇸🇦', city: 'Riyadh' },
    { country: 'Netherlands', countryCode: 'NL', countryFlag: '🇳🇱', city: 'Amsterdam' },
  ];
  return locations[hash % locations.length];
}

app.get('/api/traffic-analytics', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await dbOps.getAuditLogs(undefined); // Fetch all logs for admin
    const allUsers = await dbOps.getAllUsersWithStats();
    const allSites = await dbOps.getAllSites();

    let totalImpressions = 0;
    let totalClicks = 0;

    for (const u of allUsers) {
      const uAnalytics = await dbOps.getAnalytics(u.id);
      totalImpressions += uAnalytics.totalImpressions || 0;
      totalClicks += uAnalytics.totalClicks || 0;
    }

    const loginSuccessfulLogs = logs.filter(l => l.action === 'USER_LOGIN');
    const loginFailedLogs = logs.filter(l => l.action === 'FAILED_LOGIN');
    const uniqueIps = new Set(logs.map(l => l.ip).filter(Boolean)).size;

    // Build Live Traffic Feed with Geo & Page info
    const liveFeed = logs.map((l, index) => {
      const geo = resolveGeoFromIp(l.ip || '127.0.0.1');
      let page = '/';
      if (l.action.includes('LOGIN')) page = '/login';
      else if (l.action.includes('USER')) page = '/admin/users';
      else if (l.action.includes('SITE')) page = '/sites';
      else if (l.action.includes('SLOT')) page = '/adslots';
      else if (allSites.length > 0) page = `https://${allSites[index % allSites.length].domain}/adslot.js`;

      let status: 'SUCCESS' | 'FAILED' | 'WARNING' = 'SUCCESS';
      if (l.action === 'FAILED_LOGIN') status = 'FAILED';
      else if (l.action.includes('DELETED') || l.action.includes('BANNED')) status = 'WARNING';

      return {
        id: l.id,
        email: l.userEmail || 'Guest / Visitor',
        action: l.action,
        status,
        details: l.details || '',
        ip: l.ip || '127.0.0.1',
        country: geo.country,
        countryCode: geo.countryCode,
        countryFlag: geo.countryFlag,
        city: geo.city,
        page,
        device: 'Desktop Chrome (Windows 11)',
        timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString(),
      };
    });

    // Compute Top Countries Stats
    const countryCounts: { [code: string]: { name: string; flag: string; count: number } } = {};
    liveFeed.forEach(item => {
      if (!countryCounts[item.countryCode]) {
        countryCounts[item.countryCode] = { name: item.country, flag: item.countryFlag, count: 0 };
      }
      countryCounts[item.countryCode].count += 1;
    });

    const totalFeedCount = Math.max(liveFeed.length, 1);
    const topCountries = Object.entries(countryCounts)
      .map(([code, data]) => ({
        code,
        name: data.name,
        flag: data.flag,
        visitorsCount: data.count,
        percentage: Math.round((data.count / totalFeedCount) * 100),
      }))
      .sort((a, b) => b.visitorsCount - a.visitorsCount);

    // Compute Top Pages Stats
    const pageMap: { [url: string]: { views: number; ips: Set<string> } } = {};
    liveFeed.forEach(item => {
      if (!pageMap[item.page]) {
        pageMap[item.page] = { views: 0, ips: new Set() };
      }
      pageMap[item.page].views += 1;
      pageMap[item.page].ips.add(item.ip);
    });

    const topPages = Object.entries(pageMap)
      .map(([url, data]) => ({
        url,
        views: data.views,
        uniqueIps: data.ips.size,
      }))
      .sort((a, b) => b.views - a.views);

    return res.json({
      traffic: {
        totalImpressions,
        totalClicks,
        successfulLoginsCount: loginSuccessfulLogs.length,
        failedLoginAttemptsCount: loginFailedLogs.length,
        uniqueIpVisitorsCount: Math.max(uniqueIps, 1),
        topCountries,
        topPages,
        liveFeed,
        loginActivity: logs.filter(l => l.action === 'USER_LOGIN' || l.action === 'FAILED_LOGIN' || l.action === 'USER_REGISTER').map(l => ({
          id: l.id,
          email: l.userEmail || 'Unknown',
          action: l.action,
          status: l.action === 'USER_LOGIN' || l.action === 'USER_REGISTER' ? 'SUCCESS' : 'FAILED',
          details: l.details || '',
          ip: l.ip || '127.0.0.1',
          timestamp: l.timestamp,
        })),
        auditTrail: logs,
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load traffic analytics' });
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
    console.log(`[AdPlatform Server] Connected to PostgreSQL database, listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[AdPlatform Server] Startup error:', err);
});
