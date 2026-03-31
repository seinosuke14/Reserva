/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e3a8a',
        secondary: '#374151',
        accent: '#3b82f6',
        background: '#f3f4f6',
      },
    },
  },
  plugins: [],
};