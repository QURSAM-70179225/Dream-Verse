import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Send, Trash2 } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard.jsx';
import Loader from '../components/ui/Loader.jsx';
import NovaMascot from '../components/ui/NovaMascot.jsx';
import AiBadge from '../components/ui/AiBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { clearConversation, getConversation, sendChat } from '../services/ai.js';

const MAX = 1000;
const SUGGESTIONS = ['What should I do next?', 'Plan my week', 'I feel stuck. Help me start small.'];

const TAGS = {
  demo: 'Demo reply · not an AI model',
  safety: 'Support message',
};

function Bubble({ message }) {
  const mine = message.role === 'user';
  return (
    <li className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
          mine
            ? 'rounded-br-md bg-neon-purple/30 text-white'
            : 'rounded-bl-md border border-white/10 bg-white/5 text-slate-100'
        }`}
      >
        <span className="sr-only">{mine ? 'You: ' : 'Nova: '}</span>
        {message.content}
        {!mine && TAGS[message.mode] && (
          <span className="mt-2 block text-[11px] uppercase tracking-wider text-slate-400">{TAGS[message.mode]}</span>
        )}
      </div>
    </li>
  );
}

export default function Nova() {
  const { user, token } = useAuth();
  const isSample = Boolean(user?.demo);

  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState('');
  const [hasDream, setHasDream] = useState(true);
  const [loading, setLoading] = useState(!isSample);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isSample) return undefined;
    let cancelled = false;
    getConversation(token)
      .then((data) => {
        if (cancelled) return;
        setMessages(data.messages);
        setMode(data.mode);
        setHasDream(data.hasDream);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSample, token]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, sending]);

  const send = useCallback(
    async (raw) => {
      const message = raw.trim();
      if (!message || sending) return;
      setError('');
      setSending(true);
      setText('');
      setMessages((m) => [...m, { role: 'user', content: message, at: new Date().toISOString() }]);
      try {
        const res = await sendChat(token, message);
        setMode((current) => (res.mode === 'live' || res.mode === 'demo' ? res.mode : current));
        setMessages((m) => [...m, res.reply]);
      } catch (err) {
        // Nothing was saved on the server, so take the message back out and let the user retry.
        setMessages((m) => m.slice(0, -1));
        setText(message);
        setError(err.message);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [sending, token]
  );

  const onSubmit = (e) => {
    e.preventDefault();
    send(text);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(text);
    }
  };

  const clear = async () => {
    setConfirmClear(false);
    try {
      await clearConversation(token);
      setMessages([]);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  if (isSample) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <NovaMascot size={140} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-extrabold text-white">Chat with Nova</h1>
        <p className="mt-3 text-slate-300">
          You are viewing sample data. Create a free account so Nova can see your own dream and roadmap and
          answer you.
        </p>
        <Link to="/register" className="btn-primary mt-6">
          Create an account
        </Link>
      </div>
    );
  }

  if (loading) return <Loader label="Waking Nova up" />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <NovaMascot size={64} />
          <div>
            <h1 className="font-display text-lg font-extrabold tracking-widest text-white">NOVA</h1>
            <p className="text-sm text-slate-300">Your AI mentor for next steps and weekly plans.</p>
          </div>
        </div>
        <AiBadge mode={mode} />
      </header>

      {!hasDream && (
        <p className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 px-4 py-3 text-sm text-slate-200">
          You have not created a dream yet, so Nova can only give general guidance.{' '}
          <Link to="/create" className="font-semibold text-neon-cyan underline">
            Create Your Future
          </Link>{' '}
          to unlock advice based on your roadmap.
        </p>
      )}

      <GlassCard className="flex flex-col !p-0">
        <ul
          ref={listRef}
          role="log"
          aria-live="polite"
          aria-label="Conversation with Nova"
          className="flex h-[52vh] min-h-[320px] flex-col gap-3 overflow-y-auto p-4"
        >
          {messages.length === 0 && !sending && (
            <li className="m-auto max-w-sm text-center text-sm text-slate-400">
              Say hello! Ask what to do next, how to plan your week, or how to get unstuck.
            </li>
          )}
          {messages.map((m, i) => (
            <Bubble key={`${m.at}-${i}`} message={m} />
          ))}
          {sending && (
            <li className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Nova is thinking…
            </li>
          )}
        </ul>

        {error && (
          <p role="alert" className="mx-4 mb-2 rounded-lg border border-neon-pink/40 bg-neon-pink/10 px-3 py-2 text-sm text-neon-pink">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={sending}
              onClick={() => send(s)}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:border-neon-purple/60 hover:bg-neon-purple/20 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-white/10 p-3">
          <label htmlFor="nova-input" className="sr-only">
            Message Nova
          </label>
          <textarea
            id="nova-input"
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={MAX}
            placeholder="Ask Nova anything about your next steps…"
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/15 bg-midnight-900/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-neon-cyan focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label="Send message"
            className="btn-primary !px-4 !py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-5 w-5" aria-hidden />
          </button>
        </form>
      </GlassCard>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <p className="max-w-xl">
          Nova is an AI mentor. Its ideas are imaginative guidance, not predictions or professional medical,
          legal or financial advice.
          {text.length > MAX - 100 && <span className="ml-2 text-amber-300">{MAX - text.length} characters left</span>}
        </p>
        {messages.length > 0 &&
          (confirmClear ? (
            <span className="flex items-center gap-2">
              Clear this conversation?
              <button type="button" onClick={clear} className="rounded-lg border border-neon-pink/50 px-3 py-1.5 text-neon-pink hover:bg-neon-pink/10">
                Yes, clear
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className="rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/5">
                Keep
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/5">
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Clear chat
            </button>
          ))}
      </div>
    </div>
  );
}
