import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import AuthShell from '../components/ui/AuthShell.jsx';
import TextField from '../components/ui/TextField.jsx';
import { resetPassword } from '../services/account.js';
import { PASSWORD_HINT, passwordProblem } from '../utils/password.js';

export default function ResetPassword() {
  const [params, setParams] = useSearchParams();
  // Keep the token in memory and take it out of the address bar, history and screenshots.
  const [token] = useState(() => params.get('token') || '');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (params.has('token')) setParams({}, { replace: true });
  }, [params, setParams]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const next = {};
    const problem = passwordProblem(form.password);
    if (problem) next.password = problem;
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await resetPassword(token, form.password);
      setDone(true);
    } catch (err) {
      setFormError(err.details?.[0]?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You're all set." footer={null}>
        <div role="status" className="space-y-4 text-sm text-slate-200">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden="true" />
          <p>Your password was changed and any other devices were signed out. Log in with your new password.</p>
          <Link to="/login" className="btn-primary w-full">
            Go to log in
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (!token) {
    return (
      <AuthShell
        title="Link incomplete"
        subtitle="This page needs the link from your reset email."
        footer={
          <Link to="/login" className="text-neon-cyan hover:underline">
            Back to log in
          </Link>
        }
      >
        <p className="mb-4 text-sm text-slate-300">
          Open the link from the email again, or ask for a new one.
        </p>
        <Link to="/forgot-password" className="btn-primary w-full">
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something you haven't used elsewhere."
      footer={
        <Link to="/login" className="text-neon-cyan hover:underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint={PASSWORD_HINT}
        />
        <TextField
          id="confirm"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
        />
        {formError && (
          <div role="alert" className="rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-4 py-3 text-sm text-neon-pink">
            <p>{formError}</p>
            <Link to="/forgot-password" className="mt-1 inline-block underline">
              Request a new link
            </Link>
          </div>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </AuthShell>
  );
}
