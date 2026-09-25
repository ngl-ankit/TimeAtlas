import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#04050a',
        abyss: '#080a12',
        panel: '#0c0e18',
        surface: '#11141f',
        edge: '#1b2030',
        edgebright: '#2a3247',
        ink: '#e6ecf5',
        dim: '#9aa3b8',
        faint: '#5a6478',
        cyan: { glow: '#22d3ee' },
        violet: { glow: '#8b5cf6' },
        magenta: { glow: '#e879f9' },
        amber: { glow: '#fbbf24' },
        era: {
          ancient: '#d4a24e',
          medieval: '#c0563e',
          renaissance: '#38bdf8',
          industrial: '#a3a3a3',
          modern: '#4ade80',
          digital: '#22d3ee',
        },
        cat: {
          science: '#38bdf8',
          technology: '#22d3ee',
          space: '#8b5cf6',
          computing: '#e879f9',
          world: '#fbbf24',
          culture: '#f472b6',
          gaming: '#4ade80',
          discovery: '#2dd4bf',
          invention: '#fb923c',
          event: '#f87171',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 8px 40px -12px rgba(0,0,0,0.8)',
        glowCyan: '0 0 24px -4px rgba(34,211,238,0.45)',
        glowViolet: '0 0 24px -4px rgba(139,92,246,0.45)',
        node: '0 0 0 1px rgba(34,211,238,0.4), 0 0 16px rgba(34,211,238,0.35)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(139,92,246,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.07) 1px, transparent 1px)',
        aurora:
          'radial-gradient(ellipse 80% 50% at 20% -10%, rgba(139,92,246,0.18), transparent), radial-gradient(ellipse 60% 40% at 80% 0%, rgba(34,211,238,0.12), transparent)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow': 'spin 14s linear infinite',
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        'drift-up': 'driftUp 24s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
        driftUp: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-110vh)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
