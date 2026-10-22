/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}",
  ],
  theme: {
    extend: {
      colors: {
        primola: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          // Brand Colors estratti dal sito ufficiale primola.it
          blue: {
            DEFAULT: '#3857F1',
            light: '#5671F4',
            dark: '#2640C4',
          },
          red: {
            DEFAULT: '#CD1E14',
            light: '#E53935',
            dark: '#B71C1C',
          },
          dark: '#23282D',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'Outfit', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
