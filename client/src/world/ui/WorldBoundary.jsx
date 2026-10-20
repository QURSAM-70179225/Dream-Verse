import { Component } from 'react';
import { Link } from 'react-router-dom';

export function WorldUnavailable({ reason }) {
  return (
    <div className="grid h-full w-full place-items-center p-6">
      <div className="glass max-w-md p-8 text-center">
        <h1 className="neon-text text-2xl">The 3D world can&apos;t start here</h1>
        <p className="mt-3 text-slate-300">{reason}</p>
        <p className="mt-2 text-sm text-slate-400">
          Your dashboard, roadmap and progress work without it. Try another browser or device for the walkable world.
        </p>
        <Link to="/dashboard" className="btn-primary mt-6">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

// Catches a crash inside the 3D canvas (for example a lost WebGL context) without taking the whole app down.
export default class WorldBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error('3D world failed:', error);
  }

  render() {
    if (this.state.failed) {
      return <WorldUnavailable reason="Something went wrong while drawing the world, or the graphics context was lost." />;
    }
    return this.props.children;
  }
}
