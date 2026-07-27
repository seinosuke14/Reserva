/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--lr-ink) / <alpha-value>)',
          50:  '#e8edf3',
          100: '#c5d0dd',
          200: '#9fb0c4',
          300: '#7690ab',
          400: '#517192',
          500: '#3a5878',
          600: '#2a4160',
          700: '#1d2e47',
          800: '#131f30',
          900: '#0D1B2A',
        },
        // Los tonos clave leen las variables CSS de src/styles.scss (fuente única).
        accent: {
          DEFAULT: 'rgb(var(--lr-accent) / <alpha-value>)',
          50:  'rgb(var(--lr-accent-soft) / <alpha-value>)',
          100: '#fbd9cb',
          200: '#f8bfa8',
          300: '#f49c7c',
          400: '#f2794f',
          500: 'rgb(var(--lr-accent) / <alpha-value>)',
          600: 'rgb(var(--lr-accent-strong) / <alpha-value>)',
          700: '#b23f14',
          800: '#8a3010',
          900: '#6b240c',
        },
        label: {
          DEFAULT: '#E8943A',
          50:  '#fef4e8',
          100: '#fce4c3',
          200: '#f9d09a',
          300: '#f5bc71',
          400: '#f0a848',
          500: '#E8943A',
          600: '#c87a28',
          700: '#a5601e',
          800: '#824814',
          900: '#60310a',
        },
        background: 'rgb(var(--lr-canvas) / <alpha-value>)',
        surface: '#ffffff',
        border: 'rgb(var(--lr-border) / <alpha-value>)',
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Fraunces', 'Georgia', 'serif'],
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(10px)' }, '99%': { opacity: 1, transform: 'translateY(0)' }, '100%': { opacity: 1, transform: 'none' } },
        slideIn: { '0%': { opacity: 0, transform: 'translateX(10px)' }, '99%': { opacity: 1, transform: 'translateX(0)' }, '100%': { opacity: 1, transform: 'none' } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(16px)' }, '99%': { opacity: 1, transform: 'translateY(0)' }, '100%': { opacity: 1, transform: 'none' } },
        pulseDot: { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: .45, transform: 'scale(.75)' } },
      },
      animation: {
        'fade-in': 'fadeIn .15s ease',
        'fade-up': 'fadeUp .35s ease both',
        'slide-in': 'slideIn .2s ease both',
        'slide-up': 'slideUp .22s cubic-bezier(.34,1.56,.64,1) both',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      boxShadow: {
        'card': '0 1px 4px rgba(0,0,0,.04)',
        'card-hover': '0 8px 30px rgba(0,0,0,.09)',
      },
    },
  },
  plugins: [],
};
