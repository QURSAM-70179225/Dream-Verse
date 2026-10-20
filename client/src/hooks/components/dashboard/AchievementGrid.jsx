import { Lock, Star } from 'lucide-react';

export default function AchievementGrid({ items }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((a) => (
        <li
          key={a.id}
          className={`rounded-xl border p-3 text-center ${
            a.earned
              ? 'border-neon-purple/40 bg-neon-purple/10'
              : 'border-white/10 bg-white/[0.03] opacity-70'
          }`}
        >
          <span
            className={`mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full ${
              a.earned ? 'bg-dream-gradient text-white shadow-neon-purple' : 'bg-white/10 text-slate-400'
            }`}
          >
            {a.earned ? <Star className="h-5 w-5" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
          </span>
          <p className="text-xs font-semibold text-white">{a.title}</p>
          <p className="text-[11px] text-slate-400">
            {a.xp} XP · <span className="sr-only">{a.earned ? 'earned' : 'locked'}</span>
            <span aria-hidden>{a.earned ? 'earned' : 'locked'}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
