import { motion } from 'framer-motion';

export default function GlassCard({ as = 'section', className = '', children, delay = 0, ...rest }) {
  const Comp = motion[as] || motion.section;
  return (
    <Comp
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className={`glass p-5 ${className}`}
      {...rest}
    >
      {children}
    </Comp>
  );
}
