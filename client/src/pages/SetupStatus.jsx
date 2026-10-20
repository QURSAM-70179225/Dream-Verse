import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { getHealth } from '../services/api.js';

function StatusRow({ label, state, detail }) {
  const Icon = state === 'ok' ? CheckCircle2 : state === 'error' ? XCircle : Loader2;
  const color =
    state === 'ok' ? 'text-emerald-400' : state === 'error' ? 'text-neon-pink' : 'text-neon-cyan';
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color} ${state === 'loading' ? 'animate-spin' : ''}`} aria-hidden />
        <span className="font-medium">{label}</span>
      </span>
      <span className="text-sm text-slate-300">{detail}</span>
    </li>
  );
}

export default function SetupStatus() {
  const [health, setHealth] = useState({ state: 'loading' });

  useEffect(() => {
    getHealth()
      .then((data) => setHealth({ state: 'ok', data }))
      .catch((err) => setHealth({ state: 'error', message: err.message }));
  }, []);

  const api = health.state;
  const db =
    health.state === 'ok' ? (health.data.database === 'connected' ? 'ok' : 'error') : health.state;
  const ai = health.state === 'ok' ? 'ok' : health.state;

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass w-full max-w-xl p-8 shadow-neon-purple"
      >
        <div className="mb-2 flex items-center gap-2 text-neon-cyan">
          <Sparkles className="h-5 w-5" aria-hidden />
          <span className="font-display text-xs tracking-[0.3em]">PHASE 1 · SETUP</span>
        </div>
        <h1 className="neon-text text-4xl font-extrabold sm:text-5xl">DREAMVERSE AI</h1>
        <p className="mt-3 text-slate-300">
          Your Dreams Deserve a World of Their Own. The foundation is running — here is its status.
        </p>

        <ul className="mt-6 space-y-3" aria-label="System status">
          <StatusRow
            label="API"
            state={api}
            detail={api === 'ok' ? 'online' : api === 'error' ? health.message : 'checking…'}
          />
          <StatusRow
            label="Database"
            state={db}
            detail={
              health.state === 'ok'
                ? health.data.database
                : health.state === 'error'
                  ? 'unavailable'
                  : 'checking…'
            }
          />
          <StatusRow
            label="AI mode"
            state={ai}
            detail={
              health.state === 'ok'
                ? health.data.aiMode === 'demo'
                  ? 'demo mode (no AI credentials set)'
                  : 'live provider'
                : health.state === 'error'
                  ? 'unknown'
                  : 'checking…'
            }
          />
        </ul>

        <p className="mt-6 text-xs text-slate-400">
          DreamVerse is an imaginative simulation. Outcomes are hypothetical, not predictions.
        </p>
      </motion.section>
    </div>
  );
}
