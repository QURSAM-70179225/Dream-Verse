// Layouts for the walkable world, as plain data (no React, no three.js).
//
// Every location is a list of "props" (boxes, cylinders, spheres, planes) plus interactables,
// spawn points and lights. Props marked `solid` automatically become colliders, so what you see
// is what blocks you. Materials are named specs from engine/materials.js, a '#hex' color, or an
// inline spec object.
//
// Coordinates: +x right, -z "north" (away from the default camera), y up. For boxes `y` is the
// bottom of the box; cylinders `y` is the bottom; spheres `y` is the center; planes `y` is the
// bottom edge.

export const LOCATION_IDS = ['city', 'apartment', 'office', 'cafe'];

export const LOCATION_NAMES = {
  city: 'Neon City',
  apartment: 'Your Apartment',
  office: 'Dream Office',
  cafe: 'Dream Café',
};

export const ROOM_THEMES = {
  'modern-apartment': { wall: '#cfd5ee', floor: '#8a6a52', rug: '#4c3a8a', accent: '#a855f7', sofa: '#5b4bb5' },
  'cozy-loft': { wall: '#e0c4a8', floor: '#9a6a45', rug: '#a8543a', accent: '#fb923c', sofa: '#b4673c' },
  'minimal-zen': { wall: '#eceae4', floor: '#c9b79c', rug: '#d9d3c4', accent: '#5a8f7b', sofa: '#7c8f86' },
  'garden-house': { wall: '#d6e6cf', floor: '#a98660', rug: '#6a9a62', accent: '#4ade80', sofa: '#5f8f5a' },
};

export const CITY_THEMES = {
  'neon-city': { a: '#a855f7', b: '#22d3ee' },
  'neon-skyline': { a: '#f472b6', b: '#22d3ee' },
  'coastal-glow': { a: '#22d3ee', b: '#fb923c' },
  'forest-retreat': { a: '#4ade80', b: '#fbbf24' },
};

const PI = Math.PI;

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- prop builders -------------------------------------------------------------------------
const B = (x, z, w, d, h, m, o = {}) => ({ s: 'box', x, z, w, d, h, y: 0, m, ...o });
const C = (x, z, r, h, m, o = {}) => ({ s: 'cyl', x, z, r, h, y: 0, m, ...o });
const S = (x, y, z, r, m, o = {}) => ({ s: 'sph', x, y, z, r, m, ...o });
const P = (x, z, w, h, ry, m, o = {}) => ({ s: 'plane', x, z, w, h, ry, y: 0, m, ...o });

const glow = (c, ei = [1.3, 2.4]) => ({ c, em: c, ei, tm: false });
const WOOD = '#9b6b43';
const WOOD_DARK = '#6b4a2f';
const METAL = '#2a2a45';
const DARK = '#0b0b1e';
const SCREEN = glow('#22d3ee', [1.1, 1.5]);

const collidersOf = (props) =>
  props
    .filter((p) => p.solid)
    .map((p) => (p.s === 'cyl' ? { x: p.x, z: p.z, r: p.r } : { x: p.x, z: p.z, w: p.w, d: p.d }));

// --- rooms ---------------------------------------------------------------------------------
// Walls are single-sided planes facing into the room. From outside they are invisible (back-face
// culled), which gives the "dollhouse" view: the camera floats outside and always sees the far
// walls and the floor.
function wallPlane(room, side, center, width, y0, y1, m) {
  const h = y1 - y0;
  if (width <= 0.001 || h <= 0.001) return null;
  const hw = room.w / 2;
  const hd = room.d / 2;
  const at = {
    back: [center, -hd, 0],
    front: [center, hd, PI],
    left: [-hw, center, PI / 2],
    right: [hw, center, -PI / 2],
  }[side];
  return P(at[0], at[1], width, h, at[2], m, { y: y0 });
}

// `opening` = { from, to, y0, y1 } in world coordinates along the wall (x for back/front, z for sides).
function wall(room, side, m, opening) {
  const half = (side === 'back' || side === 'front' ? room.w : room.d) / 2;
  if (!opening) return [wallPlane(room, side, 0, half * 2, 0, room.h, m)].filter(Boolean);
  const { from, to, y0, y1 } = opening;
  return [
    wallPlane(room, side, (-half + from) / 2, from + half, 0, room.h, m),
    wallPlane(room, side, (to + half) / 2, half - to, 0, room.h, m),
    wallPlane(room, side, (from + to) / 2, to - from, 0, y0, m),
    wallPlane(room, side, (from + to) / 2, to - from, y1, room.h, m),
  ].filter(Boolean);
}

// Sky panel plus a few distant towers behind a window wall.
function skylineBehind(side, room, seed, accent) {
  const rand = mulberry32(seed);
  const out = [];
  const far = 15;
  const horizontal = side === 'back';
  const span = (horizontal ? room.w : room.d) / 2 + 6;
  const edge = (horizontal ? room.d : room.w) / 2;
  const sign = side === 'right' ? 1 : -1;

  if (horizontal) out.push(P(0, -edge - far, 60, 30, 0, 'skyPane'));
  else out.push(P(sign * (edge + far), 0, 60, 30, sign * -PI / 2, 'skyPane'));

  for (let i = 0; i < 9; i += 1) {
    const along = -span + (i / 8) * span * 2;
    const bw = 1.8 + rand() * 1.8;
    const bh = 4 + rand() * 9;
    const gap = 3 + rand() * 6;
    const m = ['bldA', 'bldB', 'bldC', 'bldD'][Math.floor(rand() * 4)];
    if (horizontal) {
      const z = -edge - gap;
      out.push(B(along, z, bw, 2.4, bh, m));
      out.push(B(along, z + 1.22, bw * 0.7, 0.04, bh * 0.55, 'window', { y: bh * 0.3 }));
      if (i % 3 === 0) out.push(B(along, z, bw + 0.1, 2.5, 0.12, glow(accent), { y: bh }));
    } else {
      const x = sign * (edge + gap);
      out.push(B(x, along, 2.4, bw, bh, m));
      out.push(B(x - sign * 1.22, along, 0.04, bw * 0.7, bh * 0.55, 'window', { y: bh * 0.3 }));
      if (i % 3 === 0) out.push(B(x, along, 2.5, bw + 0.1, 0.12, glow(accent), { y: bh }));
    }
  }
  return out;
}

function doorOnFront(room, accent) {
  const z = room.d / 2;
  return [
    B(0, z - 0.07, 1.9, 0.12, 2.45, glow(accent, [1.2, 2.2])),
    B(0, z - 0.1, 1.5, 0.12, 2.2, '#150f2e'),
    B(0, z - 0.95, 1.4, 0.9, 0.02, METAL),
    B(0, z - 0.5, 1.2, 0.4, 0.03, glow(accent, [0.9, 1.6]), { y: 0.02 }),
  ];
}

const FRONT_DOOR = { from: -0.8, to: 0.8, y0: 0, y1: 2.35 };

// --- apartment -----------------------------------------------------------------------------
function buildApartment(o) {
  const room = { w: 10, d: 8, h: 3.2 };
  const t = ROOM_THEMES[o.roomTheme] || ROOM_THEMES['modern-apartment'];
  const city = CITY_THEMES[o.cityTheme] || CITY_THEMES['neon-city'];
  const props = [
    B(0, 0, room.w, room.d, 0.1, t.floor, { y: -0.1 }),
    B(0.6, 0.5, 4.4, 3.2, 0.02, t.rug),
    ...wall(room, 'back', t.wall, { from: -0.5, to: 2.9, y0: 0.9, y1: 2.6 }),
    ...wall(room, 'left', t.wall),
    ...wall(room, 'right', t.wall),
    ...wall(room, 'front', t.wall, FRONT_DOOR),
    ...skylineBehind('back', room, 11, city.b),
    ...doorOnFront(room, t.accent),
    // window sill + frame accents
    B(1.2, -3.85, 3.6, 0.25, 0.06, '#f3f0ff', { y: 0.9 }),

    // bed (headboard against the back wall)
    B(-3.3, -2.2, 2.2, 3.2, 0.35, WOOD_DARK, { solid: true }),
    B(-3.3, -2.05, 2.0, 2.9, 0.25, '#f3f0ff', { y: 0.35 }),
    B(-3.3, -1.5, 2.04, 1.7, 0.12, t.accent, { y: 0.55 }),
    B(-3.3, -3.88, 2.3, 0.14, 1.15, WOOD_DARK, { solid: true }),
    B(-3.75, -3.35, 0.75, 0.45, 0.16, '#ffffff', { y: 0.6 }),
    B(-2.85, -3.35, 0.75, 0.45, 0.16, '#ffffff', { y: 0.6 }),
    // nightstand + lamp
    B(-1.65, -3.45, 0.6, 0.6, 0.55, WOOD, { solid: true }),
    C(-1.65, -3.45, 0.04, 0.4, METAL, { y: 0.55 }),
    S(-1.65, 1.12, -3.45, 0.2, 'lamp'),

    // desk, monitor, chair
    B(3.4, -3.3, 2.4, 0.9, 0.78, WOOD, { solid: true }),
    B(3.4, -3.58, 0.1, 0.1, 0.2, METAL, { y: 0.78 }),
    B(3.4, -3.58, 0.95, 0.06, 0.58, DARK, { y: 0.96 }),
    B(3.4, -3.54, 0.85, 0.02, 0.48, SCREEN, { y: 1.01 }),
    B(3.4, -3.05, 0.6, 0.2, 0.03, METAL, { y: 0.78 }),
    C(3.4, -2.35, 0.3, 0.08, METAL, { y: 0.45 }),
    C(3.4, -2.35, 0.04, 0.45, METAL),
    B(3.4, -2.06, 0.55, 0.08, 0.55, METAL, { y: 0.5 }),

    // bookshelf on the right wall with a few colored books
    B(4.7, -0.7, 0.5, 2.2, 2.0, WOOD, { solid: true }),
    ...[0, 1].flatMap((row) =>
      [0, 1, 2, 3, 4, 5].map((i) =>
        B(4.42, -1.55 + i * 0.32, 0.1, 0.2, 0.42, ['#a855f7', '#22d3ee', '#f472b6', '#fbbf24', '#4ade80', '#60a5fa'][(i + row * 2) % 6], {
          y: 0.5 + row * 0.7,
        })
      )
    ),

    // sofa facing the TV on the left wall
    B(-2.0, 1.7, 1.0, 2.6, 0.5, t.sofa, { solid: true }),
    B(-1.55, 1.7, 0.25, 2.6, 0.95, t.sofa, { solid: true }),
    B(-4.9, 1.7, 0.1, 1.9, 1.05, DARK, { y: 0.6 }),
    B(-4.85, 1.7, 0.02, 1.75, 0.9, glow(city.a, [0.7, 1.4]), { y: 0.68 }),
    B(-4.7, 1.7, 0.5, 2.0, 0.6, WOOD_DARK, { solid: true }),

    // neon art above the bed
    B(-4.95, -2.2, 0.05, 1.3, 0.8, glow(city.a), { y: 1.7 }),

    // plant + floor lamp
    C(4.3, 3.2, 0.27, 0.42, '#b4673c', { solid: true }),
    S(4.3, 0.95, 3.2, 0.5, 'leaves'),
    C(-4.3, 3.3, 0.05, 1.5, METAL),
    S(-4.3, 1.62, 3.3, 0.22, 'lamp'),
  ];

  return {
    room,
    props,
    bounds: { minX: -5, maxX: 5, minZ: -4, maxZ: 4 },
    spawns: { default: { x: 1.0, z: 1.0, yaw: PI, camYaw: 0 } },
    interactables: [
      { id: 'apt-door', x: 0, z: 3.0, r: 1.3, label: 'Exit to the city', kind: 'portal', to: 'city', spawn: 'apartment', markerY: 2.9 },
      { id: 'apt-desk', x: 3.4, z: -1.5, r: 1.5, label: 'Your dream desk', kind: 'info' },
      { id: 'apt-bed', x: -1.7, z: -0.2, r: 1.5, label: 'Rest', kind: 'info' },
      { id: 'apt-shelf', x: 3.7, z: 0.6, r: 1.4, label: 'Learning shelf', kind: 'info' },
      { id: 'apt-window', x: 1.2, z: -3.1, r: 1.4, label: 'The view', kind: 'info', markerY: 2.2 },
      { id: 'apt-tv', x: -0.6, z: 1.7, r: 1.3, label: 'Vision board', kind: 'info' },
    ],
    lights: [
      { x: -1.65, y: 1.4, z: -3.45, color: '#ffcf86', day: 3, night: 14, dist: 9 },
      { x: 0, y: 2.9, z: 0.5, color: '#fff4e0', day: 14, night: 5, dist: 14 },
      { x: 1.2, y: 2.0, z: -3.2, color: '#a5c8ff', day: 10, night: 3, dist: 9 },
    ],
    cam: { dist: 9.5, min: 6, max: 15, pitch: 0.85, minPitch: 0.45, maxPitch: 1.3 },
  };
}

// --- office --------------------------------------------------------------------------------
function buildOffice(o) {
  const room = { w: 14, d: 10, h: 3.4 };
  const city = CITY_THEMES[o.cityTheme] || CITY_THEMES['neon-city'];
  const wallC = '#d5d9ee';
  const milestones = (o.milestones || []).slice(0, 6);
  const board = [
    B(0, -4.93, 5.2, 0.08, 1.7, '#f4f4fb', { y: 0.95 }),
    B(0, -4.88, 5.4, 0.04, 0.08, METAL, { y: 2.62 }),
  ];
  for (let i = 0; i < 6; i += 1) {
    const p = Math.max(0, Math.min(100, milestones[i] ?? 0));
    const y = 2.28 - i * 0.22;
    board.push(B(0, -4.87, 3.8, 0.03, 0.12, '#d3d7e8', { y }));
    if (p > 0) board.push(B(-1.9 + (3.8 * p) / 200, -4.84, (3.8 * p) / 100, 0.03, 0.12, glow(city.b, [1, 1.6]), { y }));
    board.push(B(-2.3, -4.87, 0.12, 0.03, 0.12, glow(city.a, [0.8, 1.4]), { y }));
  }

  const desk = (x, z) => [
    B(x, z, 2.0, 0.9, 0.75, '#d8d2c8', { solid: true }),
    B(x, z - 0.2, 0.9, 0.05, 0.55, DARK, { y: 0.95 }),
    B(x, z - 0.17, 0.8, 0.02, 0.45, SCREEN, { y: 1.0 }),
    B(x, z - 0.2, 0.08, 0.08, 0.2, METAL, { y: 0.75 }),
    C(x, z + 0.85, 0.28, 0.08, METAL, { y: 0.45 }),
    C(x, z + 0.85, 0.04, 0.45, METAL),
    B(x, z + 1.12, 0.5, 0.08, 0.5, METAL, { y: 0.5 }),
  ];
  const seat = (x, z) => [C(x, z, 0.26, 0.08, METAL, { y: 0.42 }), C(x, z, 0.04, 0.42, METAL)];

  const props = [
    B(0, 0, room.w, room.d, 0.1, '#6e7390', { y: -0.1 }),
    B(0.5, 0.2, 9.5, 6.5, 0.02, '#3b3f63'),
    ...wall(room, 'back', wallC),
    ...wall(room, 'left', wallC, { from: -3, to: 3, y0: 0.8, y1: 2.8 }),
    ...wall(room, 'right', wallC),
    ...wall(room, 'front', wallC, FRONT_DOOR),
    ...skylineBehind('left', room, 23, city.b),
    ...doorOnFront(room, city.b),
    ...board,
    B(-6.9, 0, 0.2, 6.2, 0.06, '#f3f0ff', { y: 0.8 }),

    // four workstations
    ...desk(-4.4, -1.2),
    ...desk(-1.6, -1.2),
    ...desk(-4.4, 2.0),
    ...desk(-1.6, 2.0),

    // meeting table with chairs
    B(4.1, -1.2, 2.8, 1.5, 0.76, WOOD, { solid: true }),
    ...seat(2.6, -1.2),
    ...seat(5.6, -1.2),
    ...seat(3.5, -2.35),
    ...seat(4.7, -2.35),
    ...seat(3.5, -0.05),
    ...seat(4.7, -0.05),

    // waiting sofa + coffee table
    B(5.5, 3.6, 2.2, 0.9, 0.5, '#4c3a8a', { solid: true }),
    B(5.5, 4.0, 2.2, 0.25, 0.95, '#4c3a8a', { solid: true }),
    B(5.5, 2.5, 1.0, 0.7, 0.35, WOOD, { solid: true }),

    // coffee station
    B(-5.8, -4.4, 2.0, 0.7, 1.0, METAL, { solid: true }),
    B(-5.8, -4.45, 0.45, 0.4, 0.42, '#c9ccd8', { y: 1.0 }),
    B(-5.2, -4.4, 0.18, 0.18, 0.2, glow(city.a), { y: 1.0 }),

    // server rack
    B(6.3, -4.2, 0.9, 0.9, 2.1, '#15152b', { solid: true }),
    B(6.3, -3.73, 0.7, 0.03, 0.08, glow(city.b), { y: 1.7 }),
    B(6.3, -3.73, 0.7, 0.03, 0.08, glow(city.a), { y: 1.4 }),
    B(6.3, -3.73, 0.7, 0.03, 0.08, glow('#4ade80'), { y: 1.1 }),

    // plants
    C(6.4, 4.2, 0.3, 0.45, '#b4673c', { solid: true }),
    S(6.4, 1.1, 4.2, 0.55, 'leaves'),
    C(-6.4, 4.2, 0.3, 0.45, '#b4673c', { solid: true }),
    S(-6.4, 1.1, 4.2, 0.55, 'leaves'),
  ];

  return {
    room,
    props,
    bounds: { minX: -7, maxX: 7, minZ: -5, maxZ: 5 },
    spawns: { default: { x: 0, z: 2.2, yaw: PI, camYaw: 0 } },
    interactables: [
      { id: 'off-door', x: 0, z: 4.0, r: 1.3, label: 'Exit to the city', kind: 'portal', to: 'city', spawn: 'office', markerY: 2.9 },
      { id: 'off-board', x: 0, z: -3.6, r: 2.2, label: 'Roadmap board', kind: 'info', markerY: 2.9 },
      { id: 'off-desk', x: -3.0, z: 0.4, r: 1.6, label: 'Your workstation', kind: 'info' },
      { id: 'off-meeting', x: 4.1, z: 0.9, r: 1.6, label: 'Decision room', kind: 'info' },
      { id: 'off-coffee', x: -5.0, z: -3.3, r: 1.5, label: 'Coffee machine', kind: 'info' },
      { id: 'off-rack', x: 5.6, z: -3.2, r: 1.4, label: 'Server rack', kind: 'info', markerY: 2.6 },
    ],
    lights: [
      { x: 0, y: 3.1, z: -1, color: '#fff4e0', day: 22, night: 10, dist: 18 },
      { x: -4, y: 3.1, z: 2, color: '#fff4e0', day: 10, night: 5, dist: 12 },
      { x: 0, y: 2.0, z: -4.2, color: '#dbe4ff', day: 8, night: 6, dist: 8 },
    ],
    cam: { dist: 12, min: 7, max: 18, pitch: 0.85, minPitch: 0.45, maxPitch: 1.3 },
  };
}

// --- café ----------------------------------------------------------------------------------
function buildCafe(o) {
  const room = { w: 10, d: 8, h: 3.2 };
  const city = CITY_THEMES[o.cityTheme] || CITY_THEMES['neon-city'];
  const wallC = '#e6cfae';
  const table = (x, z) => [
    C(x, z, 0.55, 0.06, '#f3f0ff', { y: 0.72, solid: true }),
    C(x, z, 0.06, 0.72, METAL),
    C(x, z, 0.3, 0.03, METAL),
    S(x, 2.35, z, 0.22, 'lamp'),
    C(x, z, 0.012, 0.85, METAL, { y: 2.4 }),
  ];
  const stool = (x, z) => [C(x, z, 0.24, 0.07, '#c0392b', { y: 0.45 }), C(x, z, 0.04, 0.45, METAL)];

  const props = [
    B(0, 0, room.w, room.d, 0.1, '#7b5a3c', { y: -0.1 }),
    B(0.4, 0.8, 6, 4.2, 0.02, '#8c3b3b'),
    ...wall(room, 'back', wallC),
    ...wall(room, 'left', wallC),
    ...wall(room, 'right', wallC, { from: -2, to: 2, y0: 0.7, y1: 2.6 }),
    ...wall(room, 'front', wallC, FRONT_DOOR),
    ...skylineBehind('right', room, 37, city.a),
    ...doorOnFront(room, '#fbbf24'),

    // counter, espresso machine, pastry case
    B(0, -2.8, 6.0, 0.9, 1.05, WOOD_DARK, { solid: true }),
    B(0, -2.8, 6.2, 1.1, 0.08, METAL, { y: 1.05 }),
    B(-1.6, -2.85, 0.9, 0.5, 0.55, '#c9ccd8', { y: 1.13 }),
    B(-1.6, -2.58, 0.7, 0.04, 0.06, glow('#fbbf24'), { y: 1.5 }),
    B(1.4, -2.8, 1.8, 0.55, 0.5, 'glass', { y: 1.13 }),
    B(1.4, -2.8, 1.6, 0.4, 0.12, '#e8b27a', { y: 1.15 }),
    B(2.5, -2.8, 0.5, 0.5, 0.35, '#c9ccd8', { y: 1.13 }),
    ...[-2.0, 0, 2.0].flatMap((x) => stool(x, -1.9)),

    // menu board on the back wall
    B(0, -3.92, 4.2, 0.06, 1.05, '#14142a', { y: 1.85 }),
    ...[0, 1, 2, 3].map((i) => {
      const w = 2.6 - i * 0.35;
      return B(-1.8 + w / 2, -3.88, w, 0.02, 0.05, glow(i % 2 ? city.a : city.b, [0.9, 1.5]), { y: 2.65 - i * 0.2 });
    }),

    // tables and chairs
    ...table(-3.0, 0.2),
    ...stool(-3.85, 0.2),
    ...stool(-2.15, 0.2),
    ...table(-3.0, 2.6),
    ...stool(-3.85, 2.6),
    ...stool(-2.15, 2.6),
    ...table(2.6, 1.7),
    ...stool(1.75, 1.7),
    ...stool(3.45, 1.7),

    // plants and a warm neon sign
    C(4.4, 3.2, 0.3, 0.45, '#b4673c', { solid: true }),
    S(4.4, 1.1, 3.2, 0.55, 'leaves'),
    C(-4.4, -3.3, 0.3, 0.45, '#b4673c', { solid: true }),
    S(-4.4, 1.1, -3.3, 0.55, 'leaves'),
    B(-4.95, 0.5, 0.05, 1.8, 0.55, glow(city.a), { y: 1.9 }),
  ];

  return {
    room,
    props,
    bounds: { minX: -5, maxX: 5, minZ: -4, maxZ: 4 },
    spawns: { default: { x: 0, z: 1.4, yaw: PI, camYaw: 0 } },
    interactables: [
      { id: 'cafe-door', x: 0, z: 3.0, r: 1.3, label: 'Exit to the city', kind: 'portal', to: 'city', spawn: 'cafe', markerY: 2.9 },
      { id: 'cafe-counter', x: 0, z: -1.5, r: 1.5, label: 'Order at the counter', kind: 'info' },
      { id: 'cafe-table', x: 2.6, z: 0.6, r: 1.3, label: 'Planning table', kind: 'info' },
      { id: 'cafe-window', x: 4.1, z: -0.2, r: 1.2, label: 'Street view', kind: 'info', markerY: 2.2 },
    ],
    lights: [
      { x: -3.1, y: 2.3, z: 1.5, color: '#ffcf86', day: 4, night: 12, dist: 8 },
      { x: 2.6, y: 2.3, z: 1.7, color: '#ffcf86', day: 4, night: 12, dist: 8 },
      { x: 0, y: 2.9, z: -2.4, color: '#fff4e0', day: 12, night: 6, dist: 12 },
    ],
    cam: { dist: 9.5, min: 6, max: 15, pitch: 0.85, minPitch: 0.45, maxPitch: 1.3 },
  };
}

// --- city (with the park) ------------------------------------------------------------------
function buildCity(o) {
  const { a, b } = CITY_THEMES[o.cityTheme] || CITY_THEMES['neon-city'];
  const rand = mulberry32(7);
  const props = [
    B(0, 0, 120, 120, 0.1, 'ground', { y: -0.1 }),
    B(0, 0, 40, 4, 0.03, 'road'),
    B(0, 0, 4, 40, 0.04, 'road'),
    B(0, 0, 36, 0.1, 0.02, glow(b), { y: 0.05 }),
    B(0, 0, 0.1, 36, 0.02, glow(a), { y: 0.055 }),
    B(-9.5, -9.5, 15, 15, 0.02, 'sidewalk'),
    B(9.5, -9.5, 15, 15, 0.02, 'sidewalk'),
    B(9.5, 9.5, 15, 15, 0.02, 'sidewalk'),
    B(-9.5, 9.5, 15, 15, 0.02, 'grass'),
  ];

  const windows = (cx, faceZ, dir, w, h, cols, startY) => {
    const out = [];
    const rows = Math.max(1, Math.floor((h - startY - 0.6) / 1.5));
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = cx - w / 2 + ((c + 0.5) / cols) * w;
        out.push(B(x, faceZ + dir * 0.03, (w / cols) * 0.55, 0.04, 0.85, 'window', { y: startY + r * 1.5 }));
      }
    }
    return out;
  };

  // Apartment tower (north-west) - door on its south face
  props.push(
    B(-9, -10, 7, 6, 10, 'bldA', { solid: true }),
    B(-9, -10, 7.12, 6.12, 0.14, glow(a), { y: 10 }),
    B(-9, -6.96, 1.9, 0.1, 2.5, glow(a, [1.2, 2.4])),
    B(-9, -6.94, 1.5, 0.1, 2.2, '#150f2e'),
    C(-9, -5.7, 0.8, 0.02, glow(a, [0.8, 1.8]), { y: 0.05 }),
    ...windows(-9, -7, 1, 7, 10, 4, 3.4)
  );

  // Office tower (north-east)
  props.push(
    B(9, -10, 7, 6, 14, 'bldC', { solid: true }),
    B(9, -10, 4, 3.4, 2.6, 'bldB', { y: 14 }),
    B(9, -10, 4.1, 3.5, 0.14, glow(b), { y: 16.6 }),
    B(9, -10, 7.12, 6.12, 0.14, glow(b), { y: 14 }),
    B(9, -6.96, 1.9, 0.1, 2.5, glow(b, [1.2, 2.4])),
    B(9, -6.94, 1.5, 0.1, 2.2, '#150f2e'),
    C(9, -5.7, 0.8, 0.02, glow(b, [0.8, 1.8]), { y: 0.05 }),
    ...windows(9, -7, 1, 7, 14, 5, 3.4)
  );

  // Café (south-east) - door on its north face
  props.push(
    B(9, 10, 7, 5, 3.6, 'bldD', { solid: true }),
    B(9, 10, 7.12, 5.12, 0.12, glow('#fbbf24'), { y: 3.6 }),
    B(9, 7.46, 1.7, 0.1, 2.3, glow('#fbbf24', [1.1, 2.2])),
    B(9, 7.44, 1.4, 0.1, 2.1, '#150f2e'),
    B(9, 6.95, 4.4, 1.1, 0.12, glow(a, [1, 2]), { y: 2.75 }),
    B(6.4, 7.47, 1.5, 0.04, 1.3, 'window', { y: 0.9 }),
    B(11.6, 7.47, 1.5, 0.04, 1.3, 'window', { y: 0.9 }),
    C(9, 6.35, 0.8, 0.02, glow('#fbbf24', [0.8, 1.8]), { y: 0.05 })
  );

  // Park (south-west): path, pond, trees, benches
  props.push(
    B(-9.5, 5.6, 1.4, 7.2, 0.025, 'sidewalk'),
    C(-9.5, 10.5, 2.4, 0.03, 'water', { solid: true }),
    B(-9.5, 14.8, 1.8, 0.5, 0.5, WOOD, { solid: true }),
    B(-9.5, 15.12, 1.8, 0.1, 0.55, WOOD, { y: 0.5 }),
    B(-13.3, 10.5, 0.5, 1.8, 0.5, WOOD, { solid: true }),
    B(-13.62, 10.5, 0.1, 1.8, 0.55, WOOD, { y: 0.5 })
  );
  [
    [-15, 5.8],
    [-13, 14.2],
    [-5.8, 13.8],
    [-6, 6.2],
    [-15.3, 9.2],
    [-6.4, 16],
    [-15, 15.8],
    [-4.8, 10],
  ].forEach(([x, z], i) => {
    const s = 0.9 + (i % 3) * 0.12;
    props.push(
      C(x, z, 0.18, 1.7 * s, 'trunk', { solid: true }),
      S(x, 2.3 * s, z, 1.15 * s, 'leaves'),
      S(x, 3.1 * s, z, 0.8 * s, 'leaves')
    );
  });

  // Lamp posts
  [
    [-2.8, -2.8],
    [2.8, -2.8],
    [2.8, 2.8],
    [-2.8, 2.8],
    [-14, -5],
    [14, -5],
    [14, 5],
    [-14, 5],
  ].forEach(([x, z]) => {
    props.push(C(x, z, 0.07, 2.8, METAL, { solid: true }), S(x, 2.95, z, 0.2, 'lamp'));
  });

  // Smaller buildings that fill the blocks
  [
    [-15, -10, 3, 5, 6],
    [-9, -15.4, 5, 2.4, 5],
    [15.2, -10, 3, 5, 8],
    [9, -15.4, 5, 2.4, 7],
    [15.2, 10, 3, 4, 4],
    [9, 15.6, 5, 2.2, 3.4],
    [5.5, -5.2, 1.5, 1.5, 2.4],
    [-5.5, -5.2, 1.5, 1.5, 2.4],
  ].forEach(([x, z, w, d, h], i) => {
    props.push(
      B(x, z, w, d, h, ['bldA', 'bldB', 'bldC', 'bldD'][i % 4], { solid: true }),
      B(x, z, w + 0.1, d + 0.1, 0.1, glow(i % 2 ? a : b, [1, 2]), { y: h })
    );
  });

  // Distant skyline beyond the walkable area (decoration only)
  for (let x = -36; x <= 36; x += 6) {
    for (let z = -36; z <= 36; z += 6) {
      if (Math.max(Math.abs(x), Math.abs(z)) < 21) continue;
      const w = 3 + rand() * 2;
      const d = 3 + rand() * 2;
      const h = 6 + rand() * 18;
      const px = x + (rand() - 0.5) * 2;
      const pz = z + (rand() - 0.5) * 2;
      const toward = Math.abs(pz) >= Math.abs(px) ? Math.sign(-pz) : 0;
      props.push(B(px, pz, w, d, h, ['bldA', 'bldB', 'bldC', 'bldD'][Math.floor(rand() * 4)]));
      if (rand() < 0.45) props.push(B(px, pz, w + 0.1, d + 0.1, 0.12, glow(rand() < 0.5 ? a : b), { y: h }));
      if (toward) props.push(B(px, pz + toward * (d / 2 + 0.02), w * 0.7, 0.04, h * 0.6, 'window', { y: h * 0.2 }));
    }
  }

  return {
    props,
    bounds: { minX: -17, maxX: 17, minZ: -17, maxZ: 17 },
    spawns: {
      default: { x: 0, z: 5, yaw: PI, camYaw: 0 },
      apartment: { x: -9, z: -4.0, yaw: 0, camYaw: 0 },
      office: { x: 9, z: -4.0, yaw: 0, camYaw: 0 },
      cafe: { x: 9, z: 4.6, yaw: PI, camYaw: 0 },
    },
    interactables: [
      { id: 'door-apartment', x: -9, z: -5.7, r: 1.5, label: 'Enter your apartment', kind: 'portal', to: 'apartment', spawn: 'default', markerY: 3.2 },
      { id: 'door-office', x: 9, z: -5.7, r: 1.5, label: 'Enter the office', kind: 'portal', to: 'office', spawn: 'default', markerY: 3.2 },
      { id: 'door-cafe', x: 9, z: 6.35, r: 1.5, label: 'Enter the café', kind: 'portal', to: 'cafe', spawn: 'default', markerY: 3.2 },
      { id: 'park-pond', x: -9.5, z: 7.3, r: 1.8, label: 'Sunset pond', kind: 'info' },
      { id: 'park-bench', x: -9.5, z: 13.7, r: 1.6, label: 'Park bench', kind: 'info' },
    ],
    zones: [
      { name: 'Sunset Park', minX: -17, maxX: -2, minZ: 2, maxZ: 17 },
      { name: 'Dream Café corner', minX: 2, maxX: 17, minZ: 2, maxZ: 17 },
      { name: 'Innovation District', minX: 2, maxX: 17, minZ: -17, maxZ: -2 },
      { name: 'Skyline Residences', minX: -17, maxX: -2, minZ: -17, maxZ: -2 },
    ],
    zoneFallback: 'Main Avenue',
    lights: [],
    cam: { dist: 8, min: 4.5, max: 14, pitch: 0.5, minPitch: 0.15, maxPitch: 1.1 },
  };
}

const BUILDERS = { city: buildCity, apartment: buildApartment, office: buildOffice, cafe: buildCafe };

/**
 * Builds one location. Options personalize it: roomTheme / cityTheme (from the dream's profile)
 * and milestones (an array of 0-100 progress values, drawn on the office whiteboard).
 */
export function buildLocation(id, options = {}) {
  const build = BUILDERS[id];
  if (!build) throw new Error(`Unknown location "${id}"`);
  const loc = build(options);
  return {
    id,
    name: LOCATION_NAMES[id],
    interior: id !== 'city',
    zones: [],
    zoneFallback: '',
    ...loc,
    colliders: collidersOf(loc.props),
  };
}
