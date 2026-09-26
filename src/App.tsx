import { lazy, Suspense, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { useDB } from './lib/store';
import { useTheme } from './lib/theme';
import { Icon } from './components/Icon';
import { Logo } from './components/ui';
import { MiniPlayer } from './components/MiniPlayer';
import { EntryGate } from './components/EntryGate';
import Login from './screens/Login';
import Home from './screens/Home';

// الشاشات الأقل استخدامًا تُحمَّل عند الحاجة لتسريع الفتح
const Workout = lazy(() => import('./screens/Workout'));
const Live = lazy(() => import('./screens/Live'));
const CalendarScreen = lazy(() => import('./screens/Calendar'));
const Food = lazy(() => import('./screens/Food'));
const More = lazy(() => import('./screens/More'));
const Devices = lazy(() => import('./screens/Devices'));
const DeviceDetail = lazy(() => import('./screens/DeviceDetail'));
const Listen = lazy(() => import('./screens/Listen'));
const Progress = lazy(() => import('./screens/Progress'));
const ProgramScreen = lazy(() => import('./screens/Program'));
const History = lazy(() => import('./screens/History'));
const SessionDetail = lazy(() => import('./screens/SessionDetail'));
const Settings = lazy(() => import('./screens/Settings'));
const ProgramEditor = lazy(() => import('./screens/ProgramEditor'));

function Splash() {
  return (
    <div className="splash splash-45">
      <span className="splash-dot d1" />
      <span className="splash-dot d2" />
      <span className="splash-dot d3" />
      <Logo size={72} />
    </div>
  );
}

function ConfigMissing() {
  return (
    <div className="login">
      <div className="login-in center stack">
        <Logo size={72} />
        <p className="muted">لم يتم ربط قاعدة البيانات بعد. أضِف متغيرات البيئة VITE_SUPABASE_URL وVITE_SUPABASE_ANON_KEY ثم أعد النشر.</p>
      </div>
    </div>
  );
}

const NAV = [
  { to: '/', icon: 'home', label: 'الرئيسية', end: true },
  { to: '/workout', icon: 'timer', label: 'التمرين' },
  { to: '/calendar', icon: 'calendar', label: 'التقويم' },
  { to: '/food', icon: 'plate', label: 'الأكل' },
  { to: '/more', icon: 'grid', label: 'المزيد' },
] as const;

function Shell() {
  const loc = useLocation();
  const db = useDB();
  const hideNav = loc.pathname.startsWith('/live');
  const isLive = !!db?.live;
  useTheme();
  return (
    <div className="app">
      <Suspense fallback={<div className="page"><div className="skel" style={{ height: 180 }} /></div>}>
        <Outlet />
      </Suspense>
      {!hideNav && (
        <nav className="nav" aria-label="التنقل الرئيسي">
          <div className="nav-in">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={'end' in n ? n.end : false} aria-label={n.label}>
                <span className="pill" />
                <Icon name={n.icon} />
                <span>{n.label}</span>
                {n.to === '/workout' && isLive && <span className="live-dot" aria-label="جلسة جارية" />}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  const { status, configured, user } = useAuth();
  const [enteredFor, setEnteredFor] = useState<string | null>(null);
  if (!configured) return <ConfigMissing />;
  if (status === 'loading') return <Splash />;
  if (status === 'signedOut') return <Login />;
if (!user) return null;

const userId = user.id;

if (enteredFor !== userId) {
  return <EntryGate onEnter={() => setEnteredFor(userId)} />;
}  return (
    <>
    <MiniPlayer />
    <Routes>
      <Route path="/live" element={<Suspense fallback={<Splash />}><Live /></Suspense>} />
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="workout" element={<Workout />} />
        <Route path="calendar" element={<CalendarScreen />} />
        <Route path="food" element={<Food />} />
        <Route path="more" element={<More />} />
        <Route path="devices" element={<Devices />} />
        <Route path="devices/:id" element={<DeviceDetail />} />
        <Route path="listen" element={<Listen />} />
        <Route path="progress" element={<Progress />} />
        <Route path="program" element={<ProgramScreen />} />
        <Route path="history" element={<History />} />
        <Route path="history/:id" element={<SessionDetail />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/program" element={<ProgramEditor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </>
  );
}
