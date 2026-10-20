import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';

/**
 * A button that runs one AI request (which can take several seconds), shows progress, and reports
 * the outcome in plain words. `run` must resolve to the server response.
 */
export default function AiActionButton({ label, busyLabel, successText, run, onDone }) {
  const [state, setState] = useState({ busy: false, message: '', error: '' });

  const click = async () => {
    setState({ busy: true, message: '', error: '' });
    try {
      const res = await run();
      // In demo mode the server changes nothing and says so; show that message as-is.
      setState({
        busy: false,
        message: res.updated ? successText : res.message || 'AI is not connected, so nothing changed.',
        error: '',
      });
      if (res.updated) await onDone?.();
    } catch (err) {
      setState({ busy: false, message: '', error: err.message || 'Something went wrong.' });
    }
  };

  return (
    <div className="mt-4">
      <button type="button" onClick={click} disabled={state.busy} aria-busy={state.busy} className="btn-ghost !py-2 text-sm disabled:cursor-wait disabled:opacity-70">
        {state.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Wand2 className="h-4 w-4" aria-hidden />}
        {state.busy ? busyLabel : label}
      </button>
      <div aria-live="polite" className="mt-2 text-xs">
        {state.message && <p className="text-emerald-300">{state.message}</p>}
        {state.error && (
          <p role="alert" className="text-neon-pink">
            {state.error}
          </p>
        )}
      </div>
    </div>
  );
}
