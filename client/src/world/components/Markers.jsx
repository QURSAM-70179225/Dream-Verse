import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useWorld } from '../WorldContext.js';

const COLORS = { portal: '#fbbf24', info: '#e879f9' };

// Small floating diamonds that show where something can be interacted with.
function Marker({ item }) {
  const { reduced } = useWorld();
  const ref = useRef();
  const baseY = item.markerY ?? 1.9;

  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    m.position.y = baseY + (reduced ? 0 : Math.sin(t * 2 + item.x) * 0.08);
    m.rotation.y = reduced ? 0.6 : t * 1.4;
  });

  const color = COLORS[item.kind] || COLORS.info;
  return (
    <mesh ref={ref} position={[item.x, baseY, item.z]}>
      <octahedronGeometry args={[0.16, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} />
    </mesh>
  );
}

export default function Markers({ items }) {
  return items.map((it) => <Marker key={it.id} item={it} />);
}
