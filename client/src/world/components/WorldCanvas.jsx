import { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Lighting from './Lighting.jsx';
import Markers from './Markers.jsx';
import Player from './Player.jsx';
import Props from './Props.jsx';
import { MaterialCache } from '../engine/materials.js';
import { WorldContext } from '../WorldContext.js';

/** The 3D view: one location at a time, the player, lights and interaction markers. */
export default function WorldCanvas({
  location,
  spawn,
  playerKey,
  look,
  input,
  timeMode,
  paused,
  mobile,
  reduced,
  onNear,
  onZone,
  onInteract,
}) {
  const nightRef = useRef(timeMode === 'night' ? 1 : 0);
  const cache = useMemo(() => new MaterialCache(), []);
  useEffect(() => () => cache.dispose(), [cache]);

  const shadows = !mobile;
  const ctx = useMemo(() => ({ nightRef, cache, shadows, reduced }), [cache, shadows, reduced]);

  return (
    <Canvas
      shadows={shadows}
      dpr={[1, mobile ? 1.25 : 1.75]}
      camera={{ fov: 50, near: 0.1, far: 160, position: [0, 8, 12] }}
      gl={{ antialias: !mobile, powerPreference: 'high-performance' }}
      style={{ touchAction: 'none' }}
    >
      <WorldContext.Provider value={ctx}>
        <Lighting interior={location.interior} timeMode={timeMode} lights={location.lights} />
        <Props items={location.props} />
        <Markers items={location.interactables} />
        <Player
          key={playerKey}
          location={location}
          spawn={spawn}
          look={look}
          input={input}
          paused={paused}
          onNear={onNear}
          onZone={onZone}
          onInteract={onInteract}
        />
      </WorldContext.Provider>
    </Canvas>
  );
}
