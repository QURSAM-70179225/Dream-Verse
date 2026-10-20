// Pure movement + collision helpers for the walkable world. No React or three.js in here so the
// logic can be unit-tested with plain `node --test`.
//
// Conventions (world space): +x is right, -z is "north"/away from the default camera, y is up.
// The camera yaw rotates the control frame: yaw 0 means the camera sits at +z looking toward -z.
// An avatar heading h faces the direction (sin h, cos h), so h = 0 faces +z and h = PI faces -z.

export const PLAYER_RADIUS = 0.38;
export const WALK_SPEED = 4;
export const RUN_SPEED = 6.6;
export const MAX_STEP = 0.05; // longest frame (s) we simulate, so a lag spike can't tunnel through walls

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Interpolates angle a toward b along the shortest arc. */
export function lerpAngle(a, b, t) {
  const TAU = Math.PI * 2;
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

/**
 * Converts stick/keyboard input (x: right+, y: forward+) into a world-space movement vector
 * relative to the camera yaw. The result is never longer than 1.
 */
export function moveVector(inputX, inputY, yaw) {
  const len = Math.hypot(inputX, inputY);
  if (len < 1e-6) return { x: 0, z: 0 };
  const k = len > 1 ? 1 / len : 1;
  const ix = inputX * k;
  const iy = inputY * k;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  // forward = (-sin, -cos), right = (cos, -sin)
  return { x: ix * cos - iy * sin, z: -ix * sin - iy * cos };
}

/** Keyboard state -> {x, y} input. Opposite keys cancel out. */
export function keysToInput(keys) {
  const x = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  const y = (keys.has('forward') ? 1 : 0) - (keys.has('back') ? 1 : 0);
  return { x, y };
}

// Pushes point p (mutated) out of one collider and returns true if it had to move. Colliders are
// {x, z, w, d} (axis-aligned box, centered) or {x, z, r} (circle).
function pushOut(p, radius, c) {
  if (c.r !== undefined) {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const min = c.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) return false;
    if (d2 < 1e-9) {
      p.x = c.x + min;
      return true;
    }
    const d = Math.sqrt(d2);
    p.x = c.x + (dx / d) * min;
    p.z = c.z + (dz / d) * min;
    return true;
  }

  const hx = c.w / 2;
  const hz = c.d / 2;
  const dx = p.x - c.x;
  const dz = p.z - c.z;
  const nx = dx - clamp(dx, -hx, hx);
  const nz = dz - clamp(dz, -hz, hz);
  const d2 = nx * nx + nz * nz;
  if (d2 >= radius * radius) return false;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    const push = radius - d;
    p.x += (nx / d) * push;
    p.z += (nz / d) * push;
    return true;
  }
  // Center is inside the box: leave through the nearest face.
  const px = hx - Math.abs(dx);
  const pz = hz - Math.abs(dz);
  if (px < pz) p.x = c.x + (dx < 0 ? -1 : 1) * (hx + radius);
  else p.z = c.z + (dz < 0 ? -1 : 1) * (hz + radius);
  return true;
}

/**
 * Moves a circle by `delta` and resolves collisions against colliders and the room bounds.
 * Returns the new {x, z}. Sliding along walls falls out of the push-out approach.
 */
export function movePlayer(pos, delta, colliders, bounds, radius = PLAYER_RADIUS) {
  const p = { x: pos.x + delta.x, z: pos.z + delta.z };
  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < colliders.length; i += 1) pushOut(p, radius, colliders[i]);
  }
  p.x = clamp(p.x, bounds.minX + radius, bounds.maxX - radius);
  p.z = clamp(p.z, bounds.minZ + radius, bounds.maxZ - radius);
  return p;
}

/** True if a circle at (x, z) overlaps any collider (touching exactly does not count). */
export function overlapsCollider(x, z, colliders, radius = PLAYER_RADIUS) {
  for (let i = 0; i < colliders.length; i += 1) {
    if (pushOut({ x, z }, radius - 1e-6, colliders[i])) return true;
  }
  return false;
}

/** The closest interactable whose radius contains the player, or null. */
export function nearestInteractable(pos, list) {
  let best = null;
  let bestScore = Infinity;
  for (let i = 0; i < list.length; i += 1) {
    const it = list[i];
    const d = Math.hypot(pos.x - it.x, pos.z - it.z);
    if (d > it.r) continue;
    const score = d / it.r;
    if (score < bestScore) {
      best = it;
      bestScore = score;
    }
  }
  return best;
}

/** Name of the first zone containing (x, z), else the fallback. */
export function zoneAt(zones, x, z, fallback = '') {
  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i];
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) return zone.name;
  }
  return fallback;
}

/** Third-person camera position orbiting `target` at the given yaw, pitch and distance. */
export function cameraPosition(target, yaw, pitch, dist) {
  const horizontal = Math.cos(pitch) * dist;
  return {
    x: target.x + Math.sin(yaw) * horizontal,
    y: target.y + Math.sin(pitch) * dist,
    z: target.z + Math.cos(yaw) * horizontal,
  };
}
