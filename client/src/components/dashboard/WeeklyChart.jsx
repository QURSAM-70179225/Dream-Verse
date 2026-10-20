export default function WeeklyChart({ data }) {
  const W = 320;
  const H = 150;
  const pad = { top: 12, bottom: 26, side: 8 };
  const max = Math.max(...data.map((d) => d.xp), 1);
  const slot = (W - pad.side * 2) / data.length;
  const barW = slot * 0.56;
  const innerH = H - pad.top - pad.bottom;
  const total = data.reduce((s, d) => s + d.xp, 0);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`XP earned each day this week, ${total} XP in total`}
      >
        <defs>
          <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={pad.side}
            x2={W - pad.side}
            y1={pad.top + innerH * (1 - t)}
            y2={pad.top + innerH * (1 - t)}
            stroke="rgba(255,255,255,0.06)"
          />
        ))}
        {data.map((d, i) => {
          const h = (d.xp / max) * innerH;
          const x = pad.side + i * slot + (slot - barW) / 2;
          const y = pad.top + innerH - h;
          return (
            <g key={d.day}>
              <rect x={x} y={y} width={barW} height={h} rx="5" fill="url(#bar-grad)">
                <title>{`${d.day}: ${d.xp} XP`}</title>
              </rect>
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">
                {d.day}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-xs text-slate-400">{total} XP this week</figcaption>
    </figure>
  );
}
