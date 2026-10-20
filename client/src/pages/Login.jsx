import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/ui/AuthShell.jsx';
import TextField from '../components/ui/TextField.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { user, login, startDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const redirectTo = location.state?.from || '/dashboard';
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.password) next.password = 'Enter your password.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;
    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.details?.[0]?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const onDemo = () => {
    startDemo();
    navigate('/dashboard', { replace: true });
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue building your DreamVerse."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="text-neon-cyan hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
        />
        <p className="-mt-2 text-right text-sm">
          <Link to="/forgot-password" className="text-neon-cyan hover:underline">
            Forgot your password?
          </Link>
        </p>
        {formError && (
          <p role="alert" className="rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-4 py-3 text-sm text-neon-pink">
            {formError}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-white/10" />
        or
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <button type="button" onClick={onDemo} className="btn-ghost w-full">
        Explore with sample data
      </button>
    </AuthShell>
  );
}
