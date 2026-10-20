import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <p className="font-display text-sm tracking-[0.3em] text-neon-pink">ERROR 404</p>
        <h1 className="neon-text mt-2 text-4xl font-extrabold">Lost in the Verse</h1>
        <p className="mt-3 text-slate-300">That page doesn&apos;t exist (yet).</p>
        <Link to="/" className="btn-primary mt-6">
          Back to home
        </Link>
      </div>
    </section>
  );
}
