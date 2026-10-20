// Nova — DreamVerse's AI mentor. Original SVG: a friendly neon-outline robot.
export default function NovaMascot({ size = 160, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Nova, the DreamVerse AI mentor"
      className={`animate-float ${className}`}
    >
      <defs>
        <filter id="nova-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#nova-glow)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* antennae */}
        <path d="M70 38 Q62 22 56 16" stroke="#e879f9" strokeWidth="3" />
        <path d="M130 38 Q138 22 144 16" stroke="#e879f9" strokeWidth="3" />
        <circle cx="55" cy="14" r="5" fill="#f472b6" stroke="#f472b6" />
        <circle cx="145" cy="14" r="5" fill="#f472b6" stroke="#f472b6" />
        {/* head */}
        <rect x="42" y="36" width="116" height="84" rx="38" stroke="#a855f7" strokeWidth="4" fill="rgba(124,58,237,0.18)" />
        {/* ears */}
        <rect x="30" y="68" width="12" height="26" rx="6" stroke="#a855f7" strokeWidth="3" />
        <rect x="158" y="68" width="12" height="26" rx="6" stroke="#a855f7" strokeWidth="3" />
        {/* eyes */}
        <ellipse cx="78" cy="76" rx="14" ry="16" stroke="#22d3ee" strokeWidth="3" fill="rgba(34,211,238,0.25)" />
        <ellipse cx="122" cy="76" rx="14" ry="16" stroke="#22d3ee" strokeWidth="3" fill="rgba(34,211,238,0.25)" />
        <circle cx="80" cy="74" r="5" fill="#e0f2fe" stroke="none" />
        <circle cx="124" cy="74" r="5" fill="#e0f2fe" stroke="none" />
        {/* smile */}
        <path d="M86 100 Q100 110 114 100" stroke="#22d3ee" strokeWidth="3.5" />
        {/* body */}
        <path d="M64 128 Q100 120 136 128 L130 172 Q100 182 70 172 Z" stroke="#a855f7" strokeWidth="4" fill="rgba(124,58,237,0.18)" />
        <text x="100" y="158" textAnchor="middle" fontSize="20" fontWeight="700" fill="#c4b5fd" stroke="none" fontFamily="Orbitron, sans-serif">
          AI
        </text>
        {/* arms */}
        <path d="M64 134 Q40 142 34 160" stroke="#a855f7" strokeWidth="4" />
        <path d="M136 134 Q160 142 166 160" stroke="#a855f7" strokeWidth="4" />
        <circle cx="34" cy="162" r="6" stroke="#22d3ee" strokeWidth="3" />
        <circle cx="166" cy="162" r="6" stroke="#22d3ee" strokeWidth="3" />
      </g>
    </svg>
  );
}
