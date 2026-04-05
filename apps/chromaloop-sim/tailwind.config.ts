import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        nucleus: {
          950: '#030711',
          900: '#0a1128',
          800: '#0f1d3d',
          700: '#162955',
          600: '#1e3a6e',
        },
        chromatin: {
          cyan: '#00e5ff',
          magenta: '#ff00e5',
          green: '#39ff14',
          amber: '#ffab00',
          red: '#ff1744',
        },
        glass: {
          light: 'rgba(255,255,255,0.06)',
          medium: 'rgba(255,255,255,0.10)',
          heavy: 'rgba(255,255,255,0.16)',
        },
      },
      fontFamily: {
        display: ['"Space Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
