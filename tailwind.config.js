/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy (portal público + features aún no migrados)
        primary:    '#1e3a8a',
        secondary:  '#374151',
        accent:     '#3b82f6',
        background: '#f3f4f6',

        // Paleta Agendual
        gold: {
          DEFAULT: '#db9648',
          50:  '#fdf7ee',
          100: '#fbecd5',
          200: '#f6d6a4',
          300: '#efb872',
          400: '#e7a14f',
          500: '#db9648',
          600: '#c47b34',
          700: '#a35e2b',
          800: '#854a28',
          900: '#6d3e25',
        },
        ink: {
          DEFAULT: '#0f172a',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        surface: '#ffffff',
        canvas:  '#f8fafc',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        fadeUp:   { '0%': { opacity: 0, transform: 'translateY(10px)' }, '99%': { opacity: 1, transform: 'translateY(0)' }, '100%': { opacity: 1, transform: 'none' } },
        slideIn:  { '0%': { opacity: 0, transform: 'translateX(10px)' }, '99%': { opacity: 1, transform: 'translateX(0)' }, '100%': { opacity: 1, transform: 'none' } },
        slideUp:  { '0%': { opacity: 0, transform: 'translateY(16px)' }, '99%': { opacity: 1, transform: 'translateY(0)' }, '100%': { opacity: 1, transform: 'none' } },
        pulseDot: { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: .45, transform: 'scale(.75)' } },
      },
      animation: {
        'fade-in':   'fadeIn .15s ease',
        'fade-up':   'fadeUp .35s ease both',
        'slide-in':  'slideIn .2s ease both',
        'slide-up':  'slideUp .22s cubic-bezier(.34,1.56,.64,1) both',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      boxShadow: {
        'card':       '0 1px 4px rgba(0,0,0,.04)',
        'card-hover': '0 8px 30px rgba(0,0,0,.09)',
      },
    },
  },
  plugins: [],
};
