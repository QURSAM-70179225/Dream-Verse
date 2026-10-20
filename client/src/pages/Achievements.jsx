import { Link } from 'react-router-dom';
import { Check, Lock, Star } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard.jsx';
import Loader from '../components/ui/Loader.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import StreakChip from '../components/ui/StreakChip.jsx';
import { useProgress } from '../context/ProgressContext.jsx';
import { LEVEL_TITLES } from '../utils/xp.js';

const PLACES = [
  { key: 'apartment', label: 'Apartment' },
  { key: 'office', label: 'Office' },
  { key: 'cafe', label: 'Café' },
];

const dateText = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export default function Achievements() {
  const { progress, loading, error, isSample, refresh } = useProgress();

  if (loading && !progress) return <Loader label="Loading achievements" />;
  if (error) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p role="alert" className="rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-4 py-3 text-neon-pink">
          {error}
        </p>
        <button type="button" onClick={refresh} className="btn-primary mt-6">
          Try again
        </button>
      </div>
    );
  }

  const items = progress.achievements;
  const earned = items.filter((a) => a.earned).length;
  const visited = progress.visited || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Your progress</p>
          <h1 className="text-3xl font-extrabold text-white">Achievements</h1>
        </div>
        <p className="text-sm text-slate-300">
          <strong className="text-white">{earned}</strong> of {items.length} earned ·{' '}
          <strong className="text-white">{progress.xp}</strong> XP · Level {progress.level} ({progress.title})
        </p>
      </header>

      <GlassCard>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>Level {progress.level}</span>
          <span>
            {progress.into} / {progress.needed} XP to level {progress.level + 1}
          </span>
        </div>
        <ProgressBar value={progress.percent} color="purple" label="Progress to the next level" />
        <ol className="mt-4 flex flex-wrap gap-2 text-xs">
          {LEVEL_TITLES.map((t, i) => (
            <li
              key={t}
              aria-current={progress.level === i + 1 || (i === LEVEL_TITLES.length - 1 && progress.level > i) ? 'step' : undefined}
              className={`rounded-full border px-3 py-1 ${
                progress.level >= i + 1 ? 'border-neon-purple/50 bg-neon-purple/15 text-white' : 'border-white/10 text-slate-400'
              }`}
            >
              Lv {i + 1} · {t}
            </li>
          ))}
        </ol>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-xs font-extrabold tracking-[0.2em] text-slate-300">DAILY STREAK</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StreakChip streak={progress.streak} />
          <span className="text-sm text-slate-300">Best: {progress.streak?.best ?? 0} days</span>
        </div>
        <p className="mt-3 text-sm text-slate-300">
          Complete a roadmap task, make a decision or visit a building in your world to count the day. The first
          action each day pays a small bonus (5 XP per streak day, up to 25 XP). Miss a day and the streak
          restarts. Days follow your own time zone.
        </p>
      </GlassCard>

      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((a) => (
          <li
            key={a.key}
            className={`flex gap-4 rounded-2xl border p-4 ${
              a.earned ? 'border-neon-purple/40 bg-neon-purple/10' : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
                a.earned ? 'bg-dream-gradient text-white shadow-neon-purple' : 'bg-white/10 text-slate-400'
              }`}
            >
              {a.earned ? <Star className="h-6 w-6" aria-hidden /> : <Lock className="h-6 w-6" aria-hidden />}
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-white">
                {a.title} <span className="sr-only">{a.earned ? '(earned)' : '(locked)'}</span>
              </h2>
              {a.description && <p className="mt-0.5 text-sm text-slate-300">{a.description}</p>}
              <p className="mt-1 text-xs text-slate-400">
                {a.xp} XP{a.earned && a.earnedAt ? ` · earned ${dateText(a.earnedAt)}` : a.earned ? ' · earned' : ' · locked'}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {!isSample && (
        <GlassCard>
          <h2 className="font-display text-xs font-extrabold tracking-[0.2em] text-slate-300">WORLD EXPLORATION</h2>
          <p className="mt-2 text-sm text-slate-300">
            Walk into each building in your world to earn 10 XP for the first visit. Visit all three to unlock
            Future Explorer.
          </p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {PLACES.map((p) => {
              const done = visited.includes(p.key);
              return (
                <li
                  key={p.key}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                    done ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-white/15 text-slate-300'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
                  {p.label}
                  <span className="sr-only">{done ? ' (visited)' : ' (not visited yet)'}</span>
                </li>
              );
            })}
          </ul>
          <Link to="/world" className="btn-ghost mt-4 !py-2 text-sm">
            Go to your world
          </Link>
        </GlassCard>
      )}
    </div>
  );
}
