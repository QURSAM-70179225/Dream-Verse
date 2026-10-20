import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard.jsx';
import TextField from '../components/ui/TextField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProgress } from '../context/ProgressContext.jsx';
import { apiRequest } from '../services/api.js';

const DRAFT_KEY = 'dreamverse_create_draft';
const MAX_STORY = 600;

const empty = {
  career: '',
  city: '',
  home: '',
  lifestyle: '',
  skills: '',
  goals: '',
  story: '',
};

const example = {
  career: 'AI engineer',
  city: 'Tokyo',
  home: 'A modern apartment with a view of the city',
  lifestyle: 'Creative and balanced, with time for friends and travel',
  skills: 'Python, machine learning, product design',
  goals: 'Build my own startup, open a small café',
  story:
    'I want to become an AI engineer, live in Tokyo, own a modern apartment, build my own startup, and open a small café.',
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

const questions = [
  { id: 'career', label: '1. What is your dream career?', placeholder: 'e.g. AI engineer' },
  { id: 'city', label: '2. Where do you want to live?', placeholder: 'e.g. Tokyo' },
  {
    id: 'home',
    label: '3. What kind of house or apartment do you dream of?',
    placeholder: 'e.g. A modern apartment with a city view',
  },
  {
    id: 'lifestyle',
    label: '4. What lifestyle do you want?',
    placeholder: 'e.g. Creative, balanced, plenty of travel',
  },
  {
    id: 'skills',
    label: '5. What skills do you want to master?',
    placeholder: 'e.g. Python, machine learning',
  },
  {
    id: 'goals',
    label: '6. What personal goals do you want to achieve?',
    placeholder: 'e.g. Build a startup, open a café',
  },
];

export default function CreateFuture() {
  const { user, token } = useAuth();
  const { refresh } = useProgress();
  const navigate = useNavigate();
  const [form, setForm] = useState(loadDraft);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null); // { type: 'info' | 'error', text }
  const [busy, setBusy] = useState(false);

  // Keep a local draft so nothing is lost on refresh.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      /* storage unavailable */
    }
  }, [form]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.career.trim() && form.story.trim().length < 15) {
      next.career = 'Tell us your dream career, or describe your future in your own words below.';
    }
    if (form.story.length > MAX_STORY) next.story = `Please keep this under ${MAX_STORY} characters.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!validate()) return;

    if (user?.demo) {
      setMessage({
        type: 'info',
        text: 'Generating and saving a DreamVerse needs an account. Create one to continue. Your answers are kept in this browser as a draft.',
      });
      return;
    }

    setBusy(true);
    try {
      await apiRequest('/dreams', { method: 'POST', token, body: form });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* storage unavailable */
      }
      await refresh();
      navigate('/dashboard');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.details?.[0]?.message || err.message,
      });
    } finally {
      setBusy(false);
    }
  };

  const useExample = () => {
    setForm(example);
    setErrors({});
  };

  const clearAll = () => {
    setForm(empty);
    setErrors({});
    setMessage(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="font-display text-xs tracking-[0.3em] text-neon-cyan">NEW DREAMVERSE</p>
        <h1 className="neon-text text-3xl font-extrabold sm:text-4xl">Create Your Future</h1>
        <p className="mt-2 text-slate-300">
          Answer what you like, or just write freely. This is an imaginative simulation, not a prediction
          of your real future.
        </p>
      </header>

      <GlassCard>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {questions.map((q) => (
              <TextField
                key={q.id}
                id={q.id}
                label={q.label}
                placeholder={q.placeholder}
                value={form[q.id]}
                onChange={set(q.id)}
                error={errors[q.id]}
                maxLength={200}
              />
            ))}
          </div>

          <div>
            <TextField
              id="story"
              label="Describe your dream future in your own words…"
              textarea
              rows={5}
              placeholder="I want to become an AI engineer, live in Tokyo, own a modern apartment, build my own startup, and open a small café."
              value={form.story}
              onChange={set('story')}
              error={errors.story}
            />
            <p className="mt-1 text-right text-xs text-slate-400" aria-live="polite">
              {form.story.length}/{MAX_STORY}
            </p>
          </div>

          {message && (
            <p
              role="alert"
              className={`rounded-xl border px-4 py-3 text-sm ${
                message.type === 'error'
                  ? 'border-neon-pink/40 bg-neon-pink/10 text-neon-pink'
                  : 'border-neon-cyan/30 bg-neon-cyan/10 text-slate-100'
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="submit" className="btn-primary" disabled={busy}>
              <Sparkles className="h-5 w-5" aria-hidden />
              {busy ? 'Generating…' : 'Generate My DreamVerse'}
            </button>
            <button type="button" onClick={useExample} className="btn-ghost !py-2.5 text-sm">
              Use an example
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Your answers are saved as a draft in this browser as you type. Generating builds a starter
            profile and roadmap from your answers using simple rules; AI personalization comes later.
          </p>
        </form>
      </GlassCard>
    </div>
  );
}
