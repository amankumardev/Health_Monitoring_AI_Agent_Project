import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from './db/pool.js';
import type { Request, Response, NextFunction } from 'express';

const ACCESS_TTL = parseInt(process.env.ACCESS_TOKEN_TTL || '3600', 10);
const REFRESH_TTL = parseInt(process.env.REFRESH_TOKEN_TTL || '2592000', 10);

export interface AuthUser { id: string; email: string }

export function signAccess(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: ACCESS_TTL });
}

export function signRefresh(user: AuthUser): string {
  return jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TTL });
}

export function verifyRefresh(token: string): { sub: string } {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { sub: string };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

declare global {
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; email: string };
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
