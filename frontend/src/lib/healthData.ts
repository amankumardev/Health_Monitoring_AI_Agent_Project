import { supabase } from '@/lib/supabase';
import { Vital, ActivityRecord, SleepRecord, HydrationRecord, NutritionRecord } from '@/types';

export async function fetchVitalsByType(userId: string, type: string, days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('vitals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return (data as Vital[]) || [];
}

export async function fetchActivityRecords(userId: string, days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('activity_records')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return (data as ActivityRecord[]) || [];
}

export async function fetchSleepRecords(userId: string, days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('sleep_records')
    .select('*')
    .eq('user_id', userId)
    .gte('sleep_start', since)
    .order('sleep_start', { ascending: true });
  if (error) throw error;
  // PostgreSQL numeric columns can arrive as strings through the REST API.
  // Normalize them before rendering charts or calling Number#toFixed.
  return ((data as SleepRecord[]) || []).map(record => ({
    ...record,
    duration_hours: Number(record.duration_hours) || 0,
    wake_ups: Number(record.wake_ups) || 0,
  }));
}

export async function fetchHydrationRecords(userId: string, days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('hydration_records')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return (data as HydrationRecord[]) || [];
}

export async function fetchNutritionRecords(userId: string, days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('nutrition_records')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return (data as NutritionRecord[]) || [];
}

export async function fetchAllVitals(userId: string, days: number = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('vitals')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: false });
  if (error) throw error;
  return (data as Vital[]) || [];
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
