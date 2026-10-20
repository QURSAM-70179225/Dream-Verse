import { Suspense, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bot,
  Compass,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import Logo from './Logo.jsx';
import Loader from '../ui/Loader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import LevelUpNotice from '../ui/LevelUpNotice.jsx';
import { ProgressProvider, useProgress } from '../../context/ProgressContext.jsx';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/create', label: 'Create Your Future', icon: Sparkles },
  { to: '/world', label: 'Your World', icon: Compass },
  { to: '/roadmap', label: 'Roadmap', icon: MapIcon },
  { to: '/decisions', label: 'Decisions', icon: GitBranch },
  { to: '/achievements', label: 'Achievements', icon: Trophy },
  { to: '/nova', label: 'Nova', icon: Bot },
];

const itemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
    isActive
      ? 'border border-neon-purple/50 bg-neon-purple/20 text-white shadow-neon-purple'
      : 'border border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
  }`;

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { progress } = useProgress();
  const level = progress?.level ?? 1;
  const percent = progress?.percent ?? 0;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <Logo to="/dashboard" />

      <nav aria-label="App" className="flex flex-1 flex-col gap-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={itemClass} onClick={onNavigate}>
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="glass p-4">
        <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
        <p className="text-xs text-slate-400">
          Level {level} · {progress?.title || 'Explorer'}{user?.demo ? ' (sample data)' : ''}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-dream-gradient" style={{ width: `${percent}%` }} />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {user?.demo ? 'Exit demo' : 'Log out'}
        </button>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <ProgressProvider>
      <AppShell />
    </ProgressProvider>
  );
}

function AppShell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-screen border-r border-white/10 bg-midnight-950/60 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-midnight-950/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Logo to="/dashboard" />
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/10"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-b border-white/10 bg-midnight-900/95 lg:hidden">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        )}

        <main id="main" className="flex-1 p-4 sm:p-6 lg:p-8">
          <LevelUpNotice className="mx-auto mb-4 max-w-3xl" />
          <Suspense fallback={<Loader label="Loading" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
