import { useEffect, useRef } from 'react';
import { Lock, RotateCcw, Shuffle, X } from 'lucide-react';
import {
  ACCENT,
  BOTTOM,
  DEFAULT_LOOK,
  HAIR,
  HAIR_STYLES,
  SKIN,
  TOP,
  randomLook,
  requiredLevel,
  unlockCounts,
} from '../data/avatar.js';

function Swatches({ label, field, options, value, onPick, level }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((c) => {
          const need = requiredLevel(field, c);
          const locked = level < need;
          return (
            <button
              key={c}
              type="button"
              disabled={locked}
              aria-label={locked ? `${label} ${c}, unlocks at level ${need}` : `${label} ${c}`}
              title={locked ? `Unlocks at level ${need}` : undefined}
              aria-pressed={value === c}
              onClick={() => onPick(c)}
              className={`relative grid h-9 w-9 place-items-center rounded-full border-2 transition ${
                value === c ? 'scale-110 border-white shadow-neon-purple' : 'border-white/20 hover:border-white/60'
              } ${locked ? 'cursor-not-allowed opacity-40' : ''}`}
              style={{ backgroundColor: c }}
            >
              {locked && <Lock className="h-4 w-4 text-white drop-shadow" aria-hidden />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// Changes apply to the avatar immediately and are remembered on this device. Some options unlock
// as the user levels up.
export default function AvatarCustomizer({ look, onChange, onClose, level = 1 }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const set = (key) => (value) => onChange({ ...look, [key]: value });
  const { open, total } = unlockCounts(level);

  return (
    <aside
      aria-labelledby="avatar-title"
      className="pointer-events-auto absolute bottom-0 right-0 top-0 z-30 flex w-full max-w-sm flex-col border-l border-white/10 bg-midnight-950/90 backdrop-blur-xl sm:top-16"
    >
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <h2 id="avatar-title" className="font-display text-sm font-extrabold tracking-widest text-white">
          YOUR AVATAR
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close avatar editor"
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 hover:bg-white/10"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
          Level {level}: <strong className="text-white">{open}</strong> of {total} style options unlocked.
          {open < total && ' Earn XP to unlock the rest (look for the lock icons).'}
        </p>
        <Swatches label="Skin" field="skin" options={SKIN} value={look.skin} onPick={set('skin')} level={level} />
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Hair style</legend>
          <div className="flex flex-wrap gap-2">
            {HAIR_STYLES.map((h) => {
              const need = requiredLevel('hairStyle', h.id);
              const locked = level < need;
              return (
                <button
                  key={h.id}
                  type="button"
                  disabled={locked}
                  aria-pressed={look.hairStyle === h.id}
                  onClick={() => set('hairStyle')(h.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition ${
                    look.hairStyle === h.id
                      ? 'border-neon-purple bg-neon-purple/30 text-white'
                      : 'border-white/15 text-slate-300 hover:bg-white/5'
                  } ${locked ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {locked && <Lock className="h-3.5 w-3.5" aria-hidden />}
                  {h.label}
                  {locked && <span className="text-[11px] text-slate-400">Lv {need}</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Swatches label="Hair color" field="hair" options={HAIR} value={look.hair} onPick={set('hair')} level={level} />
        <Swatches label="Top" field="top" options={TOP} value={look.top} onPick={set('top')} level={level} />
        <Swatches label="Bottom" field="bottom" options={BOTTOM} value={look.bottom} onPick={set('bottom')} level={level} />
        <Swatches label="Accent glow" field="accent" options={ACCENT} value={look.accent} onPick={set('accent')} level={level} />
      </div>

      <div className="space-y-3 border-t border-white/10 p-4">
        <div className="flex gap-3">
          <button type="button" className="btn-ghost flex-1 !py-2.5 text-sm" onClick={() => onChange(randomLook(Math.random, level))}>
            <Shuffle className="h-4 w-4" aria-hidden /> Random
          </button>
          <button
            type="button"
            className="btn-ghost flex-1 !py-2.5 text-sm"
            onClick={() => onChange({ ...DEFAULT_LOOK })}
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Reset
          </button>
        </div>
        <p className="text-xs text-slate-400">Saved on this device only.</p>
      </div>
    </aside>
  );
}
