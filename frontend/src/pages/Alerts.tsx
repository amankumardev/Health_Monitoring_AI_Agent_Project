import { useEffect, useState } from 'react';
import { AlertCircle, Check, Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Alert } from '@/types';

const severityConfig = {
  URGENT: { color: 'red', bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', icon: 'text-red-500' },
  IMPORTANT: { color: 'orange', bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', icon: 'text-orange-500' },
  ATTENTION: { color: 'yellow', bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800', icon: 'text-yellow-500' },
  NORMAL: { color: 'blue', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', icon: 'text-blue-500' },
};

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unacknowledged'>('all');

  useEffect(() => {
    if (!user) return;
    (async () => {
      let query = supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (filter === 'unacknowledged') query = query.eq('acknowledged', false);
      const { data } = await query;
      setAlerts((data as Alert[]) || []);
    })();
  }, [user, filter]);

  const acknowledge = async (id: string) => {
    await supabase.from('alerts').update({ acknowledged: true }).eq('id', id);
    setAlerts(alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Health alerts and notifications"
        action={
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
            <button onClick={() => setFilter('all')} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${filter === 'all' ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>All</button>
            <button onClick={() => setFilter('unacknowledged')} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${filter === 'unacknowledged' ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Active</button>
          </div>
        }
      />

      <div className="space-y-4 p-8">
        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map(a => {
              const cfg = severityConfig[a.severity] || severityConfig.ATTENTION;
              return (
                <Card key={a.id} className={`p-5 border-l-4 ${cfg.border.replace('border-', 'border-l-')}`}>
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 ${cfg.icon}`}>
                      <AlertCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{a.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>{a.severity}</span>
                        {a.acknowledged && <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">Acknowledged</span>}
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.message}</p>
                      {a.metric_type && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Metric: {a.metric_type} = {a.metric_value}</p>}
                      <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                    {!a.acknowledged && (
                      <button onClick={() => acknowledge(a.id)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                        <Check size={14} /> Acknowledge
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Bell size={24} />} title="No alerts" message="You're all caught up. Health alerts will appear here when the system detects unusual patterns." />
        )}
      </div>
    </div>
  );
}
