import { Bot, FlaskConical } from 'lucide-react';

// Always tells the truth about where a reply comes from.
const MODES = {
  live: { icon: Bot, text: 'AI-powered', cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
  demo: {
    icon: FlaskConical,
    text: 'Demo mode · scripted replies, no AI connected',
    cls: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  },
};

export default function AiBadge({ mode, demoText }) {
  const base = MODES[mode];
  if (!base) return null;
  const m = mode === 'demo' && demoText ? { ...base, text: demoText } : base;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${m.cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {m.text}
    </span>
  );
}
