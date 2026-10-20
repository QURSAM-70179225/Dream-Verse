import * as THREE from 'three';

// Material specs are plain objects so the world layout (data/locations.js) stays free of three.js.
//   c: color        nc: color at night     em: emissive color     ei: [day, night] emissive intensity
//   r: roughness    mt: metalness          tm: toneMapped (false = can glow brighter than 1)
//   unlit: MeshBasicMaterial (used for sky panels)
export const MATS = {
  ground: { c: '#4a5368', nc: '#0a0a1c', r: 0.95 },
  road: { c: '#2d3344', nc: '#06060f', r: 0.9 },
  sidewalk: { c: '#7b869c', nc: '#16163a', r: 0.9 },
  grass: { c: '#3f8a52', nc: '#0d2a22', r: 1 },
  water: { c: '#4aa3d6', nc: '#0b2b4a', em: '#22d3ee', ei: [0.05, 0.6], r: 0.2 },
  bldA: { c: '#8b93b5', nc: '#1b1840', r: 0.6, mt: 0.2 },
  bldB: { c: '#9aa3c4', nc: '#221a4a', r: 0.6, mt: 0.2 },
  bldC: { c: '#7d89ad', nc: '#16213f', r: 0.6, mt: 0.2 },
  bldD: { c: '#a39bc2', nc: '#2a1c47', r: 0.6, mt: 0.2 },
  window: { c: '#31405f', nc: '#1a2240', em: '#ffd27a', ei: [0.08, 1.6], r: 0.3 },
  trunk: { c: '#6b4a2f', r: 1 },
  leaves: { c: '#2f9e5a', nc: '#0f3d2c', r: 1 },
  lamp: { c: '#fff1c9', em: '#ffcf86', ei: [0.5, 2.6], tm: false },
  glass: { c: '#bfe6ff', r: 0.1, mt: 0.1, op: 0.45 },
  skyPane: { c: '#9ec5ff', nc: '#12082e', unlit: true },
};

function build(spec) {
  const opacity = spec.op ?? 1;
  if (spec.unlit) {
    return new THREE.MeshBasicMaterial({ color: spec.c, fog: false });
  }
  return new THREE.MeshStandardMaterial({
    color: spec.c,
    roughness: spec.r ?? 0.75,
    metalness: spec.mt ?? 0.05,
    emissive: spec.em || '#000000',
    emissiveIntensity: spec.ei ? spec.ei[0] : spec.em ? 1.5 : 0,
    toneMapped: spec.tm !== false,
    transparent: opacity < 1,
    opacity,
  });
}

export function specFor(m) {
  if (typeof m === 'string') return m.startsWith('#') ? { c: m } : MATS[m];
  return m;
}

export function keyFor(m) {
  return typeof m === 'string' ? m : JSON.stringify(m);
}

/**
 * Creates each distinct material once and keeps the ones that react to day/night up to date.
 * `update(night)` takes 0 (day) .. 1 (night).
 */
export class MaterialCache {
  constructor() {
    this.map = new Map();
    this.dynamic = [];
  }

  get(m) {
    const key = keyFor(m);
    let mat = this.map.get(key);
    if (mat) return mat;
    const spec = specFor(m);
    if (!spec) throw new Error(`Unknown material "${key}"`);
    mat = build(spec);
    this.map.set(key, mat);
    if (spec.nc || spec.ei) {
      this.dynamic.push({
        mat,
        spec,
        day: new THREE.Color(spec.c),
        night: new THREE.Color(spec.nc || spec.c),
      });
    }
    return mat;
  }

  update(night) {
    for (let i = 0; i < this.dynamic.length; i += 1) {
      const { mat, spec, day, night: nightColor } = this.dynamic[i];
      if (spec.nc) mat.color.lerpColors(day, nightColor, night);
      if (spec.ei) mat.emissiveIntensity = spec.ei[0] + (spec.ei[1] - spec.ei[0]) * night;
    }
  }

  dispose() {
    this.map.forEach((mat) => mat.dispose());
    this.map.clear();
    this.dynamic = [];
  }
}
