import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { keyFor } from '../engine/materials.js';
import { useWorld } from '../WorldContext.js';

const GEOMETRIES = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  sph: new THREE.SphereGeometry(1, 18, 14),
  plane: new THREE.PlaneGeometry(1, 1),
};

const matrix = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const scale = new THREE.Vector3();
const position = new THREE.Vector3();

function compose(p) {
  switch (p.s) {
    case 'sph':
      position.set(p.x, p.y, p.z);
      scale.set(p.r, p.r, p.r);
      euler.set(0, 0, 0);
      break;
    case 'cyl':
      position.set(p.x, p.y + p.h / 2, p.z);
      scale.set(p.r, p.h, p.r);
      euler.set(0, 0, 0);
      break;
    case 'plane':
      position.set(p.x, p.y + p.h / 2, p.z);
      scale.set(p.w, p.h, 1);
      euler.set(0, p.ry || 0, 0);
      break;
    default:
      position.set(p.x, p.y + p.h / 2, p.z);
      scale.set(p.w, p.h, p.d);
      euler.set(0, p.ry || 0, 0);
  }
  quat.setFromEuler(euler);
  return matrix.compose(position, quat, scale);
}

// All props that share a shape and a material are drawn with one InstancedMesh, so a whole
// city costs a few dozen draw calls instead of hundreds.
function Batch({ shape, material, items, shadows }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((p, i) => mesh.setMatrixAt(i, compose(p)));
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);

  const transparent = material.transparent;
  return (
    <instancedMesh
      ref={ref}
      args={[GEOMETRIES[shape], material, items.length]}
      castShadow={shadows && !transparent && shape !== 'plane'}
      receiveShadow={shadows}
      frustumCulled={false}
    />
  );
}

function Props({ items }) {
  const { cache, shadows } = useWorld();

  const batches = useMemo(() => {
    const groups = new Map();
    items.forEach((p) => {
      const key = `${p.s}|${keyFor(p.m)}`;
      let g = groups.get(key);
      if (!g) {
        g = { key, shape: p.s, material: cache.get(p.m), items: [] };
        groups.set(key, g);
      }
      g.items.push(p);
    });
    return [...groups.values()];
  }, [items, cache]);

  return (
    <group>
      {batches.map((b) => (
        <Batch key={`${b.key}|${b.items.length}`} shape={b.shape} material={b.material} items={b.items} shadows={shadows} />
      ))}
    </group>
  );
}

export default memo(Props);
