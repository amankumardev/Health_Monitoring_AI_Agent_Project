import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { hashPassword, comparePassword, signAccess, signRefresh, verifyRefresh } from '../auth.js';

export const authRouter = Router();

authRouter.post('/signup', async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

  const hash = await hashPassword(password);
  const { rows: userRows } = await query<{ id: string; email: string }>(
    'INSERT INTO users (email, password_hash, full_name) VALUES ($1,$2,$3) RETURNING id, email',
    [email, hash, full_name || null]
  );
  const user = userRows[0];

  await query('INSERT INTO profiles (id, full_name, email) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING', [user.id, full_name || null, email]);

  const access = signAccess(user);
  const refresh = signRefresh(user);
  res.json({ user, session: { access_token: access, refresh_token: refresh, user } });
});

authRouter.post('/signin', async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { rows } = await query<{ id: string; email: string; password_hash: string }>(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const u = { id: user.id, email: user.email };
  res.json({ user: u, session: { access_token: signAccess(u), refresh_token: signRefresh(u), user: u } });
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: 'Missing refresh_token' });
  try {
    const payload = verifyRefresh(refresh_token);
    const { rows } = await query<{ id: string; email: string }>('SELECT id, email FROM users WHERE id = $1', [payload.sub]);
    if (!rows[0]) return res.status(401).json({ error: 'Invalid token' });
    res.json({ session: { access_token: signAccess(rows[0]), refresh_token: signRefresh(rows[0]), user: rows[0] } });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

authRouter.post('/signout', (_req, res) => {
  res.json({ ok: true });
});

authRouter.get('/me', async (req, res) => {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.json({ user: null });
  try {
    const jwt = (await import('jsonwebtoken')).default;
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; email: string };
    const { rows } = await query('SELECT id, email FROM users WHERE id = $1', [payload.sub]);
    res.json({ user: rows[0] || null });
  } catch {
    res.json({ user: null });
  }
});
