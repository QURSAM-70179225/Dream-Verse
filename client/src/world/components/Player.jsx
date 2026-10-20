import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import Avatar from './Avatar.jsx';
import { useWorld } from '../WorldContext.js';
import {
  MAX_STEP,
  RUN_SPEED,
  WALK_SPEED,
  cameraPosition,
  clamp,
  keysToInput,
  lerpAngle,
  movePlayer,
  moveVector,
  nearestInteractable,
  zoneAt,
} from '../engine/movement.js';

const TURN_SPEED = 2.2; // radians per second for the Q / R camera keys
const EYE_HEIGHT = 1.15;

/**
 * Walks the avatar around the current location and drives the follow camera. Everything per frame
 * happens in refs (no React state) so movement never causes re-renders. `onNear` / `onZone` fire
 * only when the value actually changes.
 */
export default function Player({ location, spawn, look, input, paused, onNear, onZone, onInteract }) {
  const { reduced } = useWorld();
  const camera = useThree((s) => s.camera);
  const group = useRef();
  const speedRef = useRef(0);
  const me = useRef({
    x: spawn.x,
    z: spawn.z,
    heading: spawn.yaw ?? 0,
    near: null,
    zone: null,
    snap: true,
  });
  // Latest callbacks, so the frame loop never holds stale closures.
  const cb = useRef({ onNear, onZone, onInteract });
  cb.current = { onNear, onZone, onInteract };

  useLayoutEffect(() => {
    input.look.yaw = spawn.camYaw ?? 0;
    input.look.pitch = location.cam.pitch;
    input.look.dist = location.cam.dist;
    input.interact = false;
    input.keys.clear();
    input.joy.x = 0;
    input.joy.y = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, MAX_STEP);
    const s = me.current;
    const cam = location.cam;
    const active = !paused && input.enabled;

    // --- camera turning (keys) and limits
    if (active) {
      const turn = (input.keys.has('camRight') ? 1 : 0) - (input.keys.has('camLeft') ? 1 : 0);
      if (turn) input.look.yaw += turn * TURN_SPEED * dt;
    }
    input.look.pitch = clamp(input.look.pitch, cam.minPitch, cam.maxPitch);
    input.look.dist = clamp(input.look.dist, cam.min, cam.max);

    // --- movement
    let moved = 0;
    if (active) {
      const k = keysToInput(input.keys);
      const ix = k.x + input.joy.x;
      const iy = k.y + input.joy.y;
      const dir = moveVector(ix, iy, input.look.yaw);
      const mag = Math.hypot(dir.x, dir.z);
      if (mag > 0.01) {
        const speed = input.keys.has('run') ? RUN_SPEED : WALK_SPEED;
        const next = movePlayer(
          { x: s.x, z: s.z },
          { x: dir.x * speed * dt, z: dir.z * speed * dt },
          location.colliders,
          location.bounds
        );
        moved = Math.hypot(next.x - s.x, next.z - s.z) / Math.max(dt, 1e-4);
        s.x = next.x;
        s.z = next.z;
        s.heading = lerpAngle(s.heading, Math.atan2(dir.x, dir.z), 1 - Math.exp(-dt * 14));
      }
    }
    speedRef.current += (moved - speedRef.current) * (1 - Math.exp(-dt * 12));

    if (group.current) {
      group.current.position.set(s.x, 0, s.z);
      group.current.rotation.y = s.heading;
    }

    // --- follow camera
    const target = { x: s.x, y: EYE_HEIGHT, z: s.z };
    const want = cameraPosition(target, input.look.yaw, input.look.pitch, input.look.dist);
    if (s.snap || reduced) {
      camera.position.set(want.x, want.y, want.z);
      s.snap = false;
    } else {
      const k = 1 - Math.exp(-dt * 9);
      camera.position.x += (want.x - camera.position.x) * k;
      camera.position.y += (want.y - camera.position.y) * k;
      camera.position.z += (want.z - camera.position.z) * k;
    }
    camera.lookAt(target.x, target.y, target.z);

    // --- what is the player standing next to?
    const near = nearestInteractable(s, location.interactables);
    const nearId = near ? near.id : null;
    if (nearId !== (s.near ? s.near.id : null)) {
      s.near = near;
      cb.current.onNear(near);
    }
    if (location.zones.length) {
      const zone = zoneAt(location.zones, s.x, s.z, location.zoneFallback);
      if (zone !== s.zone) {
        s.zone = zone;
        cb.current.onZone(zone);
      }
    }

    // --- interact key / button
    if (input.interact) {
      input.interact = false;
      if (active && s.near) cb.current.onInteract(s.near);
    }
  });

  return (
    <group ref={group} position={[spawn.x, 0, spawn.z]} rotation={[0, spawn.yaw ?? 0, 0]}>
      <Avatar look={look} speedRef={speedRef} />
    </group>
  );
}
