/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: '#05050f',
          900: '#080819',
          800: '#0d0d26',
          700: '#14143a',
        },
        neon: {
          purple: '#a855f7',
          violet: '#7c3aed',
          cyan: '#22d3ee',
          pink: '#f472b6',
          magenta: '#e879f9',
        },
      },
      fontFamily: {
        display: ['"Orbitron"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-purple': '0 0 24px rgba(168, 85, 247, 0.45)',
        'neon-cyan': '0 0 24px rgba(34, 211, 238, 0.4)',
        'neon-pink': '0 0 24px rgba(244, 114, 182, 0.4)',
      },
      backgroundImage: {
        'dream-gradient':
          'linear-gradient(135deg, #7c3aed 0%, #a855f7 45%, #f472b6 100%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
      },
    },
  },
  plugins: [],
};
