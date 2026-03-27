/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tt: {
          green: '#4ade80',
          darkgreen: '#16a34a',
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
        },
      },
    },
    keyframes: {
      'slide-in': {
        from: { transform: 'translateX(100%)', opacity: '0' },
        to: { transform: 'translateX(0)', opacity: '1' },
      },
    },
    animation: {
      'slide-in': 'slide-in 0.3s ease-out',
    },
  },
  plugins: [],
};
