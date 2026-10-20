import { createContext, useContext } from 'react';

// Shared by everything rendered inside the <Canvas>:
//   nightRef - { current: 0..1 } how dark it is (0 day, 1 night), updated every frame
//   cache    - MaterialCache; the day/night-aware materials are updated from one place
//   shadows  - whether real-time shadows are enabled (off on small screens for performance)
//   reduced  - the user prefers reduced motion
export const WorldContext = createContext(null);

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error('useWorld must be used inside the world canvas');
  return ctx;
}
