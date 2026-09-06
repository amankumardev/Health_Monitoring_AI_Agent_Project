import { supabase } from '@/lib/supabase';
import {
  calculateStatistics,
  comparePeriods,
  detectTrend,
  detectAnomalies,
  calculateAverage,
} from './analytics';
import { Profile, Vital, ActivityRecord, SleepRecord, HydrationRecord, NutritionRecord, Medication, Goal, KnowledgeDocument } from '@/types';

export interface ToolResult {
  tool: string;
  data: any;
  summary: string;
}

async function getUserProfile(userId: string): Promise<ToolResult> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  const profile = data as Profile;
  const name = profile?.full_name || 'there';
  const ageStr = profile?.date_of_birth
    ? `${Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years old`
    : 'age not set';
  const heightStr = profile?.height_cm ? `${profile.height_cm} cm` : 'height not set';
  const weightStr = profile?.weight_kg ? `${profile.weight_kg} kg` : 'weight not set';
  return {
    tool: 'getUserProfile',
    data: profile,
    summary: `Profile: ${name}, ${ageStr}, ${heightStr}, ${weightStr}, activity level: ${profile?.activity_level || 'moderate'}`,
  };
}

async function getRecentHealthData(userId: string, days: number = 7): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const [vitals, activity, sleep, hydration] = await Promise.all([
    supabase.from('vitals').select('*').eq('user_id', userId).gte('recorded_at', since).order('recorded_at', { ascending: false }),
    supabase.from('activity_records').select('*').eq('user_id', userId).gte('recorded_at', since).order('recorded_at', { ascending: false }),
    supabase.from('sleep_records').select('*').eq('user_id', userId).gte('sleep_start', since).order('sleep_start', { ascending: false }),
    supabase.from('hydration_records').select('*').eq('user_id', userId).gte('recorded_at', since).order('recorded_at', { ascending: false }),
  ]);

  return {
    tool: 'getRecentHealthData',
    data: { vitals: vitals.data, activity: activity.data, sleep: sleep.data, hydration: hydration.data },
    summary: `Last ${days} days: ${vitals.data?.length || 0} vitals, ${activity.data?.length || 0} activity records, ${sleep.data?.length || 0} sleep records, ${hydration.data?.length || 0} hydration records`,
  };
}

async function getHeartRateHistory(userId: string, days: number = 7): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('vitals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'heart_rate')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  const values = (data as Vital[] || []).map(v => v.value);
  const stats = calculateStatistics(values);
  return {
    tool: 'getHeartRateHistory',
    data: { records: data, stats },
    summary: `Heart rate (${days}d): avg ${stats.average.toFixed(0)} bpm, range ${stats.min}-${stats.max} bpm, trend: ${stats.trend.direction}`,
  };
}

async function getBloodPressureHistory(userId: string, days: number = 7): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data: sysData } = await supabase
    .from('vitals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'blood_pressure_systolic')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  const { data: diaData } = await supabase
    .from('vitals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'blood_pressure_diastolic')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  const sysVals = (sysData as Vital[] || []).map(v => v.value);
  const diaVals = (diaData as Vital[] || []).map(v => v.value);
  const sysStats = calculateStatistics(sysVals);
  const diaStats = calculateStatistics(diaVals);

  return {
    tool: 'getBloodPressureHistory',
    data: { systolic: sysStats, diastolic: diaStats, records: { systolic: sysData, diastolic: diaData } },
    summary: `Blood pressure (${days}d): avg ${sysStats.average.toFixed(0)}/${diaStats.average.toFixed(0)} mmHg, trend: ${sysStats.trend.direction}/${diaStats.trend.direction}`,
  };
}

async function getSleepHistory(userId: string, days: number = 7): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('sleep_records')
    .select('*')
    .eq('user_id', userId)
    .gte('sleep_start', since)
    .order('sleep_start', { ascending: true });

  const records = (data as SleepRecord[]) || [];
  const durations = records.map(r => r.duration_hours);
  const stats = calculateStatistics(durations);
  const avgWakeUps = calculateAverage(records.map(r => r.wake_ups));

  return {
    tool: 'getSleepHistory',
    data: { records, stats, avgWakeUps },
    summary: `Sleep (${days}d): avg ${stats.average.toFixed(1)}h, range ${stats.min.toFixed(1)}-${stats.max.toFixed(1)}h, avg ${avgWakeUps.toFixed(1)} wake-ups, trend: ${stats.trend.direction}`,
  };
}

async function getActivityHistory(userId: string, days: number = 7): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('activity_records')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  const records = (data as ActivityRecord[]) || [];
  const steps = records.map(r => r.steps);
  const calories = records.map(r => r.calories_burned);
  const stepStats = calculateStatistics(steps);
  const calStats = calculateStatistics(calories);

  return {
    tool: 'getActivityHistory',
    data: { records, stepStats, calStats },
    summary: `Activity (${days}d): avg ${stepStats.average.toFixed(0)} steps/day, avg ${calStats.average.toFixed(0)} cal/day, step trend: ${stepStats.trend.direction}`,
  };
}

async function getHydrationHistory(userId: string, days: number = 7): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('hydration_records')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  const records = (data as HydrationRecord[]) || [];
  const dailyTotals: Record<string, number> = {};
  records.forEach(r => {
    const date = r.recorded_at.split('T')[0];
    dailyTotals[date] = (dailyTotals[date] || 0) + r.water_ml;
  });
  const values = Object.values(dailyTotals);
  const stats = calculateStatistics(values);
  const goal = records[0]?.daily_goal_ml || 2500;

  return {
    tool: 'getHydrationHistory',
    data: { dailyTotals, stats, goal },
    summary: `Hydration (${days}d): avg ${stats.average.toFixed(0)} ml/day, goal ${goal} ml, trend: ${stats.trend.direction}`,
  };
}

async function getNutritionHistory(userId: string, days: number = 7): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('nutrition_records')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  const records = (data as NutritionRecord[]) || [];
  const calories = records.map(r => r.calories);
  const protein = records.map(r => r.protein_g);
  const calStats = calculateStatistics(calories);
  const proteinStats = calculateStatistics(protein);

  return {
    tool: 'getNutritionHistory',
    data: { records, calStats, proteinStats },
    summary: `Nutrition (${days}d): avg ${calStats.average.toFixed(0)} cal/day, avg ${proteinStats.average.toFixed(0)}g protein/day`,
  };
}

async function getWeightHistory(userId: string, days: number = 30): Promise<ToolResult> {
  const { data } = await supabase
    .from('vitals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'weight')
    .order('recorded_at', { ascending: true })
    .limit(30);

  const values = (data as Vital[] || []).map(v => v.value);
  const stats = calculateStatistics(values);
  const trend = detectTrend(values);

  return {
    tool: 'getWeightHistory',
    data: { records: data, stats, trend },
    summary: `Weight (${values.length} records): avg ${stats.average.toFixed(1)} kg, trend: ${trend.direction}`,
  };
}

async function getMedicationSchedule(userId: string): Promise<ToolResult> {
  const { data } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: true });

  const meds = (data as Medication[]) || [];
  const medList = meds.map(m => `${m.name} (${m.dosage}) - ${m.schedule}`).join('; ');
  return {
    tool: 'getMedicationSchedule',
    data: meds,
    summary: `Active medications (${meds.length}): ${medList || 'none'}`,
  };
}

async function getGoals(userId: string): Promise<ToolResult> {
  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const goals = (data as Goal[]) || [];
  const goalList = goals.map(g => `${g.title}: ${g.current_value}/${g.target_value} ${g.unit}${g.completed ? ' (done)' : ''}`).join('; ');
  return {
    tool: 'getGoals',
    data: goals,
    summary: `Goals (${goals.length}): ${goalList || 'none set'}`,
  };
}

async function searchHealthKnowledge(query: string): Promise<ToolResult> {
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const { data } = await supabase.from('knowledge_documents').select('*');

  const docs = (data as KnowledgeDocument[]) || [];
  const scored = docs.map(doc => {
    const contentLower = doc.content.toLowerCase();
    const titleLower = doc.title.toLowerCase();
    let score = 0;
    keywords.forEach(kw => {
      if (titleLower.includes(kw)) score += 3;
      if (doc.keywords.some(k => k.toLowerCase().includes(kw))) score += 2;
      if (contentLower.includes(kw)) score += 1;
    });
    return { doc, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  const results = scored.map(s => s.doc);

  return {
    tool: 'searchHealthKnowledge',
    data: results,
    summary: results.length > 0
      ? `Found ${results.length} relevant articles: ${results.map(r => r.title).join(', ')}`
      : 'No relevant knowledge articles found',
  };
}

async function createHealthSummary(userId: string): Promise<ToolResult> {
  const [hr, bp, sleep, activity, hydration] = await Promise.all([
    getHeartRateHistory(userId, 7),
    getBloodPressureHistory(userId, 7),
    getSleepHistory(userId, 7),
    getActivityHistory(userId, 7),
    getHydrationHistory(userId, 7),
  ]);

  return {
    tool: 'createHealthSummary',
    data: { heartRate: hr.data, bloodPressure: bp.data, sleep: sleep.data, activity: activity.data, hydration: hydration.data },
    summary: `7-day health summary: ${hr.summary}; ${bp.summary}; ${sleep.summary}; ${activity.summary}; ${hydration.summary}`,
  };
}

async function getSpO2History(userId: string, days: number = 7): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('vitals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'spo2')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  const values = (data as Vital[] || []).map(v => v.value);
  const stats = calculateStatistics(values);
  return {
    tool: 'getSpO2History',
    data: { records: data, stats },
    summary: `SpO2 (${days}d): avg ${stats.average.toFixed(1)}%, range ${stats.min}-${stats.max}%, trend: ${stats.trend.direction}`,
  };
}

async function getTemperatureHistory(userId: string, days: number = 7): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('vitals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'temperature')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  const values = (data as Vital[] || []).map(v => v.value);
  const stats = calculateStatistics(values);
  return {
    tool: 'getTemperatureHistory',
    data: { records: data, stats },
    summary: `Temperature (${days}d): avg ${stats.average.toFixed(1)}°C, range ${stats.min}-${stats.max}°C, trend: ${stats.trend.direction}`,
  };
}

async function getBloodGlucoseHistory(userId: string, days: number = 7): Promise<ToolResult> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('vitals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'blood_glucose')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  const values = (data as Vital[] || []).map(v => v.value);
  const stats = calculateStatistics(values);
  return {
    tool: 'getBloodGlucoseHistory',
    data: { records: data, stats },
    summary: `Blood glucose (${days}d): avg ${stats.average.toFixed(0)} mg/dL, range ${stats.min}-${stats.max}, trend: ${stats.trend.direction}`,
  };
}

const toolMap: Record<string, (userId: string, ...args: any[]) => Promise<ToolResult>> = {
  getUserProfile,
  getRecentHealthData,
  getHeartRateHistory,
  getBloodPressureHistory,
  getSleepHistory,
  getActivityHistory,
  getHydrationHistory,
  getNutritionHistory,
  getWeightHistory,
  getMedicationSchedule,
  getGoals,
  searchHealthKnowledge: (_userId: string, query: string) => searchHealthKnowledge(query),
  createHealthSummary,
  getSpO2History,
  getTemperatureHistory,
  getBloodGlucoseHistory,
};

export async function executeTool(toolName: string, userId: string, ...args: any[]): Promise<ToolResult | null> {
  const fn = toolMap[toolName];
  if (!fn) return null;
  return fn(userId, ...args);
}

export { getUserProfile, getRecentHealthData, getHeartRateHistory, getBloodPressureHistory, getSleepHistory, getActivityHistory, getHydrationHistory, getNutritionHistory, getWeightHistory, getMedicationSchedule, getGoals, searchHealthKnowledge, createHealthSummary, getSpO2History, getTemperatureHistory, getBloodGlucoseHistory };
