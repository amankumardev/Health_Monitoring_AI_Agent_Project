import { useEffect, useState } from 'react';
import { Heart, Plus, Activity, Thermometer, Droplet, Gauge, CheckCircle2, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, EmptyState, StatCard } from '@/components/ui';
import BatchAddForm, { BatchField } from '@/components/BatchAddForm';
import { fetchAllVitals, formatDateTime } from '@/lib/healthData';
import { calculateAverage, calculateStatistics, detectTrend } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { Vital } from '@/types';

const vitalTypes = [
  { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: Heart, color: '#ef4444' },
  { key: 'blood_pressure_systolic', label: 'Systolic BP', unit: 'mmHg', icon: Gauge, color: '#f97316' },
  { key: 'blood_pressure_diastolic', label: 'Diastolic BP', unit: 'mmHg', icon: Gauge, color: '#eab308' },
  { key: 'spo2', label: 'SpO2', unit: '%', icon: Activity, color: '#3b82f6' },
  { key: 'temperature', label: 'Temperature', unit: '°C', icon: Thermometer, color: '#f97316' },
  { key: 'blood_glucose', label: 'Blood Glucose', unit: 'mg/dL', icon: Droplet, color: '#8b5cf6' },
  { key: 'weight', label: 'Weight', unit: 'kg', icon: Gauge, color: '#6366f1' },
];

const vitalFields: BatchField[] = [
  {
    key: 'recorded_at',
    label: 'When',
    type: 'datetime-local',
    required: true,
  },
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    required: true,
    options: vitalTypes.map(v => ({ value: v.key, label: `${v.label} (${v.unit})` })),
  },
  { key: 'value', label: 'Value', type: 'number', required: true, step: '0.1' },
  {
    key: 'secondary_value',
    label: 'Diastolic (BP)',
    type: 'number',
    placeholder: 'Only for Systolic BP',
  },
  { key: 'unit', label: 'Unit', type: 'text', placeholder: 'auto-filled' },
  { key: 'notes', label: 'Notes', type: 'text', placeholder: 'optional' },
];

export default function Vitals() {
  const { user } = useAuth();
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const loadVitals = async () => {
    if (!user) return;
    const data = await fetchAllVitals(user.id, days);
    setVitals(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadVitals();
  }, [user, days]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const defaultRow = () => ({
    recorded_at: new Date().toISOString().slice(0, 16),
    type: 'heart_rate',
    value: '',
    secondary_value: '',
    unit: '',
    notes: '',
  });

  const allVitalRows = vitalTypes.map(vital => ({
    ...defaultRow(),
    type: vital.key,
    unit: vital.unit,
  }));

  const handleBatchSubmit = async (rows: any[]) => {
    if (!user) return;
    const payload = rows.map(r => {
      const typeMeta = vitalTypes.find(v => v.key === r.type);
      const insert: any = {
        user_id: user.id,
        type: r.type,
        value: parseFloat(r.value),
        unit: (r.unit && String(r.unit).trim()) || typeMeta?.unit || '',
        recorded_at: r.recorded_at ? new Date(r.recorded_at).toISOString() : new Date().toISOString(),
      };
      if (r.type === 'blood_pressure_systolic' && r.secondary_value) {
        insert.secondary_value = parseFloat(r.secondary_value);
      }
      if (r.notes && String(r.notes).trim()) {
        insert.notes = r.notes;
      }
      return insert;
    });
    const { error } = await supabase.from('vitals').insert(payload);
    if (error) throw new Error(error.message);
    setShowAdd(false);
    await loadVitals();
    setToast({ kind: 'success', message: `${payload.length} reading${payload.length === 1 ? '' : 's'} saved successfully.` });
  };

  const getVitalsByType = (type: string) => vitals.filter(v => v.type === type);

  return (
    <div>
      <PageHeader
        title="Vitals"
        subtitle="Track your vital signs over time"
        action={
          <div className="flex items-center gap-2">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300">
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700">
              <Plus size={16} /> Add Readings
            </button>
          </div>
        }
      />

      <div className="space-y-6 p-8">
        {toast && (
          <div role="status" className={`fixed right-5 top-5 z-[60] flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.kind === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}>
            {toast.kind === 'success' ? <CheckCircle2 size={19} /> : <XCircle size={19} />}
            <span>{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} className="ml-1 text-current/70 hover:text-current" aria-label="Dismiss notification">×</button>
          </div>
        )}
        {showAdd && (
          <BatchAddForm
            title="Add Vital Readings"
            helperText="Enter all vital readings from one check-up, then save them together. Leave values you did not measure empty."
            fields={vitalFields}
            defaultRow={defaultRow}
            onSubmit={handleBatchSubmit}
            onError={(message) => setToast({ kind: 'error', message })}
            onClose={() => setShowAdd(false)}
            submitLabel="Save All Readings"
            initialRows={vitalTypes.length}
            initialRowData={allVitalRows}
            isRowEmptyOverride={(row) => !String(row.value ?? '').trim()}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vitalTypes.map(vt => {
            const typeVitals = getVitalsByType(vt.key);
            const values = typeVitals.map(v => v.value);
            const stats = calculateStatistics(values);
            const Icon = vt.icon;
            return (
              <StatCard
                key={vt.key}
                icon={<Icon size={20} />}
                label={vt.label}
                value={stats.count > 0 ? stats.average.toFixed(vt.unit === '%' ? 1 : 0) : '—'}
                unit={vt.unit}
                trend={stats.count > 1 ? detectTrend(values).direction : undefined}
                color={vt.key === 'heart_rate' ? 'red' : vt.key.includes('blood_pressure') ? 'orange' : vt.key === 'spo2' ? 'blue' : vt.key === 'temperature' ? 'orange' : 'purple'}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {vitalTypes.map(vt => {
            const typeVitals = getVitalsByType(vt.key);
            const chartData = typeVitals.map(v => ({ date: new Date(v.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: v.value }));
            return (
              <Card key={vt.key} className="p-6">
                <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{vt.label} ({days}d)</h3>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Line type="monotone" dataKey="value" stroke={vt.color} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">No data yet</div>
                )}
              </Card>
            );
          })}
        </div>

        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Readings</h3>
          {vitals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Value</th>
                    <th className="pb-2 pr-4 font-medium">When</th>
                    <th className="pb-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {vitals.slice(0, 20).map(v => (
                    <tr key={v.id} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="py-2.5 pr-4 font-medium text-slate-700 dark:text-slate-200">{vitalTypes.find(vt => vt.key === v.type)?.label || v.type}</td>
                      <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{v.value} {v.unit}</td>
                      <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{formatDateTime(v.recorded_at)}</td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400">{v.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<Heart size={24} />} title="No vitals recorded" message="Add your first reading to start tracking your vital signs." />
          )}
        </Card>
      </div>
    </div>
  );
}
