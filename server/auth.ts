import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { dbOps, User } from '../src/db/operations.ts';

// Cryptographically secure secret key resolution
const DEFAULT_IN_MEMORY_SECRET = crypto.randomBytes(32).toString('hex');
const JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16
  ? process.env.JWT_SECRET
  : DEFAULT_IN_MEMORY_SECRET;

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[AdPlatform Security Warning] JWT_SECRET is not set in environment. Generated random ephemeral secret for session security.');
}

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
      algorithm: 'HS256',
    }
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12); // High work factor for brute force protection
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash || typeof password !== 'string' || typeof hash !== 'string') {
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  // Check Authorization Header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && typeof req.cookies.adplatform_token === 'string') {
    token = req.cookies.adplatform_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as {
      id: string;
      email: string;
      role: string;
    };

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid token structure.' });
    }

    const user = await dbOps.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found. Invalid session.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been banned by an administrator.' });
    }

    req.user = user;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Authentication session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}
