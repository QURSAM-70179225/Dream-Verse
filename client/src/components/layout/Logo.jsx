import { Link } from 'react-router-dom';

export default function Logo({ to = '/' }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-cyan"
      aria-label="DreamVerse AI home"
    >
      <span
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-xl bg-dream-gradient font-display text-sm font-extrabold text-white shadow-neon-purple"
      >
        DV
      </span>
      <span className="font-display text-sm font-extrabold tracking-[0.2em] text-white">
        DREAMVERSE <span className="text-neon-cyan">AI</span>
      </span>
    </Link>
  );
}
