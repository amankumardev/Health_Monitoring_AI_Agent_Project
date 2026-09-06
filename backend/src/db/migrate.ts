import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const migrationsDir = join(__dirname, '..', '..', 'migrations');

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const f of files) {
    const sql = readFileSync(join(migrationsDir, f), 'utf8');
    console.log(`Applying ${f}...`);
    await pool.query(sql);
  }

  await pool.end();
  console.log('Migrations complete.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
