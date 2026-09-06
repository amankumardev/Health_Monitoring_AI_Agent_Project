import { useEffect, useState } from 'react';
import { Activity as ActivityIcon, Plus, Flame, Footprints, Timer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, EmptyState, StatCard } from '@/components/ui';
import BatchAddForm, { BatchField } from '@/components/BatchAddForm';
import { fetchActivityRecords, formatDate } from '@/lib/healthData';
import { calculateAverage, calculateStatistics, detectTrend } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { ActivityRecord } from '@/types';

const activityFields: BatchField[] = [
  { key: 'recorded_at', label: 'Date', type: 'date', required: true },
  {
    key: 'workout_type',
    label: 'Workout',
    type: 'select',
    required: true,
    options: [
      { value: 'walking', label: 'Walking' },
      { value: 'running', label: 'Running' },
      { value: 'cycling', label: 'Cycling' },
      { value: 'swimming', label: 'Swimming' },
      { value: 'strength', label: 'Strength' },
      { value: 'yoga', label: 'Yoga' },
      { value: 'other', label: 'Other' },
    ],
  },
  { key: 'steps', label: 'Steps', type: 'number' },
  { key: 'distance_km', label: 'Distance (km)', type: 'number', step: '0.1' },
  { key: 'calories_burned', label: 'Calories', type: 'number' },
  { key: 'exercise_duration_min', label: 'Duration (min)', type: 'number' },
];

export default function Activity() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [days, setDays] = useState(7);
  const [showAdd, setShowAdd] = useState(false);

  const loadRecords = async () => {
    if (!user) return;
    const data = await fetchActivityRecords(user.id, days);
    setRecords(data);
  };

  useEffect(() => {
    void loadRecords();
  }, [user, days]);

  const defaultRow = () => ({
    recorded_at: new Date().toISOString().slice(0, 10),
    workout_type: 'walking',
    steps: '',
    distance_km: '',
    calories_burned: '',
    exercise_duration_min: '',
  });

  const handleBatchSubmit = async (rows: any[]) => {
    if (!user) return;
    const payload = rows.map(r => ({
      user_id: user.id,
      steps: parseInt(r.steps) || 0,
      distance_km: parseFloat(r.distance_km) || 0,
      calories_burned: parseFloat(r.calories_burned) || 0,
      exercise_duration_min: parseInt(r.exercise_duration_min) || 0,
      workout_type: r.workout_type,
      recorded_at: r.recorded_at ? new Date(r.recorded_at).toISOString() : new Date().toISOString(),
    }));
    const { error } = await supabase.from('activity_records').insert(payload);
    if (error) throw new Error(error.message);
    setShowAdd(false);
    await loadRecords();
  };

  const stepVals = records.map(r => r.steps);
  const stepStats = calculateStatistics(stepVals);
  const chartData = records.map(r => ({ date: formatDate(r.recorded_at), steps: r.steps, calories: r.calories_burned }));

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle="Track your daily movement and exercise"
        action={
          <div className="flex items-center gap-2">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300">
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700">
              <Plus size={16} /> Log Activity
            </button>
          </div>
        }
      />

      <div className="space-y-6 p-8">
        {showAdd && (
          <BatchAddForm
            title="Log Activities"
            helperText="Add one or more activities. You can log several workouts at once."
            fields={activityFields}
            defaultRow={defaultRow}
            onSubmit={handleBatchSubmit}
            onClose={() => setShowAdd(false)}
            submitLabel="Save All"
            initialRows={3}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Footprints size={20} />} label="Avg Steps" value={stepStats.count > 0 ? stepStats.average.toFixed(0) : '—'} unit="/day" color="green" trend={stepStats.count > 1 ? detectTrend(stepVals).direction : undefined} />
          <StatCard icon={<Flame size={20} />} label="Avg Calories" value={stepStats.count > 0 ? calculateAverage(records.map(r => r.calories_burned)).toFixed(0) : '—'} unit="/day" color="orange" />
          <StatCard icon={<Timer size={20} />} label="Avg Exercise" value={stepStats.count > 0 ? calculateAverage(records.map(r => r.exercise_duration_min)).toFixed(0) : '—'} unit="min" color="teal" />
          <StatCard icon={<ActivityIcon size={20} />} label="Total Distance" value={records.reduce((s, r) => s + r.distance_km, 0).toFixed(1)} unit="km" color="blue" />
        </div>

        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Daily Steps ({days}d)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="steps" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={<ActivityIcon size={24} />} title="No activity data" message="Log your daily activity to track steps, calories, and exercise." />
          )}
        </Card>
      </div>
    </div>
  );
}
