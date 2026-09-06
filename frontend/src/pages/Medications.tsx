import { useEffect, useState } from 'react';
import { Pill, Plus, Check, X, Clock, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import BatchAddForm, { BatchField } from '@/components/BatchAddForm';
import { supabase } from '@/lib/supabase';
import { Medication, MedicationLog } from '@/types';
import { formatDate } from '@/lib/healthData';

const medicationFields: BatchField[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Medication name' },
  { key: 'dosage', label: 'Dosage', type: 'text', required: true, placeholder: '500mg' },
  { key: 'schedule', label: 'Schedule', type: 'text', required: true, placeholder: '2x daily, morning & evening' },
  { key: 'instructions', label: 'Instructions', type: 'text', placeholder: 'With food' },
  { key: 'end_date', label: 'End Date', type: 'date' },
];

export default function Medications() {
  const { user } = useAuth();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const loadAll = async () => {
    if (!user) return;
    const { data: medData } = await supabase.from('medications').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    setMeds((medData as Medication[]) || []);
    const { data: logData } = await supabase.from('medication_logs').select('*').eq('user_id', user.id).gte('logged_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).order('logged_at', { ascending: false });
    setLogs((logData as MedicationLog[]) || []);
  };

  useEffect(() => {
    void loadAll();
  }, [user]);

  const defaultRow = () => ({ name: '', dosage: '', schedule: '', instructions: '', end_date: '' });

  const handleBatchSubmit = async (rows: any[]) => {
    if (!user) return;
    const payload = rows.map(r => ({
      user_id: user.id,
      name: r.name,
      dosage: r.dosage,
      schedule: r.schedule,
      instructions: r.instructions || null,
      end_date: r.end_date || null,
    }));
    const { error } = await supabase.from('medications').insert(payload);
    if (error) throw new Error(error.message);
    setShowAdd(false);
    await loadAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('medications').delete().eq('id', id);
    setMeds(meds.filter(m => m.id !== id));
  };

  const logMedication = async (medId: string, status: 'taken' | 'skipped') => {
    if (!user) return;
    await supabase.from('medication_logs').insert({
      user_id: user.id,
      medication_id: medId,
      status,
      logged_at: new Date().toISOString(),
    });
    const { data } = await supabase.from('medication_logs').select('*').eq('user_id', user.id).gte('logged_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).order('logged_at', { ascending: false });
    setLogs((data as MedicationLog[]) || []);
  };

  const isLoggedToday = (medId: string) => logs.some(l => l.medication_id === medId && l.status === 'taken');

  return (
    <div>
      <PageHeader
        title="Medications"
        subtitle="Track your medication schedule"
        action={
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700">
            <Plus size={16} /> Add Medications
          </button>
        }
      />

      <div className="space-y-6 p-8">
        {showAdd && (
          <BatchAddForm
            title="Add Medications"
            helperText="Add one or more medications at once."
            fields={medicationFields}
            defaultRow={defaultRow}
            onSubmit={handleBatchSubmit}
            onClose={() => setShowAdd(false)}
            submitLabel="Save All"
            initialRows={2}
          />
        )}

        {meds.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {meds.map(m => (
              <Card key={m.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${!m.active ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'}`}>
                      <Pill size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{m.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{m.dosage} · {m.schedule}</p>
                      {m.instructions && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{m.instructions}</p>}
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Started: {formatDate(m.start_date)}{m.end_date ? ` · Until: ${formatDate(m.end_date)}` : ''}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(m.id)} className="text-slate-300 hover:text-red-500 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {isLoggedToday(m.id) ? (
                    <span className="flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-900/30 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300">
                      <Check size={14} /> Taken today
                    </span>
                  ) : (
                    <>
                      <button onClick={() => logMedication(m.id, 'taken')} className="flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-900/30 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition">
                        <Check size={14} /> Mark as taken
                      </button>
                      <button onClick={() => logMedication(m.id, 'skipped')} className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                        <X size={14} /> Skip
                      </button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Pill size={24} />} title="No medications" message="Add your medications to track your schedule and log when you take them." />
        )}

        {logs.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Activity (24h)</h3>
            <div className="space-y-2">
              {logs.map(l => {
                const med = meds.find(m => m.id === l.medication_id);
                return (
                  <div key={l.id} className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-sm">
                    {l.status === 'taken' ? <Check size={16} className="text-green-600" /> : <X size={16} className="text-slate-400 dark:text-slate-500" />}
                    <span className="font-medium text-slate-700 dark:text-slate-200">{med?.name || 'Unknown'}</span>
                    <span className="text-slate-400 dark:text-slate-500">— {l.status}</span>
                    <span className="ml-auto text-xs text-slate-400 dark:text-slate-500"><Clock size={12} className="inline mr-1" />{new Date(l.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
