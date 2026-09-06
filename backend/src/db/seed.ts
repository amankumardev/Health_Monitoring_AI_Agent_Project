import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function seedDemo(userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - i * 86400000);
      const hr = 65 + Math.random() * 25;
      const sys = 115 + Math.random() * 15;
      const dia = 72 + Math.random() * 10;
      const spo2 = 96 + Math.random() * 4;
      const temp = 36.4 + Math.random() * 0.8;
      const glu = 85 + Math.random() * 30;

      const types: [string, number, string][] = [
        ['heart_rate', hr, 'bpm'],
        ['blood_pressure_systolic', sys, 'mmHg'],
        ['blood_pressure_diastolic', dia, 'mmHg'],
        ['spo2', spo2, '%'],
        ['temperature', temp, '°C'],
        ['blood_glucose', glu, 'mg/dL'],
      ];
      for (const [type, value, unit] of types) {
        await client.query(
          `INSERT INTO vitals (user_id, type, value, unit, recorded_at) VALUES ($1,$2,$3,$4,$5)`,
          [userId, type, value, unit, d.toISOString()]
        );
      }
    }

    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - i * 86400000);
      const steps = 3000 + Math.floor(Math.random() * 8000);
      await client.query(
        `INSERT INTO activity_records (user_id, steps, distance_km, calories_burned, exercise_duration_min, workout_type, recorded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [userId, steps, steps * 0.0007, 200 + Math.floor(Math.random() * 300), 20 + Math.floor(Math.random() * 40), Math.random() > 0.5 ? 'walking' : 'running', d.toISOString()]
      );
    }

    for (let i = 0; i < 7; i++) {
      const start = new Date(Date.now() - i * 86400000 - 8 * 3600000);
      const dur = 5.5 + Math.random() * 3.5;
      const end = new Date(start.getTime() + dur * 3600000);
      const quality = dur >= 8 ? 'excellent' : dur >= 7 ? 'good' : dur >= 6 ? 'fair' : 'poor';
      const wakeUps = Math.floor(Math.random() * 4);
      await client.query(
        `INSERT INTO sleep_records (user_id, sleep_start, sleep_end, duration_hours, quality, wake_ups) VALUES ($1,$2,$3,$4,$5,$6)`,
        [userId, start.toISOString(), end.toISOString(), dur, quality, wakeUps]
      );
    }

    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - i * 86400000 + 9 * 3600000);
      for (let h = 0; h < 4; h++) {
        const ml = [250, 350, 400, 300][h];
        await client.query(
          `INSERT INTO hydration_records (user_id, water_ml, daily_goal_ml, recorded_at) VALUES ($1,$2,2500,$3)`,
          [userId, ml, new Date(d.getTime() + h * 3 * 3600000).toISOString()]
        );
      }
    }

    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - i * 86400000 + 8 * 3600000);
      await client.query(
        `INSERT INTO nutrition_records (user_id, meal_type, calories, protein_g, carbs_g, fat_g, description, recorded_at) VALUES ($1,'breakfast',$2,$3,$4,$5,'Oatmeal with fruits',$6)`,
        [userId, 350 + Math.floor(Math.random() * 100), 15 + Math.floor(Math.random() * 10), 45 + Math.floor(Math.random() * 15), 12 + Math.floor(Math.random() * 8), d.toISOString()]
      );
      await client.query(
        `INSERT INTO nutrition_records (user_id, meal_type, calories, protein_g, carbs_g, fat_g, description, recorded_at) VALUES ($1,'lunch',$2,$3,$4,$5,'Grilled chicken salad',$6)`,
        [userId, 500 + Math.floor(Math.random() * 150), 25 + Math.floor(Math.random() * 15), 60 + Math.floor(Math.random() * 20), 18 + Math.floor(Math.random() * 10), new Date(d.getTime() + 4 * 3600000).toISOString()]
      );
      await client.query(
        `INSERT INTO nutrition_records (user_id, meal_type, calories, protein_g, carbs_g, fat_g, description, recorded_at) VALUES ($1,'dinner',$2,$3,$4,$5,'Salmon with vegetables',$6)`,
        [userId, 600 + Math.floor(Math.random() * 200), 30 + Math.floor(Math.random() * 15), 55 + Math.floor(Math.random() * 25), 20 + Math.floor(Math.random() * 12), new Date(d.getTime() + 9 * 3600000).toISOString()]
      );
    }

    await client.query(
      `INSERT INTO medications (user_id, name, dosage, schedule, instructions, start_date) VALUES ($1,'Vitamin D3','1000 IU','Once daily, morning','Take with food',CURRENT_DATE - 30)`,
      [userId]
    );
    await client.query(
      `INSERT INTO medications (user_id, name, dosage, schedule, instructions, start_date) VALUES ($1,'Omega-3','1000mg','Twice daily','Take with meals',CURRENT_DATE - 15)`,
      [userId]
    );

    await client.query(
      `INSERT INTO goals (user_id, category, title, target_value, current_value, unit) VALUES ($1,'steps','Daily 10K Steps',10000,7200,'steps')`,
      [userId]
    );
    await client.query(
      `INSERT INTO goals (user_id, category, title, target_value, current_value, unit) VALUES ($1,'sleep','Sleep 8 Hours',8,7.2,'hrs')`,
      [userId]
    );
    await client.query(
      `INSERT INTO goals (user_id, category, title, target_value, current_value, unit) VALUES ($1,'hydration','Drink 2.5L Water',2500,1800,'ml')`,
      [userId]
    );

    await client.query(
      `INSERT INTO alerts (user_id, severity, title, message, metric_type, metric_value) VALUES ($1,'ATTENTION','Sleep duration below target','Your average sleep duration over the past 3 days is below your 7-hour target. Consider adjusting your bedtime routine.','sleep',6.2)`,
      [userId]
    );

    await client.query('COMMIT');
    console.log(`Seeded demo data for user ${userId}`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: npm run seed -- <user_id>');
    process.exit(1);
  }
  await seedDemo(userId);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
