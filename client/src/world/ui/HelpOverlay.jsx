import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const rows = [
  ['W A S D / arrow keys', 'Walk (hold Shift to run)'],
  ['Drag on the scene, or Q / R', 'Turn the camera'],
  ['Scroll', 'Zoom in and out'],
  ['E (or F, or tap the prompt)', 'Interact with what is nearby'],
  ['Esc', 'Close a panel'],
];

export default function HelpOverlay({ touch, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-midnight-950/70 p-4 backdrop-blur-sm">
      <section role="dialog" aria-labelledby="world-help-title" className="glass w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="world-help-title" className="font-display text-sm font-extrabold tracking-widest text-white">
            HOW TO EXPLORE
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 hover:bg-white/10"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {touch ? (
          <ul className="mt-4 space-y-3 text-sm text-slate-200">
            <li>Use the stick (bottom left) to walk.</li>
            <li>Drag anywhere else on the scene to turn the camera.</li>
            <li>Tap the glowing prompt (or the Interact button) when something is nearby.</li>
          </ul>
        ) : (
          <dl className="mt-4 space-y-3 text-sm">
            {rows.map(([keys, what]) => (
              <div key={keys} className="flex flex-wrap justify-between gap-x-4">
                <dt className="font-semibold text-neon-cyan">{keys}</dt>
                <dd className="text-slate-200">{what}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-5 text-xs text-slate-400">
          Look for the floating diamonds. Gold ones are doors, pink ones can be examined. Everything here is an
          imaginative simulation, not a prediction.
        </p>
        <button type="button" onClick={onClose} className="btn-primary mt-4 w-full">
          Start exploring
        </button>
      </section>
    </div>
  );
}
