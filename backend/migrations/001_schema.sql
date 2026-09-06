-- Health Monitoring AI Agent — Core Schema (self-hosted PostgreSQL)
-- Adapted from the Supabase migration: replaces auth.uid() defaults with
-- NOT NULL columns and removes RLS. Authorization is enforced in the API layer.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===== USERS =====
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

-- ===== PROFILES =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  height_cm numeric,
  weight_kg numeric,
  date_of_birth date,
  activity_level text DEFAULT 'moderate',
  goals jsonb DEFAULT '[]'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  notification_settings jsonb DEFAULT '{}'::jsonb,
  voice_enabled boolean DEFAULT true,
  auto_play_responses boolean DEFAULT false,
  preferred_language text DEFAULT 'en-US',
  preferred_voice text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===== VITALS =====
CREATE TABLE IF NOT EXISTS vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  value numeric NOT NULL,
  secondary_value numeric,
  unit text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vitals_user_type_time ON vitals(user_id, type, recorded_at DESC);

-- ===== ACTIVITY =====
CREATE TABLE IF NOT EXISTS activity_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  steps integer DEFAULT 0,
  distance_km numeric DEFAULT 0,
  calories_burned numeric DEFAULT 0,
  exercise_duration_min integer DEFAULT 0,
  workout_type text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user_time ON activity_records(user_id, recorded_at DESC);

-- ===== SLEEP =====
CREATE TABLE IF NOT EXISTS sleep_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sleep_start timestamptz NOT NULL,
  sleep_end timestamptz NOT NULL,
  duration_hours numeric NOT NULL,
  quality text DEFAULT 'fair',
  wake_ups integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sleep_user_time ON sleep_records(user_id, sleep_start DESC);

-- ===== HYDRATION =====
CREATE TABLE IF NOT EXISTS hydration_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  water_ml integer NOT NULL DEFAULT 0,
  daily_goal_ml integer DEFAULT 2500,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hydration_user_time ON hydration_records(user_id, recorded_at DESC);

-- ===== NUTRITION =====
CREATE TABLE IF NOT EXISTS nutrition_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type text NOT NULL DEFAULT 'snack',
  calories integer DEFAULT 0,
  protein_g numeric DEFAULT 0,
  carbs_g numeric DEFAULT 0,
  fat_g numeric DEFAULT 0,
  description text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nutrition_user_time ON nutrition_records(user_id, recorded_at DESC);

-- ===== MEDICATIONS =====
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text NOT NULL,
  schedule text NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  instructions text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ===== MEDICATION LOGS =====
CREATE TABLE IF NOT EXISTS medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  logged_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- ===== GOALS =====
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  target_value numeric NOT NULL,
  current_value numeric DEFAULT 0,
  unit text NOT NULL,
  deadline date,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ===== ALERTS =====
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'ATTENTION',
  title text NOT NULL,
  message text NOT NULL,
  metric_type text,
  metric_value numeric,
  acknowledged boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alerts_user_time ON alerts(user_id, created_at DESC);

-- ===== AI CONVERSATIONS =====
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text DEFAULT 'New Conversation',
  mode text DEFAULT 'text',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===== AI MESSAGES =====
CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  input_type text DEFAULT 'text',
  transcript text,
  audio_metadata jsonb,
  tool_calls jsonb DEFAULT '[]'::jsonb,
  citations jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id, created_at ASC);

-- ===== KNOWLEDGE DOCUMENTS =====
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  content text NOT NULL,
  source text NOT NULL,
  source_url text,
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
