import { useEffect, useState } from 'react';
import { Moon, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, EmptyState, StatCard } from '@/components/ui';
import BatchAddForm, { BatchField } from '@/components/BatchAddForm';
import { fetchSleepRecords, formatDate } from '@/lib/healthData';
import { calculateAverage, detectTrend, calculateStatistics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { SleepRecord } from '@/types';

const sleepFields: BatchField[] = [
  { key: 'sleep_start', label: 'Bedtime', type: 'datetime-local', required: true },
  { key: 'sleep_end', label: 'Wake Time', type: 'datetime-local', required: true },
  {
    key: 'quality',
    label: 'Quality',
    type: 'select',
    required: true,
    options: [
      { value: 'excellent', label: 'Excellent' },
      { value: 'good', label: 'Good' },
      { value: 'fair', label: 'Fair' },
      { value: 'poor', label: 'Poor' },
    ],
  },
  { key: 'wake_ups', label: 'Wake-ups', type: 'number', placeholder: '0' },
];

export default function Sleep() {
  const { user } = useAuth();
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [showAdd, setShowAdd] = useState(false);

  const loadRecords = async () => {
    if (!user) return;
    const data = await fetchSleepRecords(user.id, days);
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadRecords();
  }, [user, days]);

  const defaultRow = () => {
    const now = new Date();
    const bedtime = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    return {
      sleep_start: bedtime.toISOString().slice(0, 16),
      sleep_end: now.toISOString().slice(0, 16),
      quality: 'good',
      wake_ups: '0',
    };
  };

  const handleBatchSubmit = async (rows: any[]) => {
    if (!user) return;
    const payload = rows.map(r => {
      const start = new Date(r.sleep_start);
      const end = new Date(r.sleep_end);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return {
        user_id: user.id,
        sleep_start: start.toISOString(),
        sleep_end: end.toISOString(),
        duration_hours: parseFloat(durationHours.toFixed(2)),
        quality: r.quality || 'good',
        wake_ups: parseInt(r.wake_ups) || 0,
      };
    });
    const { error } = await supabase.from('sleep_records').insert(payload);
    if (error) throw new Error(error.message);
    setShowAdd(false);
    await loadRecords();
  };

  const validateRow = (row: any) => {
    const start = new Date(row.sleep_start);
    const end = new Date(row.sleep_end);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Bedtime and wake time are required.';
    if (end.getTime() <= start.getTime()) return 'Wake time must be after bedtime.';
    return null;
  };

  const durations = records.map(r => r.duration_hours);
  const stats = calculateStatistics(durations);
  const chartData = records.map(r => ({ date: formatDate(r.sleep_start), hours: r.duration_hours, quality: r.quality }));

  const qualityColors: Record<string, string> = { excellent: '#22c55e', good: '#3b82f6', fair: '#eab308', poor: '#ef4444' };

  return (
    <div>
      <PageHeader
        title="Sleep"
        subtitle="Monitor your sleep patterns"
        action={
          <div className="flex items-center gap-2">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300">
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700">
              <Plus size={16} /> Log Sleep
            </button>
          </div>
        }
      />

      <div className="space-y-6 p-8">
        {showAdd && (
          <BatchAddForm
            title="Log Sleep Sessions"
            helperText="Add one or more sleep sessions at once."
            fields={sleepFields}
            defaultRow={defaultRow}
            onSubmit={handleBatchSubmit}
            onClose={() => setShowAdd(false)}
            validate={validateRow}
            submitLabel="Save All"
            initialRows={2}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Moon size={20} />} label="Avg Duration" value={stats.count > 0 ? stats.average.toFixed(1) : '—'} unit="hrs" color="blue" trend={stats.count > 1 ? detectTrend(durations).direction : undefined} />
          <StatCard icon={<Moon size={20} />} label="Best Night" value={stats.count > 0 ? stats.max.toFixed(1) : '—'} unit="hrs" color="green" />
          <StatCard icon={<Moon size={20} />} label="Shortest" value={stats.count > 0 ? stats.min.toFixed(1) : '—'} unit="hrs" color="orange" />
          <StatCard icon={<Moon size={20} />} label="Avg Wake-ups" value={stats.count > 0 ? (records.reduce((s, r) => s + r.wake_ups, 0) / records.length).toFixed(1) : '—'} color="purple" />
        </div>

        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Sleep Duration ({days}d)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" unit="h" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={<Moon size={24} />} title="No sleep data" message="Log your sleep to start tracking patterns and trends." />
          )}
        </Card>

        {records.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Sleep History</h3>
            <div className="space-y-2">
              {[...records].reverse().map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatDate(r.sleep_start)}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(r.sleep_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} → {new Date(r.sleep_end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{r.duration_hours.toFixed(1)}h</span>
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: (qualityColors[r.quality] || '#64748b') + '20', color: qualityColors[r.quality] || '#64748b' }}>
                      {r.quality}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{r.wake_ups} wake-ups</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
