import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-slate-400 sm:px-6">
      <p className="mx-auto max-w-2xl">
        DreamVerse AI is an imaginative simulation. Outcomes, roadmaps and scenarios are hypothetical
        and are not predictions of your real future.
      </p>
      <p className="mt-3 space-x-4">
        <Link to="/status" className="hover:text-neon-cyan">
          System status
        </Link>
        <span aria-hidden>·</span>
        <span>© {new Date().getFullYear()} DreamVerse AI</span>
      </p>
    </footer>
  );
}
