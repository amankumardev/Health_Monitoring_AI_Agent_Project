export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  date_of_birth: string | null;
  activity_level: string;
  goals: any[];
  preferences: Record<string, any>;
  notification_settings: Record<string, any>;
  voice_enabled: boolean;
  auto_play_responses: boolean;
  preferred_language: string;
  preferred_voice: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vital {
  id: string;
  user_id: string;
  type: string;
  value: number;
  secondary_value: number | null;
  unit: string;
  recorded_at: string;
  notes: string | null;
  created_at: string;
}

export interface ActivityRecord {
  id: string;
  user_id: string;
  steps: number;
  distance_km: number;
  calories_burned: number;
  exercise_duration_min: number;
  workout_type: string | null;
  recorded_at: string;
  created_at: string;
}

export interface SleepRecord {
  id: string;
  user_id: string;
  sleep_start: string;
  sleep_end: string;
  duration_hours: number;
  quality: string;
  wake_ups: number;
  notes: string | null;
  created_at: string;
}

export interface HydrationRecord {
  id: string;
  user_id: string;
  water_ml: number;
  daily_goal_ml: number;
  recorded_at: string;
  created_at: string;
}

export interface NutritionRecord {
  id: string;
  user_id: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  description: string | null;
  recorded_at: string;
  created_at: string;
}

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  schedule: string;
  start_date: string;
  end_date: string | null;
  instructions: string | null;
  active: boolean;
  created_at: string;
}

export interface MedicationLog {
  id: string;
  user_id: string;
  medication_id: string;
  status: 'taken' | 'skipped' | 'snoozed' | 'pending';
  logged_at: string;
  notes: string | null;
}

export interface Goal {
  id: string;
  user_id: string;
  category: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  deadline: string | null;
  completed: boolean;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  severity: 'NORMAL' | 'ATTENTION' | 'IMPORTANT' | 'URGENT';
  title: string;
  message: string;
  metric_type: string | null;
  metric_value: number | null;
  acknowledged: boolean;
  created_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  mode: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  input_type: 'text' | 'voice';
  transcript: string | null;
  audio_metadata: any;
  tool_calls: any[];
  citations: any[];
  created_at: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  source: string;
  source_url: string | null;
  keywords: string[];
  created_at: string;
}

export type VitalType =
  | 'heart_rate'
  | 'blood_pressure_systolic'
  | 'blood_pressure_diastolic'
  | 'spo2'
  | 'temperature'
  | 'blood_glucose';
