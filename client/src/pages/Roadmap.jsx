import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ExternalLink, Info } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard.jsx';
import Loader from '../components/ui/Loader.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import RewardNotice from '../components/ui/RewardNotice.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProgress } from '../context/ProgressContext.jsx';
import { setTaskDone } from '../services/progress.js';

const STATUS = {
  'not-started': { text: 'Not started', cls: 'bg-white/10 text-slate-300' },
  'in-progress': { text: 'In progress', cls: 'bg-neon-cyan/15 text-neon-cyan' },
  completed: { text: 'Completed', cls: 'bg-emerald-400/15 text-emerald-300' },
};

const isHttps = (url) => typeof url === 'string' && /^https:\/\//i.test(url);

function Milestone({ m, index, open, onToggle, busyTask, onTask, readOnly }) {
  const status = STATUS[m.status || (m.progress >= 100 ? 'completed' : m.progress > 0 ? 'in-progress' : 'not-started')];
  const hasDetails = Array.isArray(m.tasks);
  const panelId = `milestone-${m.id}`;

  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        disabled={!hasDetails}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-cyan"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold text-slate-200">
          {m.progress >= 100 ? <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden /> : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-white">{m.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {m.timeline && <span>{m.timeline}</span>}
            <span className={`rounded-full px-2 py-0.5 ${status.cls}`}>{status.text}</span>
            <span className="tabular-nums">{m.progress}%</span>
          </span>
        </span>
        {hasDetails && (
          <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
        )}
      </button>
      <div className="px-4 pb-1">
        <ProgressBar value={m.progress} color={m.progress >= 100 ? 'green' : 'cyan'} label={`${m.title} progress`} />
      </div>

      {open && hasDetails && (
        <div id={panelId} className="space-y-4 px-4 pb-4 pt-3">
          {m.description && <p className="text-sm text-slate-300">{m.description}</p>}

          <ul className="space-y-2">
            {m.tasks.map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 text-sm hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={t.done}
                    disabled={readOnly || busyTask === t.id}
                    onChange={(e) => onTask(m, t, e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-purple-500"
                  />
                  <span className={t.done ? 'text-slate-400 line-through' : 'text-slate-100'}>{t.title}</span>
                </label>
              </li>
            ))}
          </ul>

          {m.resources?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Resources</p>
              <ul className="space-y-1 text-sm">
                {m.resources.map((r, i) => (
                  <li key={`${r.title}-${i}`}>
                    {isHttps(r.url) ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-neon-cyan underline-offset-2 hover:underline"
                      >
                        {r.title}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <span className="text-slate-300">{r.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function Roadmap() {
  const { user, token } = useAuth();
  const { progress, loading, error, isSample, refresh, apply } = useProgress();
  const [openId, setOpenId] = useState(null);
  const [busyTask, setBusyTask] = useState('');
  const [reward, setReward] = useState(null);
  const [taskError, setTaskError] = useState('');

  if (loading && !progress) return <Loader label="Loading your roadmap" />;
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

  const roadmap = progress?.roadmap;
  if (!roadmap) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-extrabold text-white">Your roadmap</h1>
        <p className="mt-3 text-slate-300">Your roadmap appears here once you create a dream.</p>
        <Link to="/create" className="btn-primary mt-6">
          Create Your Future
        </Link>
      </div>
    );
  }

  const milestones = roadmap.milestones;
  // Open the first unfinished milestone by default.
  const defaultOpen = (milestones.find((m) => m.progress < 100) || milestones[0])?.id;
  const currentOpen = openId === null ? defaultOpen : openId;

  const onTask = async (milestone, task, done) => {
    setBusyTask(task.id);
    setTaskError('');
    try {
      const res = await setTaskDone(token, milestone.id, task.id, done);
      apply(res.progress);
      setReward({ xpGained: res.xpGained, newAchievements: res.newAchievements, streak: res.streak });
    } catch (err) {
      setTaskError(err.message);
    } finally {
      setBusyTask('');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-xs uppercase tracking-widest text-slate-400">Your plan</p>
        <h1 className="text-3xl font-extrabold text-white">{roadmap.title || 'Roadmap'}</h1>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar value={roadmap.overall} color="purple" label="Overall roadmap progress" />
          </div>
          <span className="text-sm font-semibold tabular-nums text-neon-cyan">{roadmap.overall}%</span>
        </div>
      </header>

      {(isSample || user?.demo) && (
        <p className="flex items-start gap-2 rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 px-4 py-3 text-sm text-slate-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-neon-cyan" aria-hidden />
          <span>
            This is <strong>sample data</strong> and cannot be edited.{' '}
            <Link to="/register" className="font-semibold text-neon-cyan underline">
              Create an account
            </Link>{' '}
            to tick off real tasks and earn XP.
          </span>
        </p>
      )}

      <p className="text-xs text-slate-400">
        {roadmap.source === 'ai'
          ? 'Written by AI. Treat timelines and resources as suggestions and double-check them.'
          : 'Built from simple rules, not AI. Timelines are rough guides.'}
      </p>

      <RewardNotice xpGained={reward?.xpGained} newAchievements={reward?.newAchievements} streak={reward?.streak} />
      {taskError && (
        <p role="alert" className="rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-4 py-3 text-sm text-neon-pink">
          {taskError}
        </p>
      )}

      <GlassCard className="!p-3 sm:!p-4">
        <ol className="space-y-3">
          {milestones.map((m, i) => (
            <Milestone
              key={m.id}
              m={m}
              index={i}
              open={currentOpen === m.id}
              onToggle={() => setOpenId(currentOpen === m.id ? '' : m.id)}
              busyTask={busyTask}
              onTask={onTask}
              readOnly={isSample}
            />
          ))}
        </ol>
      </GlassCard>

      <p className="text-xs text-slate-400">
        Tasks give 10 XP the first time you complete them, finishing a milestone gives a 50 XP bonus. An
        imaginative plan, not a promise of results.
      </p>
    </div>
  );
}
