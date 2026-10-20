import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AuthShell from '../components/ui/AuthShell.jsx';
import TextField from '../components/ui/TextField.jsx';
import { requestPasswordReset } from '../services/account.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // the server's answer, once the form was sent

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      setDone(await requestPasswordReset(email.trim()));
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <Link to="/login" className="text-neon-cyan hover:underline">
      Back to log in
    </Link>
  );

  if (done) {
    return (
      <AuthShell title="Check your email" subtitle="One more step to get back in." footer={footer}>
        <div role="status" className="space-y-3 text-sm text-slate-200">
          <Mail className="h-8 w-8 text-neon-cyan" aria-hidden="true" />
          <p>{done.message}</p>
          <p className="text-slate-400">
            Nothing arrived? Look in your spam folder, wait a minute, then try again. You can ask for a
            new link once a minute.
          </p>
          {done.delivery === 'none' && (
            <p className="rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-4 py-3 text-slate-200">
              This site is not set up to send email yet, so no message was sent. Please contact the
              site owner to reset your password.
            </p>
          )}
          {done.delivery === 'console' && (
            <p className="rounded-xl border border-neon-purple/40 bg-neon-purple/10 px-4 py-3 text-slate-200">
              Developer note: email is not set up on this server, so nothing was sent. If the address
              has an account, the reset link was printed in the terminal where the server is running.
            </p>
          )}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      footer={footer}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  );
}
