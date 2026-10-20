export default function TextField({
  id,
  label,
  error,
  hint,
  textarea = false,
  className = '',
  ...props
}) {
  const Tag = textarea ? 'textarea' : 'input';
  const describedBy =
    [error && `${id}-error`, hint && !error && `${id}-hint`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <Tag
        id={id}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-neon-cyan focus:ring-2 focus:ring-neon-cyan/30 aria-[invalid=true]:border-neon-pink"
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-neon-pink">
          {error}
        </p>
      )}
    </div>
  );
}
