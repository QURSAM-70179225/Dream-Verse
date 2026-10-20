import { Flame, Sparkles, Star } from 'lucide-react';

// Shows what the server just awarded: XP and any new achievements. Renders nothing when there is
// no reward, and is a polite live region so screen readers hear it.
export default function RewardNotice({ xpGained = 0, newAchievements = [], note = '', streak = null }) {
  const streakCounted = Boolean(streak?.counted);
  const hasReward = xpGained > 0 || newAchievements.length > 0 || streakCounted;
  return (
    <div aria-live="polite" className="min-h-0">
      {(hasReward || note) && (
        <div className="space-y-2 rounded-xl border border-neon-purple/40 bg-neon-purple/10 px-4 py-3 text-sm">
          {xpGained > 0 && (
            <p className="flex items-center gap-2 font-semibold text-white">
              <Sparkles className="h-4 w-4 text-neon-cyan" aria-hidden />+{xpGained} XP
            </p>
          )}
          {streakCounted && (
            <p className="flex items-center gap-2 text-orange-200">
              <Flame className="h-4 w-4" aria-hidden />
              Day {streak.count} streak{streak.xpGained > 0 ? `: +${streak.xpGained} XP bonus (included above)` : ''}
            </p>
          )}
          {newAchievements.map((a) => (
            <p key={a.key} className="flex items-center gap-2 text-amber-200">
              <Star className="h-4 w-4" aria-hidden />
              Achievement unlocked: <strong>{a.title}</strong> (+{a.xp} XP)
            </p>
          ))}
          {note && <p className="text-xs text-slate-300">{note}</p>}
        </div>
      )}
    </div>
  );
}
