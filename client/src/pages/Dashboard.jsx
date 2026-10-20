import { Link } from 'react-router-dom';
import { Bot, CheckCircle2, Circle, Compass, Info, Sparkles } from 'lucide-react';
import AiActionButton from '../components/dashboard/AiActionButton.jsx';
import AiBadge from '../components/ui/AiBadge.jsx';
import StreakChip from '../components/ui/StreakChip.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import Loader from '../components/ui/Loader.jsx';
import NovaMascot from '../components/ui/NovaMascot.jsx';
import XpRing from '../components/dashboard/XpRing.jsx';
import WeeklyChart from '../components/dashboard/WeeklyChart.jsx';
import AchievementGrid from '../components/dashboard/AchievementGrid.jsx';
import RoadmapList from '../components/dashboard/RoadmapList.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProgress } from '../context/ProgressContext.jsx';
import { generateFuture, generateRoadmap } from '../services/ai.js';
import { demoScenarios } from '../utils/demoData.js';

function Heading({ children }) {
  return (
    <h2 className="mb-4 font-display text-xs font-extrabold tracking-[0.2em] text-slate-300">
      {children}
    </h2>
  );
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const { progress, loading, error, isSample, refresh } = useProgress();

  if (loading && !progress) return <Loader label="Loading your dashboard" />;

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

  const name = user?.name?.split(' ')[0] || 'Explorer';
  const dream = progress.dream;
  const roadmap = progress.roadmap;
  const initials = (user?.name || 'DV')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const dreamFacts = dream
    ? [
        ['Career', dream.career],
        ['City', dream.city],
        ['Home', dream.home],
        ['Lifestyle', dream.lifestyle],
      ].filter(([, v]) => v)
    : [];
  const scenarios = isSample
    ? demoScenarios
    : (progress.decisions || []).map((d) => ({
        id: d.id,
        title: d.scenarioTitle,
        choice: `You chose: ${d.choice}`,
        note: d.outcome?.headline || '',
      }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="grid h-14 w-14 place-items-center rounded-full border-2 border-neon-purple bg-neon-purple/20 font-display text-lg font-extrabold text-white shadow-neon-purple"
          >
            {initials}
          </span>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Welcome back,</p>
            <h1 className="text-3xl font-extrabold text-white">
              {name}{' '}
              <span className="ml-1 rounded-md bg-neon-purple/30 px-2 py-0.5 align-middle text-xs font-semibold text-neon-magenta">
                Level {progress.level} · {progress.title}
              </span>
            </h1>
          </div>
        </div>
        <StreakChip streak={progress.streak} />
        <Link to="/world" className="btn-primary">
          <Compass className="h-5 w-5" aria-hidden />
          Continue Exploring
        </Link>
      </header>

      {isSample && (
        <p className="flex items-start gap-2 rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 px-4 py-3 text-sm text-slate-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-neon-cyan" aria-hidden />
          <span>
            You are viewing <strong>sample data</strong>. Create an account to save your own dream,
            roadmap and XP. All outcomes are imaginative, not predictions.
          </span>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2" delay={0.05}>
          <Heading>YOUR DREAM FUTURE</Heading>
          {dream ? (
            <>
              {dream.summary && (
                <p className="text-lg leading-relaxed text-white">{dream.summary}</p>
              )}
              {dreamFacts.length > 0 && (
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  {dreamFacts.map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-white/5 px-4 py-3">
                      <dt className="text-xs uppercase tracking-wider text-slate-400">{k}</dt>
                      <dd className="mt-0.5 text-slate-100">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {dream.profile?.source === 'ai' && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <AiBadge mode="live" />
                  <span>Personalized by AI. An imaginative simulation, not a prediction.</span>
                </div>
              )}
              {dream.profile?.source === 'template' && (
                <p className="mt-3 text-xs text-slate-400">
                  Built from your answers with simple rules, not AI. An imaginative simulation, not a
                  prediction.
                </p>
              )}
              {!isSample && dream.profile?.source === 'template' && (
                <AiActionButton
                  label="Personalize with AI"
                  busyLabel="Asking AI… this can take a few seconds"
                  successText="Done. Your future was personalized by AI."
                  run={() => generateFuture(token, dream.id)}
                  onDone={refresh}
                />
              )}
              <Link to="/create" className="btn-ghost mt-5 !py-2 text-sm">
                Create a new dream
              </Link>
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="text-slate-300">You haven&apos;t created a dream yet.</p>
              <Link to="/create" className="btn-primary mt-4">
                <Sparkles className="h-5 w-5" aria-hidden />
                Create Your Future
              </Link>
            </div>
          )}
        </GlassCard>

        <GlassCard delay={0.1} className="flex flex-col items-center">
          <Heading>XP &amp; LEVEL</Heading>
          <XpRing xp={progress.xp} />
        </GlassCard>

        <GlassCard delay={0.15}>
          <Heading>CURRENT GOALS</Heading>
          {dream?.goalItems?.length ? (
            <ul className="space-y-3">
              {dream.goalItems.map((g) => {
                const item = typeof g === 'string' ? { id: g, title: g, done: false } : g;
                return (
                  <li key={item.id} className="flex items-start gap-3 text-sm">
                    {item.done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                    )}
                    <span className={item.done ? 'text-slate-400 line-through' : 'text-slate-100'}>
                      {item.title}
                      <span className="sr-only">{item.done ? ' (completed)' : ' (in progress)'}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Add personal goals when you create a dream.</p>
          )}
        </GlassCard>

        <GlassCard delay={0.2} className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xs font-extrabold tracking-[0.2em] text-slate-300">
              ROADMAP PROGRESS
              {roadmap && !isSample && (
                <Link to="/roadmap" className="ml-3 font-sans text-xs font-semibold tracking-normal text-neon-cyan hover:underline">
                  Open roadmap
                </Link>
              )}
            </h2>
            {roadmap && (
              <span className="text-sm font-semibold text-neon-cyan">{roadmap.overall}% overall</span>
            )}
          </div>
          {roadmap ? (
            <>
              <RoadmapList items={roadmap.milestones} />
              <p className="mt-4 text-xs text-slate-400">
                {roadmap.source === 'ai'
                  ? 'This roadmap was written by AI. Treat links and timelines as suggestions and double-check them.'
                  : 'This roadmap was built from simple rules, not AI.'}
              </p>
              {!isSample && roadmap.source === 'template' && roadmap.milestones.every((m) => m.progress === 0) && (
                <AiActionButton
                  label="Rewrite roadmap with AI"
                  busyLabel="Asking AI… this can take a few seconds"
                  successText="Done. Your roadmap was rewritten by AI."
                  run={() => generateRoadmap(token, dream?.id)}
                  onDone={refresh}
                />
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Your roadmap appears here once you create a dream.
            </p>
          )}
        </GlassCard>

        <GlassCard delay={0.25}>
          <Heading>XP THIS WEEK</Heading>
          <WeeklyChart data={progress.weeklyXp} />
        </GlassCard>

        <GlassCard delay={0.3} className="lg:col-span-2">
          <Heading>ACHIEVEMENTS</Heading>
          <AchievementGrid items={progress.achievements.map((a) => ({ ...a, id: a.key }))} />
        </GlassCard>

        <GlassCard delay={0.35} className="flex flex-col items-center text-center">
          <NovaMascot size={110} />
          <h2 className="mt-2 font-display text-sm font-extrabold tracking-widest text-white">NOVA</h2>
          <p className="mt-1 text-sm text-slate-300">Your AI mentor for next steps and weekly plans.</p>
          <Link to="/nova" className="btn-ghost mt-4 w-full">
            <Bot className="h-5 w-5" aria-hidden />
            Chat with Nova
          </Link>
        </GlassCard>

        <GlassCard delay={0.4} className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xs font-extrabold tracking-[0.2em] text-slate-300">
              RECENT DECISIONS
            </h2>
            {!isSample && (
              <Link to="/decisions" className="text-sm font-semibold text-neon-cyan hover:underline">
                Open simulator
              </Link>
            )}
          </div>
          {scenarios.length ? (
            <ul className="grid gap-4 md:grid-cols-2">
              {scenarios.map((s) => (
                <li key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-white">{s.title}</p>
                  <p className="mt-1 text-sm text-neon-cyan">{s.choice}</p>
                  <p className="mt-1 text-xs text-slate-400">{s.note}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              No decisions yet.{' '}
              <Link to="/decisions" className="font-semibold text-neon-cyan underline">
                Try the life decision simulator
              </Link>
              .
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
