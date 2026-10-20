import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useWorld } from '../WorldContext.js';

// A small procedural humanoid built from primitives (no model files to download). `speedRef`
// holds the current movement speed so the limbs swing while walking and settle when idle.
export default function Avatar({ look, speedRef }) {
  const { shadows } = useWorld();
  const body = useRef();
  const legL = useRef();
  const legR = useRef();
  const armL = useRef();
  const armR = useRef();
  const phase = useRef(0);

  useFrame((state, delta) => {
    const speed = speedRef.current;
    const amp = Math.min(1, speed / 4);
    phase.current += delta * (2 + speed * 1.7);
    const swing = Math.sin(phase.current) * 0.85 * amp;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.9;
    if (armR.current) armR.current.rotation.x = swing * 0.9;
    if (body.current) {
      const idle = Math.sin(state.clock.elapsedTime * 1.6) * 0.012;
      body.current.position.y = Math.abs(Math.sin(phase.current)) * 0.05 * amp + idle * (1 - amp);
    }
  });

  const cast = shadows;
  const { skin, hair, hairStyle, top, bottom, accent } = look;

  return (
    <group ref={body}>
      {/* legs: pivot at the hip */}
      <group ref={legL} position={[-0.13, 0.8, 0]}>
        <mesh position={[0, -0.4, 0]} castShadow={cast}>
          <boxGeometry args={[0.21, 0.8, 0.23]} />
          <meshStandardMaterial color={bottom} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.74, 0.04]} castShadow={cast}>
          <boxGeometry args={[0.23, 0.12, 0.31]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
      </group>
      <group ref={legR} position={[0.13, 0.8, 0]}>
        <mesh position={[0, -0.4, 0]} castShadow={cast}>
          <boxGeometry args={[0.21, 0.8, 0.23]} />
          <meshStandardMaterial color={bottom} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.74, 0.04]} castShadow={cast}>
          <boxGeometry args={[0.23, 0.12, 0.31]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
      </group>

      {/* torso with a glowing chest stripe */}
      <mesh position={[0, 1.12, 0]} castShadow={cast}>
        <boxGeometry args={[0.5, 0.64, 0.29]} />
        <meshStandardMaterial color={top} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.2, 0.148]}>
        <boxGeometry args={[0.36, 0.05, 0.01]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>

      {/* arms: pivot at the shoulder */}
      <group ref={armL} position={[-0.34, 1.4, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow={cast}>
          <boxGeometry args={[0.13, 0.58, 0.15]} />
          <meshStandardMaterial color={top} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.62, 0]} castShadow={cast}>
          <boxGeometry args={[0.12, 0.12, 0.13]} />
          <meshStandardMaterial color={skin} roughness={0.8} />
        </mesh>
      </group>
      <group ref={armR} position={[0.34, 1.4, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow={cast}>
          <boxGeometry args={[0.13, 0.58, 0.15]} />
          <meshStandardMaterial color={top} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.62, 0]} castShadow={cast}>
          <boxGeometry args={[0.12, 0.12, 0.13]} />
          <meshStandardMaterial color={skin} roughness={0.8} />
        </mesh>
      </group>

      {/* head */}
      <mesh position={[0, 1.62, 0]} castShadow={cast}>
        <sphereGeometry args={[0.2, 20, 16]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      <mesh position={[-0.07, 1.64, 0.175]}>
        <sphereGeometry args={[0.027, 8, 8]} />
        <meshStandardMaterial color="#1a1020" roughness={0.4} />
      </mesh>
      <mesh position={[0.07, 1.64, 0.175]}>
        <sphereGeometry args={[0.027, 8, 8]} />
        <meshStandardMaterial color="#1a1020" roughness={0.4} />
      </mesh>

      {/* hair */}
      {hairStyle !== 'none' && (
        <group>
          <mesh position={[0, 1.7, -0.02]} scale={[1, 0.82, 1.02]} castShadow={cast}>
            <sphereGeometry args={[0.215, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <meshStandardMaterial color={hair} roughness={0.9} />
          </mesh>
          {hairStyle === 'long' && (
            <mesh position={[0, 1.5, -0.13]} castShadow={cast}>
              <boxGeometry args={[0.38, 0.55, 0.1]} />
              <meshStandardMaterial color={hair} roughness={0.9} />
            </mesh>
          )}
          {hairStyle === 'bun' && (
            <mesh position={[0, 1.93, -0.06]} castShadow={cast}>
              <sphereGeometry args={[0.1, 12, 10]} />
              <meshStandardMaterial color={hair} roughness={0.9} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}
