import { useEffect } from 'react';
import { PartyPopper, X } from 'lucide-react';
import { useProgress } from '../../context/ProgressContext.jsx';

// Celebrates a new level. Appears wherever the level went up and hides itself after a few seconds.
export default function LevelUpNotice({ className = '' }) {
  const { levelUp, dismissLevelUp } = useProgress();

  useEffect(() => {
    if (!levelUp) return undefined;
    const t = setTimeout(dismissLevelUp, 9000);
    return () => clearTimeout(t);
  }, [levelUp, dismissLevelUp]);

  if (!levelUp) return <div aria-live="polite" />;
  return (
    <div aria-live="polite" className={className}>
      <div className="flex items-center gap-3 rounded-2xl border border-amber-300/50 bg-amber-300/10 px-4 py-3 text-sm text-amber-100 shadow-lg backdrop-blur">
        <PartyPopper className="h-5 w-5 shrink-0" aria-hidden />
        <p className="flex-1">
          <strong>Level up!</strong> You reached level {levelUp.level}: <strong>{levelUp.title}</strong>. New avatar
          styles may have unlocked.
        </p>
        <button
          type="button"
          onClick={dismissLevelUp}
          aria-label="Dismiss"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg hover:bg-white/10"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
