import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Activity, Moon, Droplets, Stethoscope, TrendingUp, AlertCircle, Target, Pill } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { Card, StatCard, PageHeader, EmptyState } from '@/components/ui';
import { fetchAllVitals, fetchActivityRecords, fetchSleepRecords, fetchHydrationRecords, formatDate } from '@/lib/healthData';
import { calculateAverage, detectTrend } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { Alert, Goal, Medication } from '@/types';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [heartRateData, setHeartRateData] = useState<any[]>([]);
  const [sleepData, setSleepData] = useState<any[]>([]);
  const [stepData, setStepData] = useState<any[]>([]);
  const [hydrationData, setHydrationData] = useState<any[]>([]);
  const [avgHeartRate, setAvgHeartRate] = useState<number | null>(null);
  const [avgSleep, setAvgSleep] = useState<number | null>(null);
  const [avgSteps, setAvgSteps] = useState<number | null>(null);
  const [totalHydration, setTotalHydration] = useState<number>(0);
  const [hydrationGoal, setHydrationGoal] = useState<number>(2500);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [vitals, activity, sleep, hydration] = await Promise.all([
          fetchAllVitals(user.id, 7),
          fetchActivityRecords(user.id, 7),
          fetchSleepRecords(user.id, 7),
          fetchHydrationRecords(user.id, 7),
        ]);

        const hrVitals = vitals.filter(v => v.type === 'heart_rate');
        setHeartRateData(hrVitals.map(v => ({ date: formatDate(v.recorded_at), value: v.value })));
        setAvgHeartRate(hrVitals.length > 0 ? calculateAverage(hrVitals.map(v => v.value)) : null);

        setSleepData(sleep.map(s => ({ date: formatDate(s.sleep_start), hours: s.duration_hours, quality: s.quality })));
        setAvgSleep(sleep.length > 0 ? calculateAverage(sleep.map(s => s.duration_hours)) : null);

        setStepData(activity.map(a => ({ date: formatDate(a.recorded_at), steps: a.steps })));
        setAvgSteps(activity.length > 0 ? calculateAverage(activity.map(a => a.steps)) : null);

        const today = new Date().toISOString().split('T')[0];
        const todayHydration = hydration.filter(h => h.recorded_at.startsWith(today));
        const todayTotal = todayHydration.reduce((sum, h) => sum + h.water_ml, 0);
        setTotalHydration(todayTotal);
        if (todayHydration[0]) setHydrationGoal(todayHydration[0].daily_goal_ml);

        const hydrationByDay: Record<string, number> = {};
        hydration.forEach(h => {
          const d = formatDate(h.recorded_at);
          hydrationByDay[d] = (hydrationByDay[d] || 0) + h.water_ml;
        });
        setHydrationData(Object.entries(hydrationByDay).map(([date, ml]) => ({ date, ml })));

        const { data: alertData } = await supabase
          .from('alerts')
          .select('*')
          .eq('user_id', user.id)
          .eq('acknowledged', false)
          .order('created_at', { ascending: false })
          .limit(5);
        setAlerts((alertData as Alert[]) || []);

        const { data: goalData } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setGoals((goalData as Goal[]) || []);

        const { data: medData } = await supabase
          .from('medications')
          .select('*')
          .eq('user_id', user.id)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(5);
        setMeds((medData as Medication[]) || []);
      } catch (e) {
        console.error('Dashboard error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Your health at a glance" />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${firstName}`} />

        <div className="space-y-6 p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Heart size={20} />}
              label="Avg Heart Rate"
              value={avgHeartRate !== null ? avgHeartRate.toFixed(0) : '—'}
              unit="bpm"
              color="red"
              trend={heartRateData.length > 1 ? detectTrend(heartRateData.map(d => d.value)).direction : undefined}
            />
            <StatCard
              icon={<Moon size={20} />}
              label="Avg Sleep"
              value={avgSleep !== null ? avgSleep.toFixed(1) : '—'}
              unit="hrs"
              color="blue"
              trend={sleepData.length > 1 ? detectTrend(sleepData.map(d => d.hours)).direction : undefined}
            />
            <StatCard
              icon={<Activity size={20} />}
              label="Avg Steps"
              value={avgSteps !== null ? avgSteps.toFixed(0) : '—'}
              unit="/day"
              color="green"
              trend={stepData.length > 1 ? detectTrend(stepData.map(d => d.steps)).direction : undefined}
            />
            <StatCard
              icon={<Droplets size={20} />}
              label="Hydration Today"
              value={totalHydration}
              unit={`/ ${hydrationGoal} ml`}
              color="teal"
              trend={totalHydration >= hydrationGoal ? 'Goal reached' : `${((totalHydration / hydrationGoal) * 100).toFixed(0)}% of goal`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Heart Rate (7 days)</h3>
                <Heart size={16} className="text-red-400" />
              </div>
              {heartRateData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={heartRateData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                  No heart rate data yet
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sleep Duration (7 days)</h3>
                <Moon size={16} className="text-blue-400" />
              </div>
              {sleepData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sleepData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                  No sleep data yet
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Daily Steps (7 days)</h3>
                <Activity size={16} className="text-green-400" />
              </div>
              {stepData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stepData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="steps" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                  No activity data yet
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Hydration (7 days)</h3>
                <Droplets size={16} className="text-teal-400" />
              </div>
              {hydrationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={hydrationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="ml" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                  No hydration data yet
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-100 dark:from-teal-900/30 dark:to-cyan-900/20 dark:border-teal-800">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shrink-0">
                  <Stethoscope size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Talk to Health AI</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Ask about your sleep, heart rate, activity, or any health question. Use text or voice — it's the same AI assistant.
                  </p>
                  <Link
                    to="/ai-assistant"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                  >
                    <Stethoscope size={16} />
                    Open AI Assistant
                  </Link>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Alerts</h3>
              </div>
              {alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.map(a => (
                    <div key={a.id} className={`rounded-lg px-3 py-2 text-xs ${
                      a.severity === 'URGENT' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      a.severity === 'IMPORTANT' ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                      'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}>
                      <p className="font-semibold">{a.title}</p>
                      <p className="mt-0.5 opacity-80">{a.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">No active alerts. You're all caught up.</p>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="mb-3 flex items-center gap-2">
                <Target size={18} className="text-teal-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Goals</h3>
              </div>
              {goals.length > 0 ? (
                <div className="space-y-3">
                  {goals.map(g => {
                    const progress = g.target_value > 0 ? Math.min((g.current_value / g.target_value) * 100, 100) : 0;
                    return (
                      <div key={g.id}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{g.title}</span>
                          <span className="text-slate-400 dark:text-slate-500">{g.current_value}/{g.target_value} {g.unit}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                          <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">No goals set. Create goals to track your progress.</p>
              )}
            </Card>

            <Card className="p-6">
              <div className="mb-3 flex items-center gap-2">
                <Pill size={18} className="text-purple-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Medications</h3>
              </div>
              {meds.length > 0 ? (
                <div className="space-y-2">
                  {meds.map(m => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{m.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{m.dosage} - {m.schedule}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">No active medications.</p>
              )}
            </Card>
          </div>
        </div>
    </div>
  );
}
