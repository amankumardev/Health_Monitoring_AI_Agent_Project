import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';

const TABLES_WITH_USER = [
  'vitals', 'activity_records', 'sleep_records', 'hydration_records',
  'nutrition_records', 'medications', 'medication_logs', 'goals',
  'alerts', 'ai_conversations', 'ai_messages',
];

const PROFILE_TABLE = 'profiles';
const KNOWLEDGE_TABLE = 'knowledge_documents';

const COLUMNS: Record<string, string> = {
  profiles: 'id, full_name, email, height_cm, weight_kg, date_of_birth, activity_level, goals, preferences, notification_settings, voice_enabled, auto_play_responses, preferred_language, preferred_voice, created_at, updated_at',
  vitals: 'id, user_id, type, value, secondary_value, unit, recorded_at, notes, created_at',
  activity_records: 'id, user_id, steps, distance_km, calories_burned, exercise_duration_min, workout_type, recorded_at, created_at',
  sleep_records: 'id, user_id, sleep_start, sleep_end, duration_hours, quality, wake_ups, notes, created_at',
  hydration_records: 'id, user_id, water_ml, daily_goal_ml, recorded_at, created_at',
  nutrition_records: 'id, user_id, meal_type, calories, protein_g, carbs_g, fat_g, description, recorded_at, created_at',
  medications: 'id, user_id, name, dosage, schedule, start_date, end_date, instructions, active, created_at',
  medication_logs: 'id, user_id, medication_id, status, logged_at, notes',
  goals: 'id, user_id, category, title, target_value, current_value, unit, deadline, completed, created_at',
  alerts: 'id, user_id, severity, title, message, metric_type, metric_value, acknowledged, created_at',
  ai_conversations: 'id, user_id, title, mode, created_at, updated_at',
  ai_messages: 'id, conversation_id, user_id, role, content, input_type, transcript, audio_metadata, tool_calls, citations, created_at',
  knowledge_documents: 'id, title, category, content, source, source_url, keywords, created_at',
};

const JSON_COLUMNS = new Set([
  'goals', 'preferences', 'notification_settings', 'audio_metadata', 'tool_calls', 'citations',
]);

const COLUMN_SETS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(COLUMNS).map(([table, columns]) => [
    table,
    new Set(columns.split(',').map(column => column.trim())),
  ]),
);

const TIME_COL: Record<string, string> = {
  vitals: 'recorded_at',
  activity_records: 'recorded_at',
  sleep_records: 'sleep_start',
  hydration_records: 'recorded_at',
  nutrition_records: 'recorded_at',
  medication_logs: 'logged_at',
  goals: 'created_at',
  alerts: 'created_at',
  ai_conversations: 'updated_at',
  ai_messages: 'created_at',
  medications: 'created_at',
  profiles: 'updated_at',
};

function ownerClause(table: string, userId: string, params: unknown[]) {
  if (table === PROFILE_TABLE) {
    params.push(userId);
    return `id = $${params.length}`;
  }
  if (!TABLES_WITH_USER.includes(table)) return 'TRUE';
  params.push(userId);
  return `user_id = $${params.length}`;
}

function assertColumn(table: string, column: string): void {
  if (!COLUMN_SETS[table]?.has(column)) throw new Error(`Unknown column: ${column}`);
}

function jsonValue(column: string, value: unknown): unknown {
  if (!JSON_COLUMNS.has(column) || value === null || value === undefined) return value;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function buildOrder(table: string, order?: string, ascending = true) {
  const dir = ascending ? 'ASC' : 'DESC';
  if (order) return `ORDER BY ${order} ${dir}`;
  if (TIME_COL[table]) return `ORDER BY ${TIME_COL[table]} ${dir}`;
  return '';
}

function addRequestFilters(table: string, rawQuery: Request['query'], filters: string[], params: unknown[]): void {
  for (const [k, v] of Object.entries(rawQuery)) {
    if (['select', 'order', 'ascending', 'limit'].includes(k)) continue;
    const raw = Array.isArray(v) ? String(v[0]) : String(v);
    const column = k.replace(/_(gte|lte|eq)$/, '');
    assertColumn(table, column);
    const val = raw.startsWith('eq:') ? raw.slice(3) : raw;
    params.push(val);
    const placeholder = `$${params.length}`;
    if (k.endsWith('_gte')) filters.push(`${column} >= ${placeholder}`);
    else if (k.endsWith('_lte')) filters.push(`${column} <= ${placeholder}`);
    else filters.push(`${column} = ${placeholder}`);
  }
}

export const apiRouter = Router();

apiRouter.get('/:table', async (req: Request, res: Response) => {
  const { table } = req.params;
  if (!COLUMNS[table]) return res.status(404).json({ error: 'Unknown table' });
  const userId = req.user!.id;
  const select = (req.query.select as string) || '*';
  const selected = select === '*' ? [...COLUMN_SETS[table]] : select.split(',').map(c => c.trim());
  selected.forEach(column => assertColumn(table, column));
  const cols = selected.join(', ');
  const params: unknown[] = [];
  const filters: string[] = [ownerClause(table, userId, params)];

  addRequestFilters(table, req.query, filters, params);
  console.log('[API filters]', filters);

  const requestedOrder = req.query.order as string | undefined;
  if (requestedOrder) assertColumn(table, requestedOrder);
  let sql = `SELECT ${cols} FROM ${table} WHERE ${filters.join(' AND ')}`;
  sql += ' ' + buildOrder(table, requestedOrder, req.query.ascending !== 'false');
  if (req.query.limit) {
    const limit = Number.parseInt(String(req.query.limit), 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) return res.status(400).json({ error: 'Invalid limit' });
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
  }

  console.log('[API SQL]', sql);
  const { rows } = await query(sql, params);
  res.json({ data: rows });
});

apiRouter.post('/:table', async (req: Request, res: Response) => {
  const { table } = req.params;
  if (!COLUMNS[table]) return res.status(404).json({ error: 'Unknown table' });
  if (table === KNOWLEDGE_TABLE) return res.status(403).json({ error: 'Knowledge documents are read-only' });
  const userId = req.user!.id;
  const inputRows = Array.isArray(req.body) ? req.body : [req.body];
  if (inputRows.length === 0) return res.status(400).json({ error: 'Request body is required' });

  const inserted: unknown[] = [];
  for (const input of inputRows) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return res.status(400).json({ error: 'Each record must be an object' });
    }
    const body = { ...input };
    if (table === PROFILE_TABLE) body.id = body.id || userId;
    else if (TABLES_WITH_USER.includes(table)) body.user_id = userId;

    const cols = Object.keys(body);
    if (cols.length === 0) return res.status(400).json({ error: 'Request body is required' });
    cols.forEach(column => assertColumn(table, column));
    const vals = cols.map(c => jsonValue(c, body[c]));
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
    const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`;
    const { rows } = await query(sql, vals);
    if (rows[0]) inserted.push(rows[0]);
  }

  res.json(Array.isArray(req.body) ? inserted : (inserted[0] || null));
});

apiRouter.patch('/:table', async (req: Request, res: Response) => {
  const { table } = req.params;
  if (!COLUMNS[table]) return res.status(404).json({ error: 'Unknown table' });
  if (table === KNOWLEDGE_TABLE) return res.status(403).json({ error: 'Knowledge documents are read-only' });
  const userId = req.user!.id;
  const body = { ...(req.body || {}) };
  delete body.id; delete body.user_id; delete body.created_at;

  const cols = Object.keys(body);
  if (cols.length === 0) return res.json({ data: [] });
  cols.forEach(column => assertColumn(table, column));
  const set = cols.map((c, i) => `${c} = $${i + 1}`).join(',');
  const params = cols.map(c => jsonValue(c, body[c]));
  const filters = [ownerClause(table, userId, params)];
  addRequestFilters(table, req.query, filters, params);
  const sql = `UPDATE ${table} SET ${set} WHERE ${filters.join(' AND ')} RETURNING *`;
  const { rows } = await query(sql, params);
  res.json({ data: rows });
});

apiRouter.delete('/:table', async (req: Request, res: Response) => {
  const { table } = req.params;
  if (!COLUMNS[table]) return res.status(404).json({ error: 'Unknown table' });
  if (table === KNOWLEDGE_TABLE || table === PROFILE_TABLE) return res.status(403).json({ error: 'This resource cannot be deleted' });
  const userId = req.user!.id;
  const params: unknown[] = [];
  const filters = [ownerClause(table, userId, params)];
  addRequestFilters(table, req.query, filters, params);
  const sql = `DELETE FROM ${table} WHERE ${filters.join(' AND ')}`;
  await query(sql, params);
  res.json({ data: [] });
});

export const rpcRouter = Router();
rpcRouter.post('/seed_demo_health_data', async (req, res) => {
  const userId = req.body?.target_user_id || req.user!.id;
  if (userId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { seedDemo } = await import('../db/seed.js');
    await seedDemo(userId);
    res.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Seed failed' });
  }
});
