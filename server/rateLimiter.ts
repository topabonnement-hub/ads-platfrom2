import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const MAX_RATE_LIMIT_ENTRIES = 20000;

// Clean up stale rate limits every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 2 * 60 * 1000);

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
}) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Sanitize and extract IP safely
    let clientIp = '127.0.0.1';
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      const firstIp = forwarded.split(',')[0].trim();
      if (/^[a-fA-F0-9:.]+$/.test(firstIp)) {
        clientIp = firstIp.slice(0, 45); // Max IPv6 length
      }
    } else if (req.socket && req.socket.remoteAddress) {
      clientIp = req.socket.remoteAddress.slice(0, 45);
    }

    const key = `${req.baseUrl || ''}${req.path}:${clientIp}`;
    const now = Date.now();

    // Memory protection against unbounded growth
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES && !rateLimitMap.has(key)) {
      // Purge oldest 10% of entries if at capacity
      let purged = 0;
      for (const [k, r] of rateLimitMap.entries()) {
        if (now > r.resetTime || purged < 2000) {
          rateLimitMap.delete(k);
          purged++;
        }
      }
    }

    let record = rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitMap.set(key, record);
      return next();
    }

    record.count++;

    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return res.status(statusCode).json({
        error: message,
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    next();
  };
}
