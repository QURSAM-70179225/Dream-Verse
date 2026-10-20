const COLORS = {
  purple: 'from-neon-violet to-neon-purple',
  cyan: 'from-cyan-500 to-neon-cyan',
  pink: 'from-neon-purple to-neon-pink',
  green: 'from-emerald-500 to-emerald-300',
};

export default function ProgressBar({ value = 0, color = 'purple', label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-white/10"
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r ${COLORS[color] || COLORS.purple} transition-[width] duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
