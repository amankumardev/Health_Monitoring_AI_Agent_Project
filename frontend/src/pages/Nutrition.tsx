import { useEffect, useState } from 'react';
import { Utensils, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, EmptyState, StatCard } from '@/components/ui';
import BatchAddForm, { BatchField } from '@/components/BatchAddForm';
import { fetchNutritionRecords, formatDate } from '@/lib/healthData';
import { calculateAverage } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { NutritionRecord } from '@/types';

const nutritionFields: BatchField[] = [
  {
    key: 'meal_type',
    label: 'Meal',
    type: 'select',
    required: true,
    options: [
      { value: 'breakfast', label: 'Breakfast' },
      { value: 'lunch', label: 'Lunch' },
      { value: 'dinner', label: 'Dinner' },
      { value: 'snack', label: 'Snack' },
    ],
  },
  { key: 'recorded_at', label: 'When', type: 'datetime-local', required: true },
  { key: 'calories', label: 'Calories', type: 'number', required: true },
  { key: 'protein_g', label: 'Protein (g)', type: 'number', step: '0.1' },
  { key: 'carbs_g', label: 'Carbs (g)', type: 'number', step: '0.1' },
  { key: 'fat_g', label: 'Fat (g)', type: 'number', step: '0.1' },
  { key: 'description', label: 'Description', type: 'text', placeholder: 'What did you eat?' },
];

export default function Nutrition() {
  const { user } = useAuth();
  const [records, setRecords] = useState<NutritionRecord[]>([]);
  const [days, setDays] = useState(7);
  const [showAdd, setShowAdd] = useState(false);

  const loadRecords = async () => {
    if (!user) return;
    const data = await fetchNutritionRecords(user.id, days);
    setRecords(data);
  };

  useEffect(() => {
    void loadRecords();
  }, [user, days]);

  const defaultRow = () => ({
    meal_type: 'breakfast',
    recorded_at: new Date().toISOString().slice(0, 16),
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    description: '',
  });

  const handleBatchSubmit = async (rows: any[]) => {
    if (!user) return;
    const payload = rows.map(r => ({
      user_id: user.id,
      meal_type: r.meal_type,
      calories: parseInt(r.calories) || 0,
      protein_g: parseFloat(r.protein_g) || 0,
      carbs_g: parseFloat(r.carbs_g) || 0,
      fat_g: parseFloat(r.fat_g) || 0,
      description: r.description ? r.description : null,
      recorded_at: r.recorded_at ? new Date(r.recorded_at).toISOString() : new Date().toISOString(),
    }));
    const { error } = await supabase.from('nutrition_records').insert(payload);
    if (error) throw new Error(error.message);
    setShowAdd(false);
    await loadRecords();
  };

  const dailyCalories: Record<string, number> = {};
  records.forEach(r => {
    const d = formatDate(r.recorded_at);
    dailyCalories[d] = (dailyCalories[d] || 0) + r.calories;
  });
  const chartData = Object.entries(dailyCalories).map(([date, cal]) => ({ date, calories: cal }));

  return (
    <div>
      <PageHeader
        title="Nutrition"
        subtitle="Track your meals and nutritional intake"
        action={
          <div className="flex items-center gap-2">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300">
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
            </select>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700">
              <Plus size={16} /> Log Meals
            </button>
          </div>
        }
      />

      <div className="space-y-6 p-8">
        {showAdd && (
          <BatchAddForm
            title="Log Meals"
            helperText="Add one or more meals at once. Macro fields are optional."
            fields={nutritionFields}
            defaultRow={defaultRow}
            onSubmit={handleBatchSubmit}
            onClose={() => setShowAdd(false)}
            submitLabel="Save All"
            initialRows={3}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Utensils size={20} />} label="Avg Calories" value={records.length > 0 ? calculateAverage(records.map(r => r.calories)).toFixed(0) : '—'} unit="/day" color="orange" />
          <StatCard icon={<Utensils size={20} />} label="Avg Protein" value={records.length > 0 ? calculateAverage(records.map(r => r.protein_g)).toFixed(0) : '—'} unit="g/day" color="red" />
          <StatCard icon={<Utensils size={20} />} label="Avg Carbs" value={records.length > 0 ? calculateAverage(records.map(r => r.carbs_g)).toFixed(0) : '—'} unit="g/day" color="blue" />
          <StatCard icon={<Utensils size={20} />} label="Avg Fat" value={records.length > 0 ? calculateAverage(records.map(r => r.fat_g)).toFixed(0) : '—'} unit="g/day" color="teal" />
        </div>

        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Daily Calories ({days}d)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="calories" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={<Utensils size={24} />} title="No nutrition data" message="Log your meals to track calories and macros." />
          )}
        </Card>

        {records.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Meals</h3>
            <div className="space-y-2">
              {[...records].reverse().slice(0, 10).map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize">{r.meal_type}{r.description ? ` — ${r.description}` : ''}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(r.recorded_at)} · {r.calories} cal · {r.protein_g}g protein · {r.carbs_g}g carbs · {r.fat_g}g fat</p>
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
