import { Component, Suspense, lazy, useMemo } from 'react';
import { hasWebGL } from '../../utils/webgl.js';

const CityScene = lazy(() => import('./CityScene.jsx'));

class SceneBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error('3D scene failed to render:', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Placeholder({ text }) {
  return (
    <div
      className="grid h-full w-full place-items-center text-center"
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, rgba(168,85,247,0.35), transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(34,211,238,0.25), transparent 55%)',
      }}
    >
      <p className="px-6 font-display text-xs tracking-widest text-neon-cyan">{text}</p>
    </div>
  );
}

// Lazy-loads the 3D city, with graceful fallbacks if WebGL is missing or the scene errors.
export default function SceneFrame({ interactive = false, className = '' }) {
  const supported = useMemo(() => hasWebGL(), []);
  const fallback = <Placeholder text="3D PREVIEW UNAVAILABLE ON THIS DEVICE" />;

  return (
    <div className={className}>
      {supported ? (
        <SceneBoundary fallback={fallback}>
          <Suspense fallback={<Placeholder text="BUILDING THE CITY…" />}>
            <CityScene interactive={interactive} />
          </Suspense>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
