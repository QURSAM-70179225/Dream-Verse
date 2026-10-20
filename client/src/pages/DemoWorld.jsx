import { Link } from 'react-router-dom';
import SceneFrame from '../components/three/SceneFrame.jsx';

export default function DemoWorld() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-xs tracking-[0.3em] text-neon-cyan">DEMO WORLD · PREVIEW</p>
          <h1 className="neon-text text-3xl font-extrabold sm:text-4xl">Neon City</h1>
          <p className="mt-2 max-w-xl text-slate-300">
            Drag to orbit, scroll or pinch to zoom. This is a fly-around preview of the starter city.
            Create an account (or explore with sample data) to walk an avatar through the city and step
            into the apartment, office, café and park.
          </p>
        </div>
        <Link to="/register" className="btn-primary">
          Create your own world
        </Link>
      </div>

      <div className="glass h-[62vh] min-h-[360px] overflow-hidden shadow-neon-purple">
        <SceneFrame interactive className="h-full w-full" />
      </div>
    </section>
  );
}
