import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import AppLayout from '@/layouts/AppLayout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Vitals from '@/pages/Vitals';
import Sleep from '@/pages/Sleep';
import Activity from '@/pages/Activity';
import Hydration from '@/pages/Hydration';
import Nutrition from '@/pages/Nutrition';
import Medications from '@/pages/Medications';
import Goals from '@/pages/Goals';
import Alerts from '@/pages/Alerts';
import Profile from '@/pages/Profile';
import AIAssistant from '@/pages/AIAssistant';

function ProtectedRedirect() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return session ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="vitals" element={<Vitals />} />
              <Route path="sleep" element={<Sleep />} />
              <Route path="activity" element={<Activity />} />
              <Route path="hydration" element={<Hydration />} />
              <Route path="nutrition" element={<Nutrition />} />
              <Route path="medications" element={<Medications />} />
              <Route path="goals" element={<Goals />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="profile" element={<Profile />} />
              <Route path="ai-assistant" element={<AIAssistant />} />
            </Route>
            <Route path="*" element={<ProtectedRedirect />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
