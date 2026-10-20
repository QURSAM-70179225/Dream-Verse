import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, OrbitControls, Sparkles } from '@react-three/drei';
import { useIsMobile, usePrefersReducedMotion } from '../../hooks/useMediaQuery.js';

// Deterministic PRNG so the city looks the same on every load.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BODY = ['#1b1840', '#221a4a', '#16213f', '#2a1c47'];
const NEON = ['#a855f7', '#22d3ee', '#f472b6', '#e879f9'];
const SPACING = 2.3;

function buildCity() {
  const rand = mulberry32(7);
  const buildings = [];
  const N = 4;
  for (let x = -N; x <= N; x += 1) {
    for (let z = -N; z <= N; z += 1) {
      if (x === 0 || z === 0) continue; // leave streets clear
      if (rand() < 0.1) continue;
      const nearCenter = Math.abs(x) + Math.abs(z) < 5;
      buildings.push({
        key: `${x}:${z}`,
        x: x * SPACING,
        z: z * SPACING,
        w: 1.15 + rand() * 0.5,
        h: 1 + rand() * 3.6 + (nearCenter ? rand() * 2.6 : 0),
        body: BODY[Math.floor(rand() * BODY.length)],
        neon: NEON[Math.floor(rand() * NEON.length)],
      });
    }
  }
  return buildings;
}

function Building({ b }) {
  return (
    <group position={[b.x, 0, b.z]}>
      <mesh position={[0, b.h / 2, 0]}>
        <boxGeometry args={[b.w, b.h, b.w]} />
        <meshStandardMaterial color={b.body} roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, b.h + 0.04, 0]}>
        <boxGeometry args={[b.w + 0.06, 0.08, b.w + 0.06]} />
        <meshStandardMaterial color={b.neon} emissive={b.neon} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[0, b.h * 0.55, b.w / 2 + 0.01]}>
        <planeGeometry args={[b.w * 0.7, b.h * 0.6]} />
        <meshStandardMaterial color="#0b0b1e" emissive={b.neon} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function Streets() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[26, 26]} />
        <meshStandardMaterial color="#0a0a1c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[26, 0.02, 0.1]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.1, 0.02, 26]} />
        <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Drones() {
  const drones = [
    { p: [-3, 5.5, 2], c: '#22d3ee' },
    { p: [3.5, 6.5, -3], c: '#f472b6' },
    { p: [1, 4.5, 5], c: '#a855f7' },
  ];
  return drones.map((d) => (
    <Float key={d.c} speed={2} rotationIntensity={0.6} floatIntensity={1.4}>
      <mesh position={d.p}>
        <octahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color={d.c} emissive={d.c} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
    </Float>
  ));
}

export default function CityScene({ interactive = false }) {
  const mobile = useIsMobile();
  const reduced = usePrefersReducedMotion();
  const buildings = useMemo(buildCity, []);

  return (
    <Canvas
      dpr={[1, mobile ? 1.25 : 2]}
      camera={{ position: [11, 9, 11], fov: 38 }}
      gl={{ antialias: !mobile, powerPreference: 'high-performance' }}
      style={{ touchAction: interactive ? 'none' : 'pan-y' }}
      aria-label="Animated 3D neon city"
    >
      <fog attach="fog" args={['#05050f', 15, 34]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 12, 6]} intensity={0.6} color="#c4b5fd" />
      <pointLight position={[0, 6, 0]} intensity={40} distance={20} color="#e879f9" />
      <pointLight position={[6, 4, -6]} intensity={30} distance={18} color="#22d3ee" />

      {buildings.map((b) => (
        <Building key={b.key} b={b} />
      ))}
      <Streets />
      <Drones />
      <Sparkles
        count={mobile ? 30 : 90}
        scale={[20, 10, 20]}
        size={3}
        speed={reduced ? 0 : 0.4}
        color="#67e8f9"
      />

      <OrbitControls
        enablePan={false}
        enableZoom={interactive}
        enableRotate={interactive || !mobile}
        autoRotate={!reduced}
        autoRotateSpeed={0.7}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={9}
        maxDistance={26}
      />
    </Canvas>
  );
}
