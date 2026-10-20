import ProgressBar from '../ui/ProgressBar.jsx';

export default function RoadmapList({ items }) {
  return (
    <ol className="space-y-4">
      {items.map((m, i) => (
        <li key={m.id}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-100">
              <span className="mr-2 text-slate-500">{i + 1}.</span>
              {m.title}
            </span>
            <span className="tabular-nums text-slate-400">{m.progress}%</span>
          </div>
          <ProgressBar
            value={m.progress}
            color={m.progress === 100 ? 'green' : 'cyan'}
            label={`${m.title} progress`}
          />
        </li>
      ))}
    </ol>
  );
}
