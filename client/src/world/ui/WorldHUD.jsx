import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, DoorOpen, Hand, HelpCircle, Moon, Palette, Sun } from 'lucide-react';
import Joystick from './Joystick.jsx';

const TIME = {
  day: { icon: Sun, label: 'Day' },
  night: { icon: Moon, label: 'Night' },
  auto: { icon: Clock, label: 'Auto cycle' },
};

function IconButton({ onClick, label, children, pressed }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className="pointer-events-auto grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-midnight-900/70 text-slate-100 backdrop-blur transition hover:border-neon-purple/60 hover:bg-neon-purple/20"
    >
      {children}
    </button>
  );
}

// Everything drawn on top of the 3D view. The wrapper ignores pointer events so dragging on the
// scene still turns the camera; only the controls themselves are clickable.
export default function WorldHUD({
  locationName,
  zone,
  timeMode,
  onCycleTime,
  onAvatar,
  onHelp,
  near,
  onInteract,
  touch,
  input,
  notice,
  avatarOpen,
}) {
  const Time = TIME[timeMode].icon;
  const PromptIcon = near?.kind === 'portal' ? DoorOpen : Hand;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
      <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/dashboard"
            aria-label="Back to dashboard"
            className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-midnight-900/70 backdrop-blur hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 rounded-xl border border-white/10 bg-midnight-900/70 px-3 py-1.5 backdrop-blur">
            <p className="truncate font-display text-xs font-extrabold tracking-widest text-white">{locationName}</p>
            {zone && <p className="truncate text-xs text-neon-cyan">{zone}</p>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <IconButton onClick={onCycleTime} label={`Time of day: ${TIME[timeMode].label}. Click to change.`}>
            <Time className="h-5 w-5" aria-hidden />
          </IconButton>
          <IconButton onClick={onAvatar} label="Customize your avatar" pressed={avatarOpen}>
            <Palette className="h-5 w-5" aria-hidden />
          </IconButton>
          <IconButton onClick={onHelp} label="Show controls">
            <HelpCircle className="h-5 w-5" aria-hidden />
          </IconButton>
        </div>
      </div>

        {notice && (
          <p className="pointer-events-auto mx-auto w-fit max-w-md rounded-xl border border-neon-cyan/30 bg-midnight-900/80 px-4 py-2 text-center text-xs text-slate-100 backdrop-blur">
            {notice}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="w-32">{touch && <Joystick input={input} />}</div>

        <div className="flex min-w-0 flex-1 justify-center">
          {near && (
            <button
              type="button"
              onClick={onInteract}
              className="pointer-events-auto flex max-w-full items-center gap-3 rounded-2xl border border-neon-purple/60 bg-midnight-900/85 px-4 py-3 text-left shadow-neon-purple backdrop-blur transition hover:bg-neon-purple/30"
            >
              <PromptIcon className="h-5 w-5 shrink-0 text-neon-cyan" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">{near.label}</span>
                <span className="block text-xs text-slate-300">
                  {touch ? 'Tap to ' : 'Press E or click to '}
                  {near.kind === 'portal' ? 'go through' : 'look'}
                </span>
              </span>
            </button>
          )}
        </div>

        <div className="w-32" aria-hidden />
      </div>
    </div>
  );
}
