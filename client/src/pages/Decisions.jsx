import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, Loader2, PenLine } from 'lucide-react';
import AiBadge from '../components/ui/AiBadge.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import Loader from '../components/ui/Loader.jsx';
import NovaMascot from '../components/ui/NovaMascot.jsx';
import RewardNotice from '../components/ui/RewardNotice.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProgress } from '../context/ProgressContext.jsx';
import { getHealth } from '../services/api.js';
import { getHistory, makeDecision } from '../services/simulation.js';

const NO_XP = {
  repeat: 'No XP this time: you have already explored this exact scenario. Try a new one!',
  'daily-cap': 'No XP this time: you reached today\'s limit of XP-earning decisions. You can still keep exploring.',
};

const dateText = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const SOURCE_TEXT = {
  ai: 'Written by AI',
  template: 'Built-in template outcome (no AI connected)',
};

function Outcome({ decision }) {
  const o = decision.outcome;
  return (
    <div className="space-y-3">
      <h3 className="text-xl font-extrabold text-white">{o.headline}</h3>
      <p className="leading-relaxed text-slate-100">{o.story}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {o.upside && (
          <div className="rounded-xl bg-emerald-400/10 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Possible upside</dt>
            <dd className="mt-1 text-slate-100">{o.upside}</dd>
          </div>
        )}
        {o.challenge && (
          <div className="rounded-xl bg-amber-400/10 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-amber-200">Possible challenge</dt>
            <dd className="mt-1 text-slate-100">{o.challenge}</dd>
          </div>
        )}
      </dl>
      {o.nextStep && (
        <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-100">
          <strong className="text-neon-cyan">Try this week:</strong> {o.nextStep}
        </p>
      )}
      <p className="text-xs text-slate-400">
        {SOURCE_TEXT[decision.source]}. An imaginative story, not a prediction of your real future.
      </p>
    </div>
  );
}

export default function Decisions() {
  const { user, token } = useAuth();
  const { progress, loading, error, isSample, refresh } = useProgress();
  const [mode, setMode] = useState('');
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null); // { scenarioId } or { title, optionA, optionB }
  const [custom, setCustom] = useState({ title: '', optionA: '', optionB: '' });
  const [writing, setWriting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    getHealth()
      .then((h) => setMode(h.aiMode))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isSample) return;
    getHistory(token, 10)
      .then((d) => setHistory(d.decisions))
      .catch(() => {});
  }, [isSample, token]);

  if (isSample || user?.demo) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <NovaMascot size={120} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-extrabold text-white">Life decision simulator</h1>
        <p className="mt-3 text-slate-300">
          Choose between two paths and see one imagined way your life might unfold. Create a free account to
          try it with your own dream.
        </p>
        <Link to="/register" className="btn-primary mt-6">
          Create an account
        </Link>
      </div>
    );
  }

  if (loading && !progress) return <Loader label="Loading the simulator" />;
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

  const dream = progress?.dream;
  if (!dream) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-extrabold text-white">Life decision simulator</h1>
        <p className="mt-3 text-slate-300">Create a dream first, then explore the big choices it might bring.</p>
        <Link to="/create" className="btn-primary mt-6">
          Create Your Future
        </Link>
      </div>
    );
  }

  const scenarios = dream.profile?.scenarios || [];
  const active = selected && (selected.scenarioId ? scenarios.find((s) => s.id === selected.scenarioId) : selected);

  const pick = (s) => {
    setSelected({ scenarioId: s.id });
    setWriting(false);
    setResult(null);
    setFormError('');
  };

  const useCustom = (e) => {
    e.preventDefault();
    const t = {
      title: custom.title.trim(),
      optionA: custom.optionA.trim(),
      optionB: custom.optionB.trim(),
    };
    if (!t.title || !t.optionA || !t.optionB) {
      setFormError('Fill in the question and both options.');
      return;
    }
    if (t.optionA.toLowerCase() === t.optionB.toLowerCase()) {
      setFormError('The two options need to be different.');
      return;
    }
    setFormError('');
    setSelected(t);
    setResult(null);
  };

  const choose = async (choice) => {
    if (!active || busy) return;
    setBusy(true);
    setFormError('');
    try {
      const body = selected.scenarioId
        ? { scenarioId: selected.scenarioId, choice }
        : { title: selected.title, optionA: selected.optionA, optionB: selected.optionB, choice };
      const res = await makeDecision(token, body);
      setResult(res);
      setMode(res.mode);
      setHistory((h) => [res.decision, ...h].slice(0, 10));
      // XP, level, achievements and the dashboard history all come from the server.
      refresh({ silent: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">What if…</p>
          <h1 className="text-3xl font-extrabold text-white">Life decision simulator</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-300">
            Pick a decision, choose a path, and read one imagined way it could unfold. It is a story, not a
            forecast.
          </p>
        </div>
        <AiBadge mode={mode} demoText="Demo mode · built-in outcomes, no AI connected" />
      </header>

      <GlassCard>
        <h2 className="mb-3 font-display text-xs font-extrabold tracking-[0.2em] text-slate-300">1 · PICK A DECISION</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {scenarios.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => pick(s)}
                aria-pressed={selected?.scenarioId === s.id}
                className={`h-full w-full rounded-xl border p-4 text-left transition hover:border-neon-purple/60 ${
                  selected?.scenarioId === s.id ? 'border-neon-purple bg-neon-purple/15' : 'border-white/10 bg-white/5'
                }`}
              >
                <GitBranch className="mb-2 h-5 w-5 text-neon-cyan" aria-hidden />
                <span className="block font-semibold text-white">{s.title}</span>
                <span className="mt-1 block text-xs text-slate-400">
                  {s.optionA} · or · {s.optionB}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                setWriting((w) => !w);
                setResult(null);
              }}
              aria-expanded={writing}
              className="h-full w-full rounded-xl border border-dashed border-white/20 p-4 text-left transition hover:border-neon-cyan/60"
            >
              <PenLine className="mb-2 h-5 w-5 text-neon-cyan" aria-hidden />
              <span className="block font-semibold text-white">Write your own</span>
              <span className="mt-1 block text-xs text-slate-400">Describe a decision you are really facing.</span>
            </button>
          </li>
        </ul>

        {writing && (
          <form onSubmit={useCustom} className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <label className="block text-sm text-slate-200">
              The decision
              <input
                value={custom.title}
                onChange={(e) => setCustom({ ...custom, title: e.target.value })}
                maxLength={200}
                placeholder="Should I move abroad for a job?"
                className="mt-1 w-full rounded-lg border border-white/15 bg-midnight-900/70 px-3 py-2 text-white focus:border-neon-cyan focus:outline-none"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-200">
                Option A
                <input
                  value={custom.optionA}
                  onChange={(e) => setCustom({ ...custom, optionA: e.target.value })}
                  maxLength={300}
                  placeholder="Take the job abroad"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-midnight-900/70 px-3 py-2 text-white focus:border-neon-cyan focus:outline-none"
                />
              </label>
              <label className="block text-sm text-slate-200">
                Option B
                <input
                  value={custom.optionB}
                  onChange={(e) => setCustom({ ...custom, optionB: e.target.value })}
                  maxLength={300}
                  placeholder="Stay and grow here"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-midnight-900/70 px-3 py-2 text-white focus:border-neon-cyan focus:outline-none"
                />
              </label>
            </div>
            <button type="submit" className="btn-ghost !py-2 text-sm">
              Use this decision
            </button>
          </form>
        )}
      </GlassCard>

      {active && (
        <GlassCard>
          <h2 className="mb-1 font-display text-xs font-extrabold tracking-[0.2em] text-slate-300">2 · CHOOSE A PATH</h2>
          <p className="mb-4 text-lg font-semibold text-white">{active.title}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {['A', 'B'].map((key) => (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => choose(key)}
                className="rounded-xl border border-white/15 bg-white/5 p-4 text-left transition hover:border-neon-purple/70 hover:bg-neon-purple/15 disabled:cursor-wait disabled:opacity-60"
              >
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-neon-magenta">Option {key}</span>
                <span className="block text-white">{key === 'A' ? active.optionA : active.optionB}</span>
              </button>
            ))}
          </div>
          {busy && (
            <p role="status" className="mt-4 flex items-center gap-2 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Imagining how this could unfold… this can take a few seconds.
            </p>
          )}
        </GlassCard>
      )}

      {formError && (
        <p role="alert" className="rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-4 py-3 text-sm text-neon-pink">
          {formError}
        </p>
      )}

      {result && (
        <GlassCard>
          <h2 className="mb-3 font-display text-xs font-extrabold tracking-[0.2em] text-slate-300">
            3 · ONE POSSIBLE PATH: {result.decision.choice.toUpperCase()}
          </h2>
          <Outcome decision={result.decision} />
          <div className="mt-4">
            <RewardNotice
              xpGained={result.xpGained}
              newAchievements={result.newAchievements}
              streak={result.streak}
              note={result.noXpReason ? NO_XP[result.noXpReason] : ''}
            />
          </div>
          <p className="mt-4 text-sm text-slate-300">
            Curious about the other path? Choose the other option above to compare.
          </p>
        </GlassCard>
      )}

      <GlassCard>
        <h2 className="mb-3 font-display text-xs font-extrabold tracking-[0.2em] text-slate-300">YOUR RECENT DECISIONS</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing yet. Your choices are saved here.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((d) => (
              <li key={d.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <details>
                  <summary className="cursor-pointer list-none">
                    <span className="block font-semibold text-white">{d.scenarioTitle}</span>
                    <span className="mt-0.5 block text-sm text-neon-cyan">You chose: {d.choice}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {dateText(d.createdAt)} · {d.outcome.headline} · tap to read
                    </span>
                  </summary>
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <Outcome decision={d} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
