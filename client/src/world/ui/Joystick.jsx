import { useEffect, useRef } from 'react';

const RADIUS = 44;
const DEAD_ZONE = 0.18;

// On-screen thumb stick for touch devices. Writes straight into the shared input object.
export default function Joystick({ input }) {
  const base = useRef(null);
  const knob = useRef(null);
  const activeId = useRef(null);

  const reset = () => {
    activeId.current = null;
    input.joy.x = 0;
    input.joy.y = 0;
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)';
  };

  useEffect(() => () => reset(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (e) => {
    const rect = base.current.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / RADIUS;
    const ny = -dy / RADIUS;
    const mag = Math.hypot(nx, ny);
    input.joy.x = mag < DEAD_ZONE ? 0 : nx;
    input.joy.y = mag < DEAD_ZONE ? 0 : ny;
  };

  return (
    <div
      ref={base}
      role="group"
      aria-label="Movement stick. Drag to walk."
      className="pointer-events-auto relative h-32 w-32 touch-none select-none rounded-full border border-white/25 bg-midnight-900/50 backdrop-blur"
      onPointerDown={(e) => {
        if (activeId.current !== null) return;
        activeId.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (e.pointerId === activeId.current) update(e);
      }}
      onPointerUp={(e) => {
        if (e.pointerId === activeId.current) reset();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId === activeId.current) reset();
      }}
    >
      <div
        ref={knob}
        className="absolute inset-0 m-auto h-14 w-14 rounded-full border border-neon-purple/70 bg-neon-purple/50 shadow-neon-purple"
      />
    </div>
  );
}
