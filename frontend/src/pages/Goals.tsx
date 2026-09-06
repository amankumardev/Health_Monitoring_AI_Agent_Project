import { useEffect, useState } from 'react';
import { Target, Plus, Check, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import BatchAddForm, { BatchField } from '@/components/BatchAddForm';
import { supabase } from '@/lib/supabase';
import { Goal } from '@/types';

const categories = ['steps', 'sleep', 'weight', 'hydration', 'exercise', 'heart_rate', 'nutrition'];

const goalFields: BatchField[] = [
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    required: true,
    options: categories.map(c => ({ value: c, label: c.replace('_', ' ') })),
  },
  { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Walk 10,000 steps daily' },
  { key: 'target_value', label: 'Target', type: 'number', required: true },
  { key: 'current_value', label: 'Current', type: 'number' },
  { key: 'unit', label: 'Unit', type: 'text', required: true, placeholder: 'steps' },
  { key: 'deadline', label: 'Deadline', type: 'date' },
];

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const loadGoals = async () => {
    if (!user) return;
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    setGoals((data as Goal[]) || []);
  };

  useEffect(() => {
    void loadGoals();
  }, [user]);

  const defaultRow = () => ({
    category: 'steps',
    title: '',
    target_value: '',
    current_value: '0',
    unit: '',
    deadline: '',
  });

  const handleBatchSubmit = async (rows: any[]) => {
    if (!user) return;
    const payload = rows.map(r => ({
      user_id: user.id,
      category: r.category,
      title: r.title,
      target_value: parseFloat(r.target_value),
      current_value: parseFloat(r.current_value) || 0,
      unit: r.unit,
      deadline: r.deadline || null,
    }));
    const { error } = await supabase.from('goals').insert(payload);
    if (error) throw new Error(error.message);
    setShowAdd(false);
    await loadGoals();
  };

  const handleUpdate = async (id: string, current: number, target: number) => {
    const completed = current >= target;
    await supabase.from('goals').update({ current_value: current, completed }).eq('id', id);
    setGoals(goals.map(g => g.id === id ? { ...g, current_value: current, completed } : g));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id);
    setGoals(goals.filter(g => g.id !== id));
  };

  return (
    <div>
      <PageHeader
        title="Goals"
        subtitle="Set and track your health objectives"
        action={
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700">
            <Plus size={16} /> New Goals
          </button>
        }
      />

      <div className="space-y-6 p-8">
        {showAdd && (
          <BatchAddForm
            title="Add Goals"
            helperText="Add one or more goals at once."
            fields={goalFields}
            defaultRow={defaultRow}
            onSubmit={handleBatchSubmit}
            onClose={() => setShowAdd(false)}
            submitLabel="Save All"
            initialRows={2}
          />
        )}

        {goals.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {goals.map(g => {
              const progress = g.target_value > 0 ? Math.min((g.current_value / g.target_value) * 100, 100) : 0;
              return (
                <Card key={g.id} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${g.completed ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'}`}>
                        {g.completed ? <Check size={20} /> : <Target size={20} />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{g.title}</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{g.category.replace('_', ' ')}{g.deadline ? ` · by ${g.deadline}` : ''}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(g.id)} className="text-slate-300 hover:text-red-500 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{g.current_value} / {g.target_value} {g.unit}</span>
                      <span className={g.completed ? 'text-green-600 font-medium' : 'text-slate-400 dark:text-slate-500'}>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className={`h-full rounded-full transition-all ${g.completed ? 'bg-green-500' : 'bg-teal-500'}`} style={{ width: `${progress}%` }} />
                    </div>
                    {!g.completed && (
                      <div className="mt-3 flex items-center gap-2">
                        <input type="number" placeholder="Update progress" className="rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-xs w-28" onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = parseFloat((e.target as HTMLInputElement).value);
                            if (!isNaN(val)) handleUpdate(g.id, val, g.target_value);
                          }
                        }} />
                        <button onClick={() => handleUpdate(g.id, g.target_value, g.target_value)} className="rounded-lg bg-teal-50 dark:bg-teal-900/30 px-2.5 py-1 text-xs font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition">
                          Mark complete
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Target size={24} />} title="No goals set" message="Create health goals to track your progress and stay motivated." />
        )}
      </div>
    </div>
  );
}
