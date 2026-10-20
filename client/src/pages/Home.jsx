import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot,
  GitBranch,
  Globe,
  Map as MapIcon,
  Rocket,
  Trophy,
  Wand,
} from 'lucide-react';
import SceneFrame from '../components/three/SceneFrame.jsx';
import NovaMascot from '../components/ui/NovaMascot.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useIsMobile, usePrefersReducedMotion } from '../hooks/useMediaQuery.js';

const features = [
  {
    icon: Wand,
    title: 'Describe your dream',
    text: 'Tell DreamVerse your career, city, home and lifestyle in a few questions or in your own words.',
  },
  {
    icon: Globe,
    title: 'Explore a 3D world',
    text: 'Step into a stylized neon city built around your dream: an apartment, an office, a café and a park.',
  },
  {
    icon: Bot,
    title: 'Nova, your AI mentor',
    text: 'Break big goals into small tasks, find learning resources and plan your week with a friendly guide.',
  },
  {
    icon: GitBranch,
    title: 'Life decision simulator',
    text: 'Weigh imaginative either/or choices and see hypothetical benefits and risks play out.',
  },
  {
    icon: MapIcon,
    title: 'Dream-to-reality roadmap',
    text: 'Get milestones with timelines, learning resources and tasks you can tick off as you go.',
  },
  {
    icon: Trophy,
    title: 'XP, levels and badges',
    text: 'Turn progress into a game: earn XP, unlock achievements and watch your level climb.',
  },
];

const steps = [
  { n: '01', title: 'Imagine', text: 'Answer six short questions or write freely.' },
  { n: '02', title: 'Generate', text: 'AI shapes your future profile and virtual world.' },
  { n: '03', title: 'Explore', text: 'Walk your world and try decisions.' },
  { n: '04', title: 'Act', text: 'Follow a roadmap and level up for real progress.' },
];

export default function Home() {
  const { user } = useAuth();
  const glowRef = useRef(null);
  const reduced = usePrefersReducedMotion();
  const mobile = useIsMobile();

  const onPointerMove = (e) => {
    if (reduced || mobile || !glowRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    glowRef.current.style.background = `radial-gradient(520px circle at ${e.clientX - r.left}px ${
      e.clientY - r.top
    }px, rgba(168,85,247,0.2), transparent 60%)`;
  };

  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:pb-24 lg:pt-16"
        onPointerMove={onPointerMove}
      >
        <div ref={glowRef} aria-hidden className="pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <p className="mb-4 font-display text-xs tracking-[0.35em] text-neon-cyan">
              AI LIFE SIMULATION
            </p>
            <h1 className="neon-text text-5xl font-extrabold leading-tight sm:text-6xl xl:text-7xl">
              DREAMVERSE AI
            </h1>
            <p className="mt-5 text-xl font-semibold text-white sm:text-2xl">
              Your Dreams Deserve a World of Their Own.
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Imagine your future. Build your world. Experience your dreams. Discover the path to make
              them real.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={user ? '/dashboard' : '/register'} className="btn-primary text-base">
                <Rocket className="h-5 w-5" aria-hidden />
                Enter DreamVerse
              </Link>
              <Link to="/demo-world" className="btn-ghost text-base">
                <Globe className="h-5 w-5" aria-hidden />
                Explore Demo World
              </Link>
            </div>

            <p className="mt-6 text-xs text-slate-400">
              An imaginative simulation — not a prediction of your real future.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="glass relative h-[340px] overflow-hidden shadow-neon-purple sm:h-[440px] lg:h-[560px]"
          >
            <SceneFrame className="h-full w-full" />
            <span className="pointer-events-none absolute bottom-3 left-4 rounded-full bg-black/40 px-3 py-1 text-[11px] text-slate-300 backdrop-blur">
              Drag to look around
            </span>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
            One place to dream it, play it and plan it
          </h2>
          <p className="mt-3 text-slate-300">
            A game-like world on the surface, a practical planner underneath.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }, i) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="glass p-6 transition hover:border-neon-purple/50 hover:shadow-neon-purple"
            >
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-neon-purple/20 text-neon-cyan">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="mb-10 font-display text-2xl font-extrabold text-white sm:text-3xl">
          How it works
        </h2>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="glass p-6"
            >
              <span className="neon-text text-3xl font-extrabold">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{s.text}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* Nova teaser */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="glass grid items-center gap-8 p-8 md:grid-cols-[auto_1fr]">
          <div className="mx-auto">
            <NovaMascot size={180} />
          </div>
          <div>
            <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
              Meet Nova, your future mentor
            </h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              Nova turns big goals into small next steps. Here is the kind of conversation to expect:
            </p>
            <div className="mt-5 space-y-3 text-sm" aria-label="Example conversation">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-neon-purple/30 px-4 py-2 text-white">
                I want to become an AI engineer.
              </p>
              <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm border border-neon-cyan/30 bg-white/5 px-4 py-2 text-slate-100">
                Great goal! Let&apos;s start with Python, mathematics, machine learning fundamentals,
                and practical AI projects.
              </p>
            </div>
            <p className="mt-3 text-xs text-slate-400">Example only. Create a free account to chat with Nova.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center sm:px-6">
        <h2 className="neon-text text-3xl font-extrabold sm:text-4xl">Ready to build your world?</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-300">
          Create an account, or look around the demo dashboard with sample data first.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to={user ? '/create' : '/register'} className="btn-primary">
            {user ? 'Create Your Future' : 'Create your account'}
          </Link>
          {!user && (
            <Link to="/login" className="btn-ghost">
              Try the demo dashboard
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
