import { useEffect } from 'react';

// Shared, mutable input state read every frame by the player controller. It lives outside React
// state on purpose: keys, the joystick and camera drags change many times per second and must
// not trigger re-renders.
export function createInput() {
  return {
    keys: new Set(), // 'forward' | 'back' | 'left' | 'right' | 'run' | 'camLeft' | 'camRight'
    joy: { x: 0, y: 0 }, // virtual stick: x right+, y forward+
    look: { yaw: 0, pitch: 0.5, dist: 8 },
    interact: false,
    enabled: true,
  };
}

const KEY_MAP = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  KeyQ: 'camLeft',
  KeyR: 'camRight',
};

function isTyping(target) {
  const tag = target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
}

/** Keyboard controls: WASD / arrows move, Shift runs, Q and R turn the camera, E (or F) interacts. */
export function useKeyboardControls(input) {
  useEffect(() => {
    const down = (e) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.code === 'KeyE' || e.code === 'KeyF') && !e.repeat) {
        input.interact = true;
        return;
      }
      const action = KEY_MAP[e.code];
      if (!action) return;
      if (action !== 'run') e.preventDefault();
      input.keys.add(action);
    };
    const up = (e) => {
      const action = KEY_MAP[e.code];
      if (action) input.keys.delete(action);
    };
    const reset = () => input.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);
      input.keys.clear();
    };
  }, [input]);
}

/**
 * Drag anywhere on the 3D view to turn the camera (mouse, pen or touch), scroll to zoom.
 * `limits` supplies the current location's pitch and distance ranges.
 */
export function useLookControls(ref, input, limitsRef) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let activeId = null;
    let lastX = 0;
    let lastY = 0;

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const onDown = (e) => {
      if (activeId !== null) return;
      activeId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
    };
    const onMove = (e) => {
      if (e.pointerId !== activeId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const lim = limitsRef.current;
      input.look.yaw -= dx * 0.0055;
      input.look.pitch = clamp(input.look.pitch + dy * 0.0045, lim.minPitch, lim.maxPitch);
    };
    const onUp = (e) => {
      if (e.pointerId !== activeId) return;
      activeId = null;
    };
    const onWheel = (e) => {
      e.preventDefault();
      const lim = limitsRef.current;
      input.look.dist = clamp(input.look.dist + Math.sign(e.deltaY) * 0.8, lim.min, lim.max);
    };
    const onContext = (e) => e.preventDefault();

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', onContext);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('contextmenu', onContext);
    };
  }, [ref, input, limitsRef]);
}
