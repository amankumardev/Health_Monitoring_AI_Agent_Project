import { useEffect, useState } from 'react';
import { Droplets, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, EmptyState, StatCard } from '@/components/ui';
import BatchAddForm, { BatchField } from '@/components/BatchAddForm';
import { fetchHydrationRecords, formatDate } from '@/lib/healthData';
import { supabase } from '@/lib/supabase';
import { HydrationRecord } from '@/types';

const hydrationFields: BatchField[] = [
  { key: 'recorded_at', label: 'When', type: 'datetime-local', required: true },
  { key: 'water_ml', label: 'Amount (ml)', type: 'number', required: true, placeholder: '250' },
  { key: 'daily_goal_ml', label: 'Daily Goal (ml)', type: 'number', placeholder: '2500' },
];

export default function Hydration() {
  const { user } = useAuth();
  const [records, setRecords] = useState<HydrationRecord[]>([]);
  const [days, setDays] = useState(7);
  const [goal, setGoal] = useState('2500');
  const [showAdd, setShowAdd] = useState(false);

  const loadRecords = async () => {
    if (!user) return;
    const data = await fetchHydrationRecords(user.id, days);
    setRecords(data);
    if (data[0]) setGoal(String(data[0].daily_goal_ml));
  };

  useEffect(() => {
    void loadRecords();
  }, [user, days]);

  const defaultRow = () => ({
    recorded_at: new Date().toISOString().slice(0, 16),
    water_ml: '',
    daily_goal_ml: goal,
  });

  const handleBatchSubmit = async (rows: any[]) => {
    if (!user) return;
    const payload = rows.map(r => ({
      user_id: user.id,
      water_ml: parseInt(r.water_ml),
      daily_goal_ml: parseInt(r.daily_goal_ml) || parseInt(goal) || 2500,
      recorded_at: r.recorded_at ? new Date(r.recorded_at).toISOString() : new Date().toISOString(),
    }));
    const { error } = await supabase.from('hydration_records').insert(payload);
    if (error) throw new Error(error.message);
    setShowAdd(false);
    await loadRecords();
  };

  const dailyTotals: Record<string, { ml: number; goal: number }> = {};
  records.forEach(r => {
    const d = formatDate(r.recorded_at);
    if (!dailyTotals[d]) dailyTotals[d] = { ml: 0, goal: r.daily_goal_ml };
    dailyTotals[d].ml += r.water_ml;
    dailyTotals[d].goal = r.daily_goal_ml;
  });

  const chartData = Object.entries(dailyTotals).map(([date, v]) => ({ date, ml: v.ml, goal: v.goal }));
  const todayKey = formatDate(new Date().toISOString());
  const todayTotal = dailyTotals[todayKey]?.ml || 0;
  const goalNum = parseInt(goal) || 2500;
  const todayPercent = Math.min((todayTotal / goalNum) * 100, 100);

  return (
    <div>
      <PageHeader
        title="Hydration"
        subtitle="Stay on top of your daily water intake"
        action={
          <div className="flex items-center gap-2">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300">
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
            </select>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700">
              <Plus size={16} /> Log Water
            </button>
          </div>
        }
      />

      <div className="space-y-6 p-8">
        {showAdd && (
          <BatchAddForm
            title="Log Water Intake"
            helperText="Record one or more drinks. Great for backfilling the day."
            fields={hydrationFields}
            defaultRow={defaultRow}
            onSubmit={handleBatchSubmit}
            onClose={() => setShowAdd(false)}
            submitLabel="Save All"
            initialRows={3}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={<Droplets size={20} />} label="Today's Intake" value={todayTotal} unit="ml" color="teal" trend={`${todayPercent.toFixed(0)}% of goal`} />
          <StatCard icon={<Droplets size={20} />} label="Daily Goal" value={goalNum} unit="ml" color="blue" />
          <StatCard icon={<Droplets size={20} />} label="7-Day Average" value={chartData.length > 0 ? Math.round(chartData.reduce((s, d) => s + d.ml, 0) / chartData.length) : 0} unit="ml/day" color="green" />
        </div>

        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Daily Water Intake ({days}d)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" unit="ml" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="ml" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.ml >= d.goal ? '#22c55e' : '#14b8a6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={<Droplets size={24} />} title="No hydration data" message="Start tracking your water intake to stay hydrated." />
          )}
        </Card>
      </div>
    </div>
  );
}
