import { Flame } from 'lucide-react';

// The daily streak in one line. `streak` comes from the server: { count, best, doneToday, todayBonus }.
export default function StreakChip({ streak, compact = false }) {
  if (!streak) return null;
  const { count, doneToday, todayBonus } = streak;
  const bonus = todayBonus > 0 ? ` (+${todayBonus} XP)` : '';
  let text;
  if (doneToday) text = `Day ${count} streak · done for today`;
  else if (count > 0) text = `Day ${count} streak · keep it going today${bonus}`;
  else text = `Start a streak today${bonus}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        doneToday || count > 0
          ? 'border-orange-400/40 bg-orange-400/10 text-orange-200'
          : 'border-white/15 bg-white/5 text-slate-300'
      }`}
    >
      <Flame className="h-3.5 w-3.5" aria-hidden />
      {compact ? (doneToday || count > 0 ? `Day ${count}` : 'No streak') : text}
      {compact && <span className="sr-only">{text}</span>}
    </span>
  );
}
