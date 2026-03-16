/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Space Mono"', 'monospace'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        ink:    '#080d1a',
        panel:  '#0e1525',
        edge:   '#1a2235',
        soft:   '#2a3550',
        dim:    '#4a5878',
        muted:  '#8896b0',
        light:  '#c8d4e8',
        snow:   '#eef2f8',
        accent: '#5b6ef5',
        glow:   '#7c8dff',
        ok:     '#34d399',
        warn:   '#fbbf24',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        countPop: {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
        scanline: {
          from: { backgroundPosition: '0 0' },
          to:   { backgroundPosition: '0 100%' },
        },
      },
      animation: {
        fadeUp:   'fadeUp 0.4s ease both',
        countPop: 'countPop 0.3s ease',
        scanline: 'scanline 8s linear infinite',
      },
    },
  },
  plugins: [],
}
