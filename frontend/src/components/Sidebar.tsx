import { NavLink } from 'react-router-dom';
import { Activity, Heart, Moon, Droplets, Utensils, Pill, Target, AlertCircle, Stethoscope, User, LogOut, LayoutDashboard, Sun, Monitor } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/vitals', label: 'Vitals', icon: Heart },
  { to: '/sleep', label: 'Sleep', icon: Moon },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/hydration', label: 'Hydration', icon: Droplets },
  { to: '/nutrition', label: 'Nutrition', icon: Utensils },
  { to: '/medications', label: 'Medications', icon: Pill },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/alerts', label: 'Alerts', icon: AlertCircle },
  { to: '/ai-assistant', label: 'AI Assistant', icon: Stethoscope, highlight: true },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <aside className="fixed left-0 top-0 z-30 h-screen w-64 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col transition-colors">
      <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Heart size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Health AI</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Monitoring Agent</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 dark:bg-slate-800 dark:text-teal-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                } ${item.highlight ? 'mt-2 border-t border-slate-200 dark:border-slate-700 pt-3' : ''}`
              }
            >
              <Icon size={18} className={item.highlight ? 'text-teal-600' : ''} />
              {item.label}
              {item.highlight && (
                <span className="ml-auto rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  AI
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-3 space-y-0.5">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-teal-50 text-teal-700 dark:bg-slate-800 dark:text-teal-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`
          }
        >
          <User size={18} />
          Profile
        </NavLink>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
        {profile?.full_name && (
          <div className="px-3 pt-2">
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">Signed in as</p>
            <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">{profile.full_name}</p>
          </div>
        )}
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={18} /> : <Monitor size={18} />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </aside>
  );
}
