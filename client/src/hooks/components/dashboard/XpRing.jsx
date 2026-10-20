import { levelProgress } from '../../utils/xp.js';

export default function XpRing({ xp }) {
  const { level, into, needed, percent } = levelProgress(xp);
  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;

  return (
    <div className="flex flex-col items-center">
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        role="img"
        aria-label={`Level ${level}, ${into} of ${needed} XP to next level`}
      >
        <defs>
          <linearGradient id="xp-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="55%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="url(#xp-grad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="80" y="76" textAnchor="middle" fontSize="12" fill="#94a3b8">
          LEVEL
        </text>
        <text
          x="80"
          y="104"
          textAnchor="middle"
          fontSize="34"
          fontWeight="800"
          fill="#fff"
          fontFamily="Orbitron, sans-serif"
        >
          {level}
        </text>
      </svg>
      <p className="mt-2 text-sm text-slate-300">
        <span className="font-semibold text-white">{xp.toLocaleString()}</span> XP total
      </p>
      <p className="text-xs text-slate-400">
        {needed - into} XP to level {level + 1}
      </p>
    </div>
  );
}
