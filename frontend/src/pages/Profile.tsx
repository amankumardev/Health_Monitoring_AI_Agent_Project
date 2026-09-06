import { useEffect, useState } from 'react';
import { User, Save, Volume2, Bell, Target } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { supportedLanguages } from '@/lib/textToSpeech';

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    height_cm: '',
    weight_kg: '',
    date_of_birth: '',
    activity_level: 'moderate',
  });
  const [voiceForm, setVoiceForm] = useState({
    voice_enabled: true,
    auto_play_responses: false,
    preferred_language: 'en-US',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        email: profile.email || user?.email || '',
        height_cm: profile.height_cm?.toString() || '',
        weight_kg: profile.weight_kg?.toString() || '',
        date_of_birth: profile.date_of_birth || '',
        activity_level: profile.activity_level || 'moderate',
      });
      setVoiceForm({
        voice_enabled: profile.voice_enabled ?? true,
        auto_play_responses: profile.auto_play_responses ?? false,
        preferred_language: profile.preferred_language || 'en-US',
      });
    }
  }, [profile, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({
      full_name: form.full_name || null,
      email: form.email || null,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      date_of_birth: form.date_of_birth || null,
      activity_level: form.activity_level,
      voice_enabled: voiceForm.voice_enabled,
      auto_play_responses: voiceForm.auto_play_responses,
      preferred_language: voiceForm.preferred_language,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    refreshProfile();
  };

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your personal information and preferences" />

      <div className="max-w-2xl space-y-6 p-8">
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <User size={18} className="text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Personal Information</h3>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Height (cm)</label>
                <input type="number" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Weight (kg)</label>
                <input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Date of Birth</label>
                <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Activity Level</label>
                <select value={form.activity_level} onChange={(e) => setForm({ ...form, activity_level: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-teal-500">
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                  <option value="very_active">Very Active</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <div className="mb-4 flex items-center gap-2">
                <Volume2 size={18} className="text-teal-600" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">AI Voice Settings</h4>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700 px-4 py-3">
                  <span className="text-sm text-slate-700 dark:text-slate-200">Enable voice responses</span>
                  <input type="checkbox" checked={voiceForm.voice_enabled} onChange={(e) => setVoiceForm({ ...voiceForm, voice_enabled: e.target.checked })} className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-teal-600" />
                </label>
                <label className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700 px-4 py-3">
                  <span className="text-sm text-slate-700 dark:text-slate-200">Auto-play AI responses</span>
                  <input type="checkbox" checked={voiceForm.auto_play_responses} onChange={(e) => setVoiceForm({ ...voiceForm, auto_play_responses: e.target.checked })} className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-teal-600" />
                </label>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-700 px-4 py-3">
                  <label className="mb-1.5 block text-sm text-slate-700 dark:text-slate-200">Preferred Language</label>
                  <select value={voiceForm.preferred_language} onChange={(e) => setVoiceForm({ ...voiceForm, preferred_language: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-teal-500">
                    {supportedLanguages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60">
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saved && <span className="text-sm text-green-600">Saved successfully!</span>}
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={18} className="text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notifications</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Notification preferences are managed automatically. You'll receive alerts for unusual health patterns, medication reminders, and goal progress.</p>
        </Card>
      </div>
    </div>
  );
}
