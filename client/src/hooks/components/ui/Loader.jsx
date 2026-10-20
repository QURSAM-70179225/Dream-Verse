export default function Loader({ label = 'Loading' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-neon-purple/30 border-t-neon-cyan" />
      <p className="font-display text-sm tracking-widest text-neon-cyan">{label}…</p>
    </div>
  );
}
