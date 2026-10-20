import { motion } from 'framer-motion';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <section className="grid min-h-[75vh] place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass w-full max-w-md p-8 shadow-neon-purple"
      >
        <h1 className="neon-text text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>
      </motion.div>
    </section>
  );
}
