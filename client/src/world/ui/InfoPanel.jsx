import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

// Appears when the player interacts with an object. The world is paused while it is open.
export default function InfoPanel({ info, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, [info]);

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 sm:bottom-6">
      <section
        role="dialog"
        aria-labelledby="world-info-title"
        className="glass w-full max-w-md p-5 shadow-neon-purple"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="world-info-title" className="font-display text-sm font-extrabold tracking-widest text-white">
            {info.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-200 hover:bg-white/10"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-200">
          {info.lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        {info.cta && (
          <Link to={info.cta.to} className="btn-primary mt-4 !py-2 text-sm">
            {info.cta.label}
          </Link>
        )}
      </section>
    </div>
  );
}
