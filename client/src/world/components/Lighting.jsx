import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld } from '../WorldContext.js';

const AUTO_PERIOD = 120; // seconds for a full day/night cycle in "auto" mode

// Day/night presets. Values are interpolated by `night` (0..1) every frame.
const OUTDOOR = {
  sky: ['#8ec5ff', '#05050f'],
  fog: [26, 62],
  ambient: [1.05, 0.38],
  ambientColor: ['#ffffff', '#8b8cff'],
  sun: [2.2, 0.55],
  sunColor: ['#fff1d6', '#8fa2ff'],
  sunPos: [14, 22, 10],
  shadowSize: 26,
};
const INTERIOR = {
  sky: ['#262650', '#05050f'],
  fog: [40, 90],
  ambient: [1.0, 0.5],
  ambientColor: ['#ffffff', '#a99bff'],
  sun: [1.3, 0.25],
  sunColor: ['#fff4e0', '#9aa8ff'],
  sunPos: [5, 14, 8],
  shadowSize: 12,
};

const lerp = (a, b, t) => a + (b - a) * t;

/** Sky, fog, ambient + sun light and the location's lamps, all driven by the day/night value. */
export default function Lighting({ interior, timeMode, lights }) {
  const { nightRef, cache, shadows } = useWorld();
  const p = interior ? INTERIOR : OUTDOOR;
  const bg = useRef();
  const fog = useRef();
  const ambient = useRef();
  const sun = useRef();
  const lamps = useRef([]);
  const clock = useRef(0);

  const colors = useMemo(
    () => ({
      skyDay: new THREE.Color(p.sky[0]),
      skyNight: new THREE.Color(p.sky[1]),
      ambDay: new THREE.Color(p.ambientColor[0]),
      ambNight: new THREE.Color(p.ambientColor[1]),
      sunDay: new THREE.Color(p.sunColor[0]),
      sunNight: new THREE.Color(p.sunColor[1]),
    }),
    [p]
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    clock.current += dt;
    let target = 0;
    if (timeMode === 'night') target = 1;
    else if (timeMode === 'auto') target = 0.5 - 0.5 * Math.cos((clock.current * Math.PI * 2) / AUTO_PERIOD);
    nightRef.current += (target - nightRef.current) * (1 - Math.exp(-dt * 2.5));
    const n = nightRef.current;

    cache.update(n);

    if (bg.current) bg.current.lerpColors(colors.skyDay, colors.skyNight, n);
    if (fog.current && bg.current) fog.current.color.copy(bg.current);
    if (ambient.current) {
      ambient.current.intensity = lerp(p.ambient[0], p.ambient[1], n);
      ambient.current.color.lerpColors(colors.ambDay, colors.ambNight, n);
    }
    if (sun.current) {
      sun.current.intensity = lerp(p.sun[0], p.sun[1], n);
      sun.current.color.lerpColors(colors.sunDay, colors.sunNight, n);
    }
    lights.forEach((l, i) => {
      const lamp = lamps.current[i];
      if (lamp) lamp.intensity = lerp(l.day, l.night, n);
    });
  });

  const s = p.shadowSize;
  return (
    <>
      <color ref={bg} attach="background" args={[p.sky[0]]} />
      <fog ref={fog} attach="fog" args={[p.sky[0], p.fog[0], p.fog[1]]} />
      <ambientLight ref={ambient} intensity={p.ambient[0]} />
      <directionalLight
        ref={sun}
        position={p.sunPos}
        intensity={p.sun[0]}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-s}
        shadow-camera-right={s}
        shadow-camera-top={s}
        shadow-camera-bottom={-s}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
      />
      {lights.map((l, i) => (
        <pointLight
          key={`${l.x}:${l.y}:${l.z}`}
          ref={(el) => {
            lamps.current[i] = el;
          }}
          position={[l.x, l.y, l.z]}
          color={l.color}
          intensity={l.day}
          distance={l.dist}
          decay={2}
        />
      ))}
    </>
  );
}
